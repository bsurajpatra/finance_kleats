# KL Eats Finance Server

Backend server for KL Eats Finance Portal using Node.js, Express, and Supabase.

## Project Structure (MVC)

```
server/
├── supabase/
│   └── client.js          # Supabase database connection
├── models/
│   └── transactionModel.js # Database operations
├── controllers/
│   └── transactionController.js # Business logic
├── routes/
│   └── transactionRoutes.js # API endpoints
├── server.js              # Main entry point
├── package.json           # Dependencies
└── env.example           # Environment variables template
```

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3000
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Start Production Server:**
   ```bash
   npm start
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /api/transactions` - Fetch all transactions from finance_transactions table

## Database Schema

The server expects a `finance_transactions` table in Supabase with the following structure:
- `id` (primary key)
- `date` (timestamp)
- `amount` (numeric)
- `description` (text)
- `status` (text)
- `customer_name` (text)

## Features

- ✅ MVC Architecture
- ✅ Supabase Integration
- ✅ CORS Enabled
- ✅ Environment Variables
- ✅ Error Handling
- ✅ Health Check Endpoint 