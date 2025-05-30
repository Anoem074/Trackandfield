require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const trainingRoutes = require('./routes/training');
const userRoutes = require('./routes/user');

// Check required environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: ${envVar} environment variable is required`);
    process.exit(1);
  }
}

const app = express();

// Enhanced CORS configuration for Vercel
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.vercel\.app$/, /localhost/] 
    : '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/user', userRoutes);

// Health check endpoint for Vercel
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    msg: 'Server error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Vercel serverless function export
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} 