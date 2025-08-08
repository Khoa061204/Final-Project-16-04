# Authentication Routes Documentation

This document describes the authentication-related API endpoints implemented in `backend/src/routes/auth.js`.

---

## Endpoints

### POST `/register`
- **Purpose:** Register a new user.
- **Input:** `username`, `email`, `password` (in JSON body)
- **Validation:**
  - All fields required
  - Email format checked
  - Password must be at least 8 characters
  - Username must be at least 3 characters
  - Email and username must be unique
- **Process:**
  - Hashes password using bcrypt
  - Saves user to database
  - Logs account creation activity
- **Response:**
  - Success: `{ message, user: { id, username, email } }`
  - Error: Detailed message and field info

### POST `/login`
- **Purpose:** Authenticate a user and issue a JWT token
- **Input:** `email`, `password` (in JSON body)
- **Validation:**
  - All fields required
  - Email format checked
- **Process:**
  - Checks user existence
  - Compares password hash
  - Issues JWT token (24h expiry)
  - Updates last login
  - Logs login activity
- **Response:**
  - Success: `{ message, token, user: { id, username, email, avatar_url }, expiresIn }`
  - Error: Detailed message and field info

### GET `/verify-token`
- **Purpose:** Verify the provided JWT token
- **Input:** JWT token in `Authorization` header
- **Process:**
  - Decodes and verifies token
  - Fetches user by ID
- **Response:**
  - Success: `{ message, user: { id, email, username, avatar_url } }`
  - Error: Invalid or missing token

### GET `/verify`
- **Purpose:** Alias for `/verify-token` (frontend compatibility)
- **Behavior:** Same as `/verify-token`

---

## Validation & Error Handling
- Returns detailed error messages and field info for validation errors
- Handles duplicate email/username and database errors
- Logs errors to server console

## Authentication
- Uses JWT for stateless authentication
- JWT secret loaded from environment variables

## Activity Logging
- Uses `ActivityService` to log account creation and login events
- Activity types include: `account_created`, `account_login`

## Related Files
- **User model:** Defines user schema and fields (`backend/src/models/User.js`)
- **ActivityService:** Handles activity logging (`backend/src/services/activityService.js`)
- **Database config:** TypeORM setup (`backend/src/config/database.js`)
- **Auth middleware:** JWT authentication (`backend/src/middleware/auth.js`)

---

*This file documents the authentication API for maintainers and integrators. For implementation details, see the referenced source files.*