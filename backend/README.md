# CodeVector Full-Stack Assignment - Backend

This backend application is a simple, high-performance API designed to serve approximately 200,000 products using keyset (cursor-based) pagination.

---

## Technical Concept Explanations for Interviews

### 1. Why Keyset (Cursor) Pagination is Used instead of OFFSET
* **Performance at Scale**: Under standard `OFFSET 150000 LIMIT 20` pagination, PostgreSQL must scan and discard 150,000 rows before returning the 20 requested. This causes query response times to degrade linearly as users navigate deeper into the dataset. For 200,000+ rows, this is extremely slow and resource-heavy.
* **O(log N) Performance**: Keyset pagination searches down the B-Tree index using the cursor coordinates `WHERE (updated_at, id) < (cursor_updated_at, cursor_id)`. This locate operation takes logarithmic time $O(\log N)$, and then PostgreSQL simply reads the next `LIMIT` records sequentially. The response time is constant and instantaneous, regardless of how deep the user paginates.
* **No Drift/Double Records**: If products are added or deleted while a user is browsing, OFFSET-based pagination shifts the offset index, leading to missing or duplicated records between pages. Cursor-based pagination pins the position to the cursor product, ensuring a consistent stream of products.

### 2. Why Batch Inserts are Faster
* **Reduced Network Round-Trips**: Sending 200,000 insert queries individually incurs a network round-trip delay and parsing overhead for every single record. By grouping inserts in batches of 1,000, we reduce the total network round-trips from 200,000 to just 200.
* **Transaction Commit Overhead**: Committing a write to a disk takes time. When individual queries run, PostgreSQL commits each database insertion. Wrapping the batch insertions inside a single transaction (`BEGIN ... COMMIT`) guarantees that data is written to disk in a single bulk commit, reducing disk write overhead dramatically.

### 3. Why the Composite Index `(updated_at DESC, id DESC)` was Added
* **Eliminating sorting costs (Filesort)**: The API queries sort records by `ORDER BY updated_at DESC, id DESC`. A B-Tree index on `(updated_at DESC, id DESC)` stores the index nodes in pre-sorted order. The database reads records sequentially in the correct order directly from the index, eliminating the CPU and RAM overhead of a runtime sorting algorithm (Filesort).
* **Supporting Cursor Comparisons**: The keyset comparison:
  ```sql
  WHERE updated_at < $1 OR (updated_at = $1 AND id < $2)
  ```
  matches the composite layout of the index. This allows PostgreSQL to perform an Index Scan starting at the keyset pointer, rather than doing a full table scan.

---

## Installation & Setup

### 1. Requirements
Ensure you have the following installed on your system:
* **Node.js** (v16+)
* **PostgreSQL** (v12+)

### 2. Database Creation
Connect to your PostgreSQL client (psql or PgAdmin) and run:
```sql
CREATE DATABASE codevector_db;
```

### 3. Import Schema
Execute the `schema.sql` file in the database to build the tables and indexes:
```bash
# Using psql command line:
psql -U postgres -d codevector_db -f schema.sql
```
*(Alternatively, copy and paste the contents of `schema.sql` into pgAdmin / DBeaver query editor and execute it).*

