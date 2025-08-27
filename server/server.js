import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import transactionRoutes from './routes/transactionRoutes.js'
import { pool } from './db/mysql.js'
import authRoutes from './routes/authRoutes.js';
import summaryRoutes from './routes/summaryRoutes.js';
import canteenRoutes from './routes/canteenRoutes.js';

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

const allowedOrigin = process.env.ALLOWED_ORIGIN

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigin === origin) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1')
    console.log('✅ Database connection successful')
    return true
  } catch (err) {
    console.log('❌ Database connection error:', err.message)
    return false
  }
}

app.use('/api/auth', authRoutes);

app.use('/api/transactions', transactionRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/canteens', canteenRoutes);

app.get('/health', async (req, res) => {
  const dbStatus = await checkDatabaseConnection()
  
  res.json({ 
    status: 'OK', 
    message: 'KL Eats Finance Server is running',
    database: dbStatus ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  })
})

app.listen(PORT, async () => {
  console.log(`🚀 KL Eats Finance Server running on port ${PORT}`)
  
  await checkDatabaseConnection()
}) 