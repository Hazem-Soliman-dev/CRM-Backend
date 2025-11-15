# Travel CRM Backend API

A comprehensive backend API for the Travel CRM system built with Node.js, Express, TypeScript, and MySQL.

## 🚀 Features

- **Authentication**: JWT-based authentication with role-based access control
- **RESTful APIs**: Complete CRUD operations for all entities
- **Security**: SQL injection prevention, XSS protection, rate limiting
- **Database**: MySQL with connection pooling
- **Validation**: Input validation with express-validator
- **Error Handling**: Comprehensive error handling and logging

## 📋 API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `GET /api/v1/auth/me` - Get current user

### Leads Management

- `GET /api/v1/leads` - Get all leads (with filtering)
- `GET /api/v1/leads/:id` - Get single lead
- `POST /api/v1/leads` - Create new lead
- `PUT /api/v1/leads/:id` - Update lead
- `DELETE /api/v1/leads/:id` - Delete lead
- `PATCH /api/v1/leads/:id/status` - Update lead status
- `PATCH /api/v1/leads/:id/followup` - Schedule follow-up

### Customers Management

- `GET /api/v1/customers` - Get all customers
- `GET /api/v1/customers/:id` - Get single customer
- `POST /api/v1/customers` - Create new customer
- `PUT /api/v1/customers/:id` - Update customer
- `DELETE /api/v1/customers/:id` - Delete customer
- `GET /api/v1/customers/:id/stats` - Get customer statistics
- `PATCH /api/v1/customers/:id/status` - Update customer status
- `PATCH /api/v1/customers/:id/assign` - Assign customer to staff

### Reservations Management

- `GET /api/v1/reservations` - Get all reservations
- `GET /api/v1/reservations/:id` - Get single reservation
- `POST /api/v1/reservations` - Create new reservation
- `PUT /api/v1/reservations/:id` - Update reservation
- `DELETE /api/v1/reservations/:id` - Delete reservation
- `GET /api/v1/reservations/today-schedule` - Get today's schedule
- `PATCH /api/v1/reservations/:id/status` - Update reservation status
- `PATCH /api/v1/reservations/:id/payment-status` - Update payment status

### Payments Management

- `GET /api/v1/payments` - Get all payments
- `GET /api/v1/payments/:id` - Get single payment
- `POST /api/v1/payments` - Create new payment
- `PUT /api/v1/payments/:id` - Update payment
- `DELETE /api/v1/payments/:id` - Delete payment
- `GET /api/v1/payments/stats` - Get payment statistics
- `PATCH /api/v1/payments/:id/status` - Update payment status
- `POST /api/v1/payments/:id/refund` - Process refund

### Support Tickets

- `GET /api/v1/support/tickets` - Get all tickets
- `GET /api/v1/support/tickets/:id` - Get single ticket
- `POST /api/v1/support/tickets` - Create new ticket
- `PUT /api/v1/support/tickets/:id` - Update ticket
- `DELETE /api/v1/support/tickets/:id` - Delete ticket
- `PATCH /api/v1/support/tickets/:id/status` - Update ticket status
- `PATCH /api/v1/support/tickets/:id/assign` - Assign ticket
- `POST /api/v1/support/tickets/:id/notes` - Add note to ticket
- `GET /api/v1/support/tickets/:id/notes` - Get ticket notes

### Dashboard & Analytics

- `GET /api/v1/dashboard/stats` - Get dashboard statistics
- `GET /api/v1/dashboard/revenue-trend` - Get revenue trend
- `GET /api/v1/dashboard/lead-sources` - Get lead sources
- `GET /api/v1/dashboard/recent-activity` - Get recent activity
- `GET /api/v1/dashboard/performance` - Get performance metrics

## 🛠️ Setup Instructions

### Prerequisites

1. **Node.js** (v16 or higher)
2. **XAMPP** (for MySQL database)
3. **Git**

### 1. Database Setup