### 4. Configuration
Create a `.env` file in the `backend/` directory by copying `.env.example`:
```bash
cp .env.example .env
```
Open `.env` and fill in your PostgreSQL credentials:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=codevector_db
```

### 5. Install Dependencies
Navigate to the `backend/` directory and install the Node modules:
```bash
npm install
```

### 6. Run Seed Script
Populate the database with 200,000 mock products:
```bash
npm run seed
```
This runs `seed.js` and creates products with random values in batches of 1,000. It typically takes less than 10 seconds.

### 7. Run Server
Start the Express server:
```bash
npm start
```
The server will boot and listen on http://localhost:3000.

---

## API Endpoints

### `GET /products`
Fetches a paginated list of products, sorted by updated_at (newest first) and id (highest first).

**Query Parameters:**
* `limit` (optional): Number of records to return. Default: `20`, Max: `100`.
* `category` (optional): Filter products by category (e.g. `Electronics`, `Books`).
* `cursor` (optional): Base64 string containing the pagination coordinates.

**Sample Request:**
```http
GET http://localhost:3000/products?limit=5&category=Electronics
```

**Sample Response:**
```json
{
  "data": [
    {
      "id": 194883,
      "name": "Wireless Laptop",
      "category": "Electronics",
      "price": "675.20",
      "created_at": "2026-05-24T12:00:00.000Z",
      "updated_at": "2026-05-25T14:30:00.000Z"
    },
    {
      "id": 182746,
      "name": "Smart Headphones",
      "category": "Electronics",
      "price": "120.00",
      "created_at": "2026-05-24T11:00:00.000Z",
      "updated_at": "2026-05-24T18:00:00.000Z"
    }
  ],
  "nextCursor": "eyJ1cGRhdGVkX2F0IjoiMjAyNi0wNS0yNFQxODowMDowMC4wMDBaIiwiaWQiOjE4Mjc0Nn0=",
  "hasMore": true
}
```

---

## Future Improvements
1. **Composite Category Index**: Create an index on `(category, updated_at DESC, id DESC)`. This will speed up pagination queries that filter by category.
2. **Product Search**: Add full-text search capability using PostgreSQL `tsvector` or pg_trgm.
3. **Database Migrations**: Set up a lightweight migrations system (like `db-migrate`) to track database changes programmatically.

---

## How to Make this Application Live (Deployment Guide)

To host this full-stack application online, we divide deployment into three steps: **Database**, **Backend Server**, and **Frontend Client**.

### Step 1: Deploy the PostgreSQL Database (e.g., Neon.tech)
We need a cloud-hosted PostgreSQL instance.
1. Sign up on [Neon.tech](https://neon.tech/) (free serverless Postgres) or [Render.com](https://render.com/).
2. Create a new project and database instance (e.g., `codevector_db`).
3. Copy the **Connection String** (URI format: `postgres://user:password@host/database?sslmode=require`).
4. Connect via any SQL client (like pgAdmin or DBeaver) and run the contents of `backend/schema.sql` to initialize tables and indexes.
5. In your local backend project, edit your `.env` temporarily to point to this connection string, then run `npm run seed` to populate 200,000 products into the cloud DB. *(Once seeding is done, restore your local database configuration settings)*.

### Step 2: Deploy the Express Backend (e.g., Render.com)
1. Push your project code to a public or private repository on **GitHub**.
2. Sign up on [Render.com](https://render.com/).
3. Click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Configure the Web Service settings:
   * **Root Directory**: `backend`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
6. Add the following **Environment Variables** in Render's dashboard:
   * `PORT`: `10000` (Render handles port mapping automatically)
   * `DB_HOST`: *Your cloud DB host address*
   * `DB_PORT`: `5432`
   * `DB_USER`: *Your cloud DB user*
   * `DB_PASSWORD`: *Your cloud DB password*
   * `DB_NAME`: *Your cloud DB database name*
7. Deploy the service. Copy the active live URL provided by Render (e.g., `https://codevector-backend.onrender.com`).

### Step 3: Deploy the React Frontend (e.g., Vercel)
1. Sign up on [Vercel](https://vercel.com/) (free hosting for React/Vite/static apps).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Configure the Vercel settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   * Key: `VITE_API_URL`
   * Value: *Your live Render backend URL from Step 2* (e.g., `https://codevector-backend.onrender.com`)
6. Click **Deploy**. Vercel will build and serve your frontend static assets via a global CDN. Copy your live website address.

---

### Security Checklist for Production
* **CORS policy**: In `backend/server.js`, restrict CORS access to allow requests *only* from your Vercel frontend URL, instead of using `cors()` wildcard (`*`).
* **Environment variables**: Never commit `.env` files to git. Use dashboard variable panels on hosting platforms.
* **SSL/HTTPS**: Ensure database connection parameters enable SSL (`ssl: { rejectUnauthorized: false }` or `sslmode=require` in URL parameters) to encrypt DB traffic in transit.

