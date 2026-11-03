import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import apiRoutes from './src/routes/apiRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin === process.env.CLIENT_URL ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:5000' ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Connect Database
connectDB();

// API Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send({ message: 'AI Business Brain API Server Running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
