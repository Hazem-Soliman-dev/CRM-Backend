# Travel CRM Backend API

A comprehensive backend API for the Travel CRM system built with Node.js, Express, TypeScript, and SQLite.

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

**Ready to deploy in minutes!** This backend is pre-configured for Vercel serverless deployment with automatic database setup and demo data seeding.

👉 **[See Full Deployment Guide](./DEPLOYMENT.md)** for step-by-step instructions.

### Quick Start

```bash
cd backend
vercel
vercel env add JWT_SECRET production
vercel --prod
```

Your API will be live at `https://your-project.vercel.app/api/v1`

## 🚀 Features

- **Authentication**: JWT-based authentication with role-based access control
- **RESTful APIs**: Complete CRUD operations for all entities
- **Security**: SQL injection prevention, XSS protection, rate limiting
- **Database**: SQLite with auto-initialization and demo data seeding
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

## 🛠️ Local Development Setup

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**

### 1. Backend Setup

**Note:** Database setup is automatic! The backend uses SQLite and creates/seeds the database on first run.

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
   cp env.template .env
   ```

   Edit `.env` file with your settings:

   ```env
   # Required
   JWT_SECRET=your-super-secret-jwt-key-change-in-production

   # Optional (defaults provided)
   NODE_ENV=development
   PORT=5000
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   ```

   **That's it!** No database configuration needed - SQLite handles everything automatically.

4. **Build the project**:

   ```bash
   npm run build
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

### 3. Login with Demo Accounts

The backend automatically creates demo accounts on first run:

- **Admin:** `admin@example.com` / `password`
- **Manager:** `manager1@example.com` / `password`
- **Agent 1:** `agent1@example.com` / `password`
- **Agent 2:** `agent2@example.com` / `password`
- **Customer:** `customer1@example.com` / `password`

### 4. Connecting Frontend

See the frontend deployment guide for connecting the React frontend to this backend.

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

## 📊 Database

### SQLite with Auto-Setup

This backend uses SQLite for zero-configuration setup:

- **Local:** Database stored in `database.db`
- **Vercel:** Database stored in `/tmp/database.db` (resets on deploy)
- **Auto-initialization:** Schema created on first run
- **Auto-seeding:** Demo data populated automatically

### Main Entities

- **users**: System users and authentication
- **customers**: Customer information
- **leads**: Sales leads and prospects
- **reservations**: Travel bookings
- **payments**: Payment transactions
- **support_tickets**: Customer support
- **suppliers**: Service providers
- **categories**: Product/service categories
- **items**: Products and services
- **sales_cases**: Sales pipeline management
- **operations_trips**: Operations and logistics
- **properties**: Property management
- **property_owners**: Property owner management

## 🚨 Troubleshooting

### Common Issues

1. **Database Initialization Errors**:

   - Delete `database.db` and restart the server
   - Database will be recreated automatically

2. **Port Already in Use**:

   - Change PORT in `.env` file
   - Kill existing processes: `npx kill-port 5000`

3. **Missing JWT_SECRET**:

   - Ensure `.env` file exists with JWT_SECRET
   - Copy from `env.template` if needed

4. **Demo Data Not Loading**:
   - Set `FORCE_DEMO_SEED=1` in `.env`
   - Restart the server

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

### Deploy to Vercel (Recommended for MVP)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete instructions.

Quick deploy:

```bash
vercel
vercel env add JWT_SECRET production
vercel --prod
```

### Production Considerations

For production use beyond MVP:

1. **Database**: Migrate from SQLite to Vercel Postgres, PlanetScale, or Supabase
2. **Security**: Use strong JWT secrets from environment
3. **Monitoring**: Set up logging and error tracking
4. **Backups**: Implement regular database backups (if using persistent DB)

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
