const express = require('express');
const cors = require('cors');
require('dotenv').config();

const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so the React application (running on a different port/host) can request resources
app.use(cors());

// Parse incoming requests with JSON payloads
app.use(express.json());

// Register API routes
app.use('/products', productsRouter);

// Welcome route for root pings / health checks
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to the CodeVector Products API',
    endpoints: {
      products: '/products',
      health: '/health'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is healthy' });
});

// Centralized 404 Handler for undefined routes
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Centralized Error Handling Middleware
// Every catch block in our routes calls next(err) which directs execution here
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[Error] Status: ${status} | Message: ${message}`);
  if (status === 500) {
    // Print stack trace for internal server errors to make debugging easier
    console.error(err.stack);
  }

  res.status(status).json({
    error: message
  });
});

// Boot the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/products`);
});
