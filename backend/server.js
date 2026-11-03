import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './src/config/db.js';
import apiRoutes from './src/routes/apiRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
const allowedOrigins = process.env.CLIENT_URL
  ? (process.env.CLIENT_URL.includes(',') ? process.env.CLIENT_URL.split(',').map(o => o.trim()) : process.env.CLIENT_URL)
  : true;

app.use(cors({
  origin: allowedOrigins,
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
