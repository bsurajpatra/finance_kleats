import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import transactionRoutes from './routes/transactionRoutes.js'
import supabase from './supabase/client.js'
import authRoutes from './routes/authRoutes.js';
import { verifyJWT } from './controllers/authController.js';
import payoutRoutes from './routes/payoutRoutes.js';

dotenv.config()

const app = express()
const PORT = process.env.PORT

// Middleware
app.use(cors())
app.use(express.json())

async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Database connection failed:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    return true
  } catch (err) {
    console.log('❌ Database connection error:', err.message)
    return false
  }
}

app.use('/api/auth', authRoutes);

app.use('/api/transactions', verifyJWT, transactionRoutes);
app.use('/api/payouts', payoutRoutes);

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
  console.log(`📊 API available at http://localhost:${PORT}/api`)
  console.log(`🏥 Health check at http://localhost:${PORT}/health`)
  
  await checkDatabaseConnection()
}) 