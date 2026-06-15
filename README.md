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

### Appointments

| Method | Endpoint                 | Description             | Auth |
|--------|--------------------------|-------------------------|------|
| POST   | /api/appointments        | Create appointment      | Yes  |
| GET    | /api/appointments        | Get all appointments    | Yes  |
| PUT    | /api/appointments/:id    | Update appointment      | Yes  |
| DELETE | /api/appointments/:id    | Delete appointment      | Yes  |

### Emergency Contacts

| Method | Endpoint                       | Description              | Auth |
|--------|--------------------------------|--------------------------|------|
| POST   | /api/emergency-contacts        | Add emergency contact    | Yes  |
| GET    | /api/emergency-contacts        | Get all contacts         | Yes  |
| PUT    | /api/emergency-contacts/:id    | Update contact           | Yes  |
| DELETE | /api/emergency-contacts/:id    | Delete contact           | Yes  |

### Medical Conditions

| Method | Endpoint                        | Description               | Auth |
|--------|---------------------------------|---------------------------|------|
| POST   | /api/medical-conditions         | Add medical condition     | Yes  |
| GET    | /api/medical-conditions         | Get all conditions        | Yes  |
| PUT    | /api/medical-conditions/:id     | Update condition          | Yes  |
| DELETE | /api/medical-conditions/:id     | Delete condition          | Yes  |

### Medications

| Method | Endpoint                 | Description             | Auth |
|--------|--------------------------|-------------------------|------|
| POST   | /api/medications         | Add medication          | Yes  |
| GET    | /api/medications         | Get all medications     | Yes  |
| PUT    | /api/medications/:id     | Update medication       | Yes  |
| DELETE | /api/medications/:id     | Delete medication       | Yes  |

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
