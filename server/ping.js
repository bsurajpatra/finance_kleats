import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.RENDER_BACKEND_URL;

async function pingServer() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    
    if (response.ok) {
      console.log('✅ Pinged successfully:', new Date().toISOString());
      const data = await response.json();
      console.log('   Status:', data.status);
    } else {
      console.error('❌ Ping failed with status:', response.status);
    }
  } catch (err) {
    console.error('❌ Ping failed:', err.message);
  }
}

pingServer();

