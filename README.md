# JWT API Express

A secure REST API built with Express.js and TypeScript, featuring JWT-based authentication and a centralized error handling system. This project demonstrates best practices for authentication, authorization, and error management in Node.js applications.

## Features

- **JWT Authentication**: Secure token-based authentication using httpOnly cookies
- **Centralized Error Handling**: Consistent error responses across the entire application
- **TypeScript**: Full type safety throughout the codebase
- **Drizzle ORM**: Type-safe database queries with PostgreSQL
- **Modular Architecture**: Clean separation of concerns (routes, controllers, services, repositories)

## Tech Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon)
- **ORM**: Drizzle ORM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Cookie Management**: cookie-parser

## Project Structure

```
src/
├── config/           # Configuration files (constants, error messages)
├── db/              # Database configuration, schemas, and queries
├── errors/          # Custom error classes
├── middleware/      # Express middleware (auth, error handling)
├── modules/         # Feature modules (auth, user)
├── types/           # TypeScript type definitions
└── utils/           # Utility functions (JWT, auth helpers, async handler)
```

## JWT Implementation with Refresh Token Rotation

### Overview

This project implements a robust JWT authentication system using **httpOnly cookies** with **automatic refresh token rotation** for enhanced security. The system uses two types of tokens:

- **Access Token**: Short-lived (15 minutes) JWT for API authentication
- **Refresh Token**: Long-lived (7 days) token for obtaining new access tokens

Tokens are never exposed to client-side JavaScript, protecting against XSS attacks. The refresh token rotation mechanism provides additional security by invalidating old tokens and detecting potential token theft.

### Key Components

#### 1. Token Generation (`src/utils/jwt.ts`)

The JWT utility provides centralized token management:

```typescript
// Generates a JWT token with user ID and role
generateToken({ sub: userId, role: userRole }): string

// Verifies and validates a JWT token
verifyToken(token: string): TokenPayload
```

**Features:**

- Automatic expiration management (configurable via `TOKEN_EXPIRATION_MINUTES`)
- Type-safe payload validation
- Environment variable validation for `JWT_SECRET`

#### 2. Authentication Middleware (`src/middleware/auth.middleware.ts`)

Protects routes by verifying JWT tokens from cookies:

```typescript
authMiddleware(req, res, next);
```

**How it works:**

1. Extracts `access_token` from httpOnly cookies
2. Verifies the token using `verifyToken()`
3. Attaches the decoded payload to `req.user`
4. Returns 401 if token is missing or invalid

#### 3. Cookie Configuration (`src/modules/auth/auth.controller.ts`)

When a user logs in, the JWT token is set as an httpOnly cookie:

```typescript
res.cookie('access_token', token, {
  httpOnly: true, // Not accessible via JavaScript (XSS protection)
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict', // CSRF protection
  maxAge: getCookieMaxAge(), // Synchronized with token expiration
});
```

**Security Benefits:**

- **httpOnly**: Prevents JavaScript access, protecting against XSS attacks
- **secure**: Ensures cookies are only sent over HTTPS in production
- **sameSite: 'strict'**: Prevents CSRF attacks by blocking cross-site requests
- **Synchronized expiration**: Cookie and token expire simultaneously

#### 4. Token Expiration Management

Token expiration is centrally managed:

- **Configuration**: `src/config/constants.ts`:
  - `TOKEN_EXPIRATION_MINUTES = 15` (access token)
  - `REFRESH_TOKEN_EXPIRATION_MINUTES = 10080` (refresh token - 7 days)
- **Helpers**: `src/utils/auth.ts` - Converts minutes to required formats:
  - `getTokenExpirationString()`: Returns `"15m"` for JWT `expiresIn`
  - `getCookieMaxAge()`: Returns milliseconds for cookie `maxAge`
  - `getRefreshTokenExpirationDate()`: Returns Date for refresh token expiration
  - `getRefreshTokenCookieMaxAge()`: Returns milliseconds for refresh cookie

### Refresh Token System

#### Database Schema

Refresh tokens are stored in a dedicated `refresh_tokens` table in the `auth` schema:

```sql
CREATE TABLE auth.refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  replaced_by_token UUID REFERENCES auth.refresh_tokens(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_agent VARCHAR(500),
  ip_address VARCHAR(45)
);

CREATE INDEX idx_refresh_tokens_user_id ON auth.refresh_tokens(user_id);
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON auth.refresh_tokens(token_hash);
```

