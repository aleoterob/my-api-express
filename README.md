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

## JWT Implementation

### Overview

This project implements JWT authentication using **httpOnly cookies** for enhanced security. Tokens are never exposed to client-side JavaScript, protecting against XSS attacks.

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

- **Configuration**: `src/config/constants.ts` - `TOKEN_EXPIRATION_MINUTES = 2`
- **Helpers**: `src/utils/auth.ts` - Converts minutes to required formats:
  - `getTokenExpirationString()`: Returns `"2m"` for JWT `expiresIn`
  - `getCookieMaxAge()`: Returns milliseconds for cookie `maxAge`

### Authentication Flow

1. **Login** (`POST /api/auth/login`):

   - User provides email and password
   - Credentials are validated against the database
   - JWT token is generated with `sub` (user ID) and `role` claims
   - Token is set as httpOnly cookie
   - User data is returned in response

2. **Protected Routes**:

   - Client makes request (cookie is automatically sent)
   - `authMiddleware` extracts and verifies token
   - If valid, `req.user` is populated and request proceeds
   - If invalid, 401 Unauthorized is returned

3. **Token Claims**:
   - `sub`: User ID (subject)
   - `role`: User role (e.g., 'user', 'admin')
   - `exp`: Expiration timestamp (automatically added by JWT)

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

- `POST /api/auth/login` - Login (returns httpOnly cookie with JWT)

### Users (Protected)

- `GET /api/user` - Get all users
- `GET /api/user/stats` - Get user statistics
- `GET /api/user/id/:id` - Get user by ID
- `GET /api/user/email/:email` - Get user by email
- `POST /api/user` - Create user
- `POST /api/user/register` - Register new user (public)
- `PUT /api/user/:id` - Update user
- `PATCH /api/user/:id` - Update user (partial)
- `DELETE /api/user/:id` - Delete user

## Security Features

- **httpOnly Cookies**: Prevents XSS attacks
- **Secure Cookies**: HTTPS-only in production
- **SameSite Strict**: CSRF protection
- **Password Hashing**: bcrypt with salt rounds
- **Token Expiration**: Configurable token lifetime
- **Type Safety**: TypeScript prevents common security issues

## License

ISC
