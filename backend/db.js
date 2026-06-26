const { Pool } = require('pg');
require('dotenv').config();

// Create a new connection pool instance.
// Using a pool is critical for performance because it allows reusing database
// connections rather than creating a new connection on every single request.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'codevector_db',
  // Maximum number of clients in the pool
  max: 20,
  // Milliseconds a client must sit idle before being closed
  idleTimeoutMillis: 30000,
  // Milliseconds before returning an error if client cannot be acquired
  connectionTimeoutMillis: 2000,
});

// Event listener for error handling on idle pool clients
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

module.exports = pool;
