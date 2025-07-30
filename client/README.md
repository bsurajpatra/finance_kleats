# KL Eats Finance Portal - Frontend

React frontend for KL Eats Finance Portal with modern UI and API integration.

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and add your backend API URL:
   ```
   VITE_API_URL=http://localhost:3000
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_API_URL` - Backend API server URL (default: http://localhost:3000)

## Features

- ✅ Modern React with Vite
- ✅ Sign-in page with authentication
- ✅ Dashboard with multiple tabs
- ✅ Transactions display with API integration
- ✅ Responsive design
- ✅ Environment variable configuration

## API Integration

The frontend connects to the backend API for:
- Transaction data fetching
- Health checks
- Authentication (future)

## Project Structure

```
client/
├── src/
│   ├── components/
│   │   ├── signin/          # Sign-in page
│   │   ├── dashboard/       # Dashboard layout
│   │   └── transactions/    # Transactions display
│   ├── config/
│   │   └── api.js          # API configuration
│   └── App.jsx             # Main app component
├── .env                    # Environment variables
└── env.example            # Environment template
```
