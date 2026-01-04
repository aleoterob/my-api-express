# Sistema de Refresh Tokens con Rotación Automática

## Resumen

Este proyecto implementa un sistema completo de autenticación con refresh tokens y rotación automática para mayor seguridad.

## Características Implementadas

### 1. **Tabla `refresh_tokens` en Base de Datos**

- ✅ Almacenamiento seguro con hash SHA-256
- ✅ Relación con `users` (FK con CASCADE)
- ✅ Auto-referencia para tracking de rotación (`replaced_by_token`)
- ✅ Campos de auditoría: `user_agent`, `ip_address`, `created_at`
- ✅ Control de estado: `revoked_at`, `expires_at`
- ✅ Índices optimizados: `user_id`, `token_hash` (único)

### 2. **Endpoints de Autenticación**

#### `POST /api/auth/login`

- Genera access token (15 minutos) + refresh token (7 días)
- Ambos tokens se envían como httpOnly cookies
- Almacena refresh token hasheado en BD con metadatos

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user"
    },
    "profile": { ... }
  }
}
```

**Cookies establecidas:**

- `access_token`: httpOnly, secure, sameSite=lax, maxAge=15min
- `refresh_token`: httpOnly, secure, sameSite=lax, maxAge=7días

#### `POST /api/auth/refresh`

- Valida el refresh token actual
- Genera nuevo par de tokens (access + refresh)
- **Rotación automática**: invalida el token anterior
- Detecta reuso de tokens revocados → revoca todos los tokens del usuario

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { ... },
    "profile": { ... }
  }
}
```

#### `POST /api/auth/logout`

- Revoca el refresh token actual
- Limpia ambas cookies
- Token queda marcado con `revoked_at` en BD

**Response:**

```json
{
  "success": true,
  "message": "Logout exitoso"
}
```

### 3. **Seguridad Implementada**

#### Rotación Automática de Tokens

Cuando se usa `/refresh`:

1. Se valida el refresh token actual
2. Se genera un nuevo par (access + refresh)
3. El token anterior se marca como `revoked` y se vincula al nuevo via `replaced_by_token`
4. Esto crea un "árbol" de rotaciones para auditoría

#### Detección de Token Reuso

Si se intenta usar un token ya revocado:

1. El sistema detecta que `revoked_at` no es NULL
2. **Medida de seguridad**: revoca TODOS los tokens activos del usuario
3. Fuerza re-login completo
4. Esto protege contra ataques de token stealing

#### Almacenamiento Seguro

- Los tokens se hashean con SHA-256 antes de guardarlos
- Solo se compara el hash, nunca el token en texto plano
- Tokens generados con `crypto.randomBytes(32)`

#### Auditoría y Tracking

- `user_agent`: identifica el dispositivo/navegador
- `ip_address`: detecta cambios de ubicación
- `created_at`: timestamp de emisión
- `replaced_by_token`: tracking de cadena de rotación

### 4. **Configuración**

**Expiración de tokens** (`src/config/constants.ts`):

```typescript
export const TOKEN_EXPIRATION_MINUTES = 15; // Access token: 15 minutos
export const REFRESH_TOKEN_EXPIRATION_MINUTES = 10080; // Refresh token: 7 días
```

**Variables de entorno requeridas**:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
NODE_ENV=production|development
```

### 5. **Arquitectura**

```
Queries (DB)
  ↓
Repository (Data Layer)
  ↓
Service (Business Logic)
  ↓
Controller (HTTP Layer)
  ↓
Routes (API Endpoints)
```

**Archivos creados/modificados:**

- `src/db/schema/auth/refresh_tokens.ts` - Esquema Drizzle
- `src/db/queries/refresh-token.queries.ts` - Operaciones BD
- `src/db/relations.ts` - Relaciones Drizzle
- `src/modules/auth/auth.repository.ts` - Métodos repositorio
- `src/modules/auth/auth.service.ts` - Lógica de negocio
- `src/modules/auth/auth.controller.ts` - Controladores HTTP
- `src/modules/auth/auth.routes.ts` - Rutas API
- `src/config/errors.ts` - Mensajes de error
- `src/utils/auth.ts` - Utilidades de auth

### 6. **Flujo de Autenticación**

#### Login Inicial

```
Client → POST /login
  ↓
Valida credenciales
  ↓
Genera access_token (JWT)
Genera refresh_token (random)
  ↓
Guarda refresh_token hasheado en BD
  ↓
Envía ambos tokens como cookies
```

#### Renovación de Tokens

```
Client → POST /refresh (con refresh_token cookie)
  ↓
Busca token hasheado en BD
  ↓
¿Token válido y no revocado?
  ├─ NO → Error 401
  └─ SÍ ↓
     Genera nuevos tokens
     ↓
     Revoca token anterior (marca replaced_by)
     ↓
     Guarda nuevo refresh_token
     ↓
     Envía nuevos tokens
```

#### Logout

```
Client → POST /logout (con refresh_token cookie)
  ↓
Marca token como revoked_at = NOW()
  ↓
Limpia cookies
  ↓
Success
```

### 7. **Manejo de Errores**

Nuevos códigos de error:

- `AUTH_007` - Refresh token inválido
- `AUTH_008` - Refresh token expirado
- `AUTH_009` - Refresh token revocado (posible ataque)
- `AUTH_010` - Refresh token no encontrado

### 8. **Testing**

#### Probar Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt
```

#### Probar Refresh

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

#### Probar Logout

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt
```

### 9. **Migración Pendiente**

Después de ejecutar `npm run db:generate`, **agregar manualmente** en la migración generada:

```sql
-- Agregar FK self-reference para replaced_by_token
ALTER TABLE auth.refresh_tokens
ADD CONSTRAINT fk_replaced_by_token
FOREIGN KEY (replaced_by_token)
REFERENCES auth.refresh_tokens(id)
ON DELETE SET NULL;
```

Luego ejecutar:

```bash
npm run db:push
```

### 10. **Limpieza de Tokens Expirados**

Para limpiar tokens expirados automáticamente, puedes crear un cron job:

```typescript
import { cleanupExpiredTokens } from './db/queries/refresh-token.queries';

// Ejecutar diariamente
setInterval(async () => {
  await cleanupExpiredTokens();
  console.log('Tokens expirados eliminados');
}, 24 * 60 * 60 * 1000); // 24 horas
```

## Ventajas de esta Implementación

1. ✅ **Seguridad mejorada** - Rotación automática de tokens
2. ✅ **Detección de ataques** - Revocación en cascada al detectar reuso
3. ✅ **Auditoría completa** - Tracking de dispositivos, IPs y cadena de rotación
4. ✅ **Sin estado en JWT** - Access tokens cortos y stateless
5. ✅ **Escalable** - Refresh tokens en BD con índices optimizados
6. ✅ **UX mejorada** - Sesiones largas sin comprometer seguridad
