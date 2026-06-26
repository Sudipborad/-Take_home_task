const pool = require('./db');
require('dotenv').config();

// Allowed categories as per assignment requirements
const CATEGORIES = [
  'Electronics',
  'Books',
  'Clothing',
  'Grocery',
  'Furniture',
  'Sports',
  'Beauty',
  'Toys'
];

// Lists of adjectives and nouns for realistic product name generation
const ADJECTIVES = ['Wireless', 'Pro', 'Ultra', 'Classic', 'Premium', 'Eco', 'Ergonomic', 'Smart', 'Portable', 'Digital', 'Luxury', 'Vintage', 'Modern', 'Heavy-Duty', 'Minimalist', 'Super', 'Deluxe', 'Essential', 'Pocket', 'Travel'];

const NOUNS_BY_CATEGORY = {
  Electronics: ['Phone', 'Laptop', 'Headphones', 'Smartwatch', 'Camera', 'Speaker', 'Charger', 'Tablet', 'Monitor', 'Keyboard'],
  Books: ['Novel', 'Biography', 'Thriller', 'Cookbook', 'Textbook', 'Encyclopedia', 'Comic', 'Poetry', 'Journal', 'Atlas'],
  Clothing: ['T-Shirt', 'Jeans', 'Jacket', 'Sweater', 'Dress', 'Socks', 'Shoes', 'Hat', 'Gloves', 'Scarf'],
  Grocery: ['Apple', 'Milk', 'Bread', 'Coffee', 'Cereal', 'Rice', 'Pasta', 'Cheese', 'Juice', 'Tea'],
  Furniture: ['Chair', 'Table', 'Sofa', 'Bed', 'Desk', 'Bookshelf', 'Wardrobe', 'Cabinet', 'Recliner', 'Dresser'],
  Sports: ['Football', 'Racket', 'Dumbbell', 'Yoga Mat', 'Bicycle', 'Helmet', 'Gloves', 'Running Shoes', 'Backpack', 'Water Bottle'],
  Beauty: ['Lipstick', 'Shampoo', 'Perfume', 'Moisturizer', 'Mascara', 'Foundation', 'Face Wash', 'Nail Polish', 'Sunscreen', 'Conditioner'],
  Toys: ['Action Figure', 'Board Game', 'Puzzle', 'Doll', 'Toy Car', 'Building Blocks', 'Plush Toy', 'Yo-Yo', 'Kite', 'Rubik\'s Cube']
};

/**
 * Generates a random product object with random values.
 */
function generateRandomProduct() {
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const adjectives = ADJECTIVES;
  const nouns = NOUNS_BY_CATEGORY[category];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const name = `${adjective} ${noun}`;
  
  // Random price between 1.00 and 1000.00
  const price = parseFloat((Math.random() * 999 + 1).toFixed(2));
  
  // Random timestamps in the last 60 days
  const now = new Date();
  const daysAgo = Math.random() * 60; // random floating days
  const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  
  // updated_at is either same as created_at or slightly newer (up to 5 days after creation, but not exceeding now)
  const daysAfter = Math.random() * 5;
  let updatedAtTime = createdAt.getTime() + daysAfter * 24 * 60 * 60 * 1000;
  if (updatedAtTime > now.getTime()) {
    updatedAtTime = now.getTime();
  }
  const updatedAt = new Date(updatedAtTime);

  return {
    name,
    category,
    price,
    created_at: createdAt,
    updated_at: updatedAt
  };
}

/**
 * Seeds the database with 200,000 products in batches of 1,000.
 */
async function seedDatabase() {
  const totalProducts = 200000;
  const batchSize = 1000;
  const totalBatches = totalProducts / batchSize;

  console.log(`Starting to seed ${totalProducts} products...`);
  console.time('Seeding Complete');

  const client = await pool.connect();

  try {
    // 1. Truncate table to clean up before seed
    console.log('Truncating existing products table...');
    await client.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE;');

    // 2. Start a single transaction for the entire operation to make it blazing fast.
    // Transactions group all database writes together and only flush to disk at the end on COMMIT.
    await client.query('BEGIN');

    for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
      const values = [];
      const placeholders = [];
      let paramIndex = 1;

      for (let i = 0; i < batchSize; i++) {
        const prod = generateRandomProduct();
        values.push(prod.name, prod.category, prod.price, prod.created_at, prod.updated_at);
        
        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
        paramIndex += 5;
      }

      // Construct a parameterized multi-row insert query:
      // INSERT INTO products (name, category, price, created_at, updated_at) VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)...
      const query = `
        INSERT INTO products (name, category, price, created_at, updated_at)
        VALUES ${placeholders.join(', ')};
      `;

      await client.query(query, values);

      if (batchNum % 20 === 0 || batchNum === totalBatches) {
        console.log(`Progress: Seeded ${batchNum * batchSize} / ${totalProducts} products (${((batchNum / totalBatches) * 100).toFixed(0)}%)`);
      }
    }

    // Commit all insertions at once
    await client.query('COMMIT');
    console.log('Successfully committed all products to the database.');

  } catch (err) {
    console.error('Error occurred while seeding database, rolling back...', err);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    // Close the database pool so the script exits
    await pool.end();
    console.timeEnd('Seeding Complete');
  }
}

seedDatabase();
