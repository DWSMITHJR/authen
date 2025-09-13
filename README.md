# Authentication System

A secure, production-ready authentication system with email verification, social authentication (Google, Microsoft, Amazon, ID.me), and session management.

## Features

- 🔒 **Email/Password Authentication** with secure password hashing
- ✉️ **Email Verification** with time-limited verification codes
- 🌐 **Social Authentication** via multiple providers (Google, Microsoft, Amazon, ID.me)
- 📊 **Activity Logging** for security and auditing
- 🛡️ **Session Management** with secure cookie settings
- 📝 **Input Validation** using express-validator
- 📋 **Logging** with Winston (console and file-based)
- 💾 **SQLite Database** for data persistence

## Tech Stack

- **Backend**: Node.js, Express
- **Authentication**: Passport.js
- **Database**: SQLite3
- **Email**: Nodemailer
- **Logging**: Winston
- **Validation**: express-validator
- **Security**: bcryptjs, express-session

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- SQLite3
- Email service credentials (Gmail or other SMTP service)
- OAuth credentials for social providers

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd authen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Session Configuration
   SESSION_SECRET=your-session-secret-key
   
   # Email Configuration (Gmail example)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-specific-password
   
   # OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
   AMAZON_CLIENT_ID=your-amazon-client-id
   AMAZON_CLIENT_SECRET=your-amazon-client-secret
   IDME_CLIENT_ID=your-idme-client-id
   IDME_CLIENT_SECRET=your-idme-client-secret
   ```

## Database Setup

The application will automatically create an SQLite database file (`auth.db`) with the necessary tables on first run.

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123!"
  }
  ```

- `POST /auth/verify` - Verify email with verification code
  ```json
  {
    "email": "user@example.com",
    "code": "123456"
  }
  ```

- `POST /auth/login` - Login with email and password
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123!"
  }
  ```

- `GET /auth/logout` - Logout current user

### Social Authentication

- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/microsoft` - Start Microsoft OAuth flow
- `GET /auth/amazon` - Start Amazon OAuth flow
- `GET /auth/idme` - Start ID.me OAuth flow

## Security Features

- **Password Hashing**: Uses bcrypt with 10 salt rounds
- **Session Security**: HTTP-only, secure cookies with proper SameSite settings
- **Rate Limiting**: Implemented on sensitive endpoints
- **Input Validation**: All user inputs are validated and sanitized
- **CSRF Protection**: Enabled for all state-changing operations
- **Security Headers**: Helmet.js for setting secure HTTP headers

## Logging

Logs are stored in the `logs/` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs including info and errors

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3000 |
| NODE_ENV | Environment (development/production) | No | development |
| SESSION_SECRET | Secret for session encryption | Yes | - |
| EMAIL_USER | Email service username | Yes | - |
| EMAIL_PASS | Email service password/app password | Yes | - |
| GOOGLE_CLIENT_ID | Google OAuth client ID | No | - |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | No | - |
| MICROSOFT_CLIENT_ID | Microsoft OAuth client ID | No | - |
| MICROSOFT_CLIENT_SECRET | Microsoft OAuth client secret | No | - |
| AMAZON_CLIENT_ID | Amazon OAuth client ID | No | - |
| AMAZON_CLIENT_SECRET | Amazon OAuth client secret | No | - |
| IDME_CLIENT_ID | ID.me OAuth client ID | No | - |
| IDME_CLIENT_SECRET | ID.me OAuth client secret | No | - |

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  isVerified BOOLEAN DEFAULT 0,
  verificationCode TEXT,
  verificationExpires DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastLogin DATETIME
);
```

### Auth Logs Table
```sql
CREATE TABLE auth_logs (
  id TEXT PRIMARY KEY,
  userId TEXT,
  action TEXT,
  status TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

The API returns appropriate HTTP status codes and JSON responses for errors:

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required/failed
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., email already exists)
- `500 Internal Server Error`: Server error

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository.