**Key Features:**

- **Token Hashing**: Tokens are hashed (SHA-256) before storage for security
- **Rotation Tracking**: `replaced_by_token` creates an audit trail of token rotations
- **Revocation**: `revoked_at` tracks when a token is invalidated
- **Audit Fields**: `user_agent` and `ip_address` for security monitoring

#### Authentication Flow

1. **Login** (`POST /api/auth/login`):

   - User provides email and password
   - Credentials are validated against the database
   - **Access token** (JWT, 15 min) is generated with `sub` (user ID) and `role` claims
   - **Refresh token** (random 32 bytes, 7 days) is generated and hashed
   - Both tokens are set as httpOnly cookies
   - Refresh token is stored in database with metadata (user-agent, IP)
   - User data is returned in response

2. **Protected Routes**:

   - Client makes request (cookies are automatically sent)
   - `authMiddleware` extracts and verifies **access token**
   - If valid, `req.user` is populated and request proceeds
   - If invalid/expired, 401 Unauthorized is returned

3. **Token Refresh** (`POST /api/auth/refresh`) - **Automatic Rotation**:

   - Client sends expired access token + valid refresh token
   - Backend validates refresh token:
     - Checks if token exists and is not revoked
     - Validates expiration date
     - **Security Check**: If token was already used (revoked), revokes ALL user tokens
   - Generates NEW access token + NEW refresh token
   - **Rotation**: Old refresh token is marked as `revoked_at` and linked to new token via `replaced_by_token`
   - New tokens are sent as httpOnly cookies
   - Client continues seamlessly without re-login

4. **Logout** (`POST /api/auth/logout`):

   - Marks refresh token as revoked in database
   - Clears both cookies
   - Token remains in database for audit purposes

5. **Token Claims**:
   - `sub`: User ID (subject)
   - `role`: User role (e.g., 'user', 'admin')
   - `exp`: Expiration timestamp (automatically added by JWT)

#### Security Features

**1. Token Rotation**

Every time a refresh token is used, it's automatically replaced:

```
Old Token (revoked) → New Token (active)
                ↓
        replaced_by_token
```

This creates an audit trail and limits the window for token theft.

**2. Reuse Detection**

If a revoked token is used (potential theft), ALL user tokens are revoked:

```typescript
if (storedToken.revokedAt) {
  await revokeAllUserRefreshTokens(userId);
  throw new Error('Token reuse detected - all sessions revoked');
}
```

**3. Token Storage Security**

- Tokens are hashed (SHA-256) before database storage
- Only hash comparison, never plain text storage
- Random token generation using `crypto.randomBytes(32)`

**4. httpOnly Cookies**

Both tokens use httpOnly cookies:

```typescript
res.cookie('access_token', token, {
  httpOnly: true, // Not accessible via JavaScript
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  sameSite: 'lax', // CSRF protection
  maxAge: 15 * 60 * 1000, // 15 minutes
});

res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

### Usage Example

```typescript
// Protecting a route
router.get('/protected', authMiddleware, (req, res) => {
  // req.user is now available with { sub, role }
  res.json({ userId: req.user.sub, role: req.user.role });
});
```

## Centralized Error Handling System

### Overview

The application uses a centralized error handling system that ensures consistent error responses across all endpoints, eliminating scattered try/catch blocks and hardcoded error messages.

### Architecture

#### 1. Custom Error Class (`src/errors/AppError.ts`)

A custom error class that extends the native `Error` class:

```typescript
class AppError extends Error {
  statusCode: number; // HTTP status code
  code: string; // Application-specific error code
  isOperational: boolean; // Distinguishes operational errors from bugs
}
```

**Benefits:**

- Structured error information
- Easy to identify error types
- Consistent error format

#### 2. Centralized Error Messages (`src/config/errors.ts`)

All error messages and codes are defined in a single location:

```typescript
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Credenciales inválidas',
    MISSING_EMAIL_PASSWORD: 'Email y contraseña son requeridos',
    // ... more messages
  },
  USER: {
    NOT_FOUND: 'Usuario no encontrado',
    // ... more messages
  },
  // ... more categories
};

