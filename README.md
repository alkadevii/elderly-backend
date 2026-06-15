# Elderly Care Backend

A Node.js/Express REST API backend for an elderly care management application.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT + bcrypt

## Features

- User registration and login with JWT authentication
- Role-based access (admin/user)
- Profile management
- Appointments tracking
- Emergency contacts management
- Medical conditions tracking
- Medication management

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB instance (local or Atlas)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

### Running the Server

```bash
# Development
npm run dev

# Production
node server.js
```

## API Endpoints

### Auth

| Method | Endpoint          | Description          | Auth |
|--------|-------------------|----------------------|------|
| POST   | /api/auth/register | Register a new user  | No   |
| POST   | /api/auth/login    | Login user           | No   |
| GET    | /api/auth/me       | Get current user     | Yes  |
| PUT    | /api/auth/profile  | Update user profile  | Yes  |

## Project Structure

```
├── config/             # Database connection config
├── controllers/        # Request handlers
├── middleware/         # Auth middleware
├── models/             # Mongoose schemas
├── routes/             # API route definitions
├── utils/              # Utility functions (JWT)
└── server.js           # Entry point
```
