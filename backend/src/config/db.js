import dns from 'dns';
import mongoose from 'mongoose';

// Fix for Windows / ISP DNS resolvers failing SRV lookups (querySrv ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  // Fallback if environment restricts custom DNS servers
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-business-brain');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`MongoDB Connection Warning: ${error.message}. Running without active DB connection.`);
  }
};