export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  USER_NOT_FOUND: 'USER_001',
  // ... more codes
};
```

**Benefits:**

- Single source of truth for error messages
- Easy to maintain and update
- Consistent error codes for client-side handling
- Easy to internationalize in the future

#### 3. Global Error Middleware (`src/middleware/error.middleware.ts`)

A global error handler that processes all errors:

```typescript
errorMiddleware(err, req, res, next);
```

**Behavior:**

- **AppError instances**: Returns structured error response with status code, message, and error code
- **Unexpected errors**: Returns generic 500 error, with stack trace only in development
- **Consistent format**: All errors follow the same response structure

**Response Format:**

```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

#### 4. Async Handler Utility (`src/utils/asyncHandler.ts`)

Wraps asynchronous route handlers to automatically catch errors:

```typescript
asyncHandler(async (req, res) => {
  // Your async code here
  // Any thrown error is automatically passed to error middleware
});
```

**Benefits:**

- Eliminates repetitive try/catch blocks
- Ensures all errors reach the error middleware
- Cleaner, more readable controller code

### Error Handling Flow

1. **Controller throws AppError**:

   ```typescript
   throw new AppError(
     ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
     401,
     ERROR_CODES.AUTH_INVALID_CREDENTIALS
   );
   ```

2. **AsyncHandler catches error**:

   - Automatically passes error to Express error middleware

3. **Error Middleware processes error**:

   - Checks if error is `AppError` instance
   - Returns structured JSON response
   - Logs unexpected errors

4. **Client receives consistent response**:
   ```json
   {
     "success": false,
     "error": {
       "message": "Credenciales inválidas",
       "code": "AUTH_001",
       "statusCode": 401
     }
   }
   ```

### Usage Example

```typescript
// Before (scattered error handling)
router.post('/login', async (req, res) => {
  try {
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    // ... more code
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// After (centralized error handling)
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    if (!email) {
      throw new AppError(
        ERROR_MESSAGES.AUTH.MISSING_EMAIL,
        400,
        ERROR_CODES.AUTH_MISSING_CREDENTIALS
      );
    }
    // ... rest of code - errors automatically handled
  })
);
```

### Benefits of Centralized Error Handling

1. **Consistency**: All errors follow the same format
2. **Maintainability**: Error messages in one place
3. **Type Safety**: TypeScript ensures correct error codes
4. **Developer Experience**: Less boilerplate, cleaner code
5. **Client Experience**: Predictable error responses
6. **Debugging**: Easier to track and fix issues
7. **Scalability**: Easy to add new error types

## Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secure_random_string
NODE_ENV=development
```

**JWT_SECRET**: Generate a secure random string (recommended: 64+ characters). You can use:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Installation

```bash
npm install
```

## Database Setup

```bash
# Push schema to database
npm run db:push

# Or generate migrations
npm run db:generate
npm run db:migrate
```

## Running the Application

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login (returns httpOnly cookies with access + refresh tokens)
- `POST /api/auth/refresh` - Refresh tokens (automatic rotation)
- `POST /api/auth/logout` - Logout (revokes refresh token)

### Users (Protected)

- `GET /api/user` - Get all users
- `GET /api/user/stats` - Get user statistics
- `GET /api/user/id/:id` - Get user by ID
- `GET /api/user/email/:email` - Get user by email
- `POST /api/user` - Create user
- `POST /api/user/register` - Register new user (public) -> Not protected
- `PUT /api/user/:id` - Update user
- `PATCH /api/user/:id` - Update user (partial)
- `DELETE /api/user/:id` - Delete user

## Security Features

- **httpOnly Cookies**: Prevents XSS attacks (tokens not accessible via JavaScript)
- **Secure Cookies**: HTTPS-only in production
- **SameSite Lax**: CSRF protection
- **Password Hashing**: bcrypt with salt rounds
- **Short-lived Access Tokens**: 15-minute expiration reduces attack window
- **Long-lived Refresh Tokens**: 7-day expiration for seamless user experience
- **Refresh Token Rotation**: Automatic rotation on every use
- **Token Reuse Detection**: Revokes all sessions if stolen token is detected
- **Token Hashing**: SHA-256 hashing before database storage
- **Audit Trail**: Tracks token rotations, user-agent, and IP addresses
- **Type Safety**: TypeScript prevents common security issues

## Documentation

For detailed information about the refresh token system:

- **Server Implementation**: See [REFRESH_TOKENS.md](./REFRESH_TOKENS.md) for complete server-side documentation
- **Client Integration**: See [jwt-api-express-client](../jwt-api-express-client) for frontend implementation

## License

ISC

## Author

**Alejandro Otero**  
Email: aleoterob@gmail.com