1. **Install XAMPP** from [https://www.apachefriends.org/](https://www.apachefriends.org/)
2. **Start XAMPP** and ensure MySQL service is running
3. **Access phpMyAdmin** at `http://localhost/phpmyadmin`
4. **Create Database**:
   ```sql
   CREATE DATABASE travel_crm;
   ```
5. **Import Schema**:
   - Copy the content from `mysql_schema.sql`
   - Paste it into phpMyAdmin SQL tab
   - Execute the script

### 2. Backend Setup

1. **Navigate to backend directory**:

   ```bash
   cd backend
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your settings:

   ```env
   NODE_ENV=development
   PORT=5000

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=travel_crm

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d

   # Security
   BCRYPT_ROUNDS=10
   RATE_LIMIT_WINDOW=15
   RATE_LIMIT_MAX_REQUESTS=100

   # CORS
   FRONTEND_URL=http://localhost:5173
   ```

4. **Build the project**:

   ```bash
   npm run build
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

### 3. Frontend Setup

1. **Navigate to project root**:

   ```bash
   cd ..
   ```

2. **Install frontend dependencies**:

   ```bash
   npm install
   ```

3. **Configure frontend environment**:
   Create `.env` file in project root:

   ```env
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   VITE_APP_TITLE=Travel CRM
   VITE_APP_ENV=development
   ```

4. **Start frontend**:
   ```bash
   npm run dev
   ```

The frontend will start on `http://localhost:5173`

### 4. Login Quickstart

1. Ensure XAMPP's MySQL service is running and the `travel_crm` schema from `mysql_schema.sql` has been imported.
2. Start the backend (`npm run dev`) and frontend (`npm run dev`) servers in separate terminals.
3. Sign in from the frontend login page using one of the seeded accounts:
   - Email: `admin@example.com`
   - Password: `password`
4. Confirm that you are redirected to the dashboard and that `localStorage` now contains `token`, `refreshToken`, and `user` entries provided by the backend API.

## 🔧 Development

### Available Scripts

**Backend:**

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

**Frontend:**

- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Project Structure

```
/backend
├── /src
│   ├── /config          # Database, JWT configuration
│   ├── /controllers     # Route handlers
│   ├── /middleware      # Authentication, validation, error handling
│   ├── /models          # Database models
│   ├── /routes          # API route definitions
│   ├── /utils           # Helper functions
│   └── server.ts        # Main server file
├── /dist               # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **admin**: Full system access
- **manager**: Management and reporting access
- **agent**: Sales and customer management
- **customer**: Limited access to own data

## 📊 Database Schema

The system includes the following main entities:

- **users**: System users and authentication
- **customers**: Customer information
- **leads**: Sales leads and prospects
- **reservations**: Travel bookings
- **payments**: Payment transactions
- **support_tickets**: Customer support
- **suppliers**: Service providers
- **categories**: Product/service categories
- **items**: Products and services

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Error**:

   - Ensure XAMPP MySQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **Port Already in Use**:

   - Change PORT in `.env` file
   - Kill existing processes on port 5000

3. **CORS Issues**:

   - Verify FRONTEND_URL in backend `.env`
   - Check frontend API_BASE_URL

4. **JWT Token Issues**:
   - Ensure JWT_SECRET is set
   - Check token expiration settings

### Logs

- Backend logs are displayed in the console
- Check browser console for frontend errors
- Database errors are logged with stack traces

## 📝 API Testing

### Using curl

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Get leads (with token)
curl -X GET http://localhost:5000/api/v1/leads \
  -H "Authorization: Bearer <your-token>"
```

### Using Postman

1. Import the API collection (if available)
2. Set base URL to `http://localhost:5000/api/v1`
3. Configure authentication headers

## 🔄 Deployment

### Production Setup

1. **Environment Variables**:

   - Set `NODE_ENV=production`
   - Use strong JWT secrets
   - Configure production database

2. **Database**:

   - Use production MySQL server
   - Configure connection pooling
   - Set up backups

3. **Security**:
   - Enable HTTPS
   - Configure CORS properly
   - Set up rate limiting
   - Use environment variables for secrets

## 📞 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the API documentation
3. Check server logs for errors
4. Verify database connectivity

## 🎯 Next Steps

- [ ] Add comprehensive testing
- [ ] Implement file uploads
- [ ] Add email notifications
- [ ] Create admin dashboard
- [ ] Add data export features
- [ ] Implement audit logging
