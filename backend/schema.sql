-- Drops table if exists to ensure clean slate for initial creation
DROP TABLE IF EXISTS products;

-- Create the products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- CREATE COMPOSITE INDEX FOR PAGINATION
-- =========================================================================
-- This index targets: (updated_at DESC, id DESC)
--
-- Why is this specific composite index required?
--
-- 1. AVOIDS EXPENSIVE SORTS (FILESORT):
--    Our API queries order products by 'updated_at DESC, id DESC'. Without an index
--    matching this ordering, PostgreSQL would have to fetch all matching records
--    and perform an in-memory or on-disk sort (External Merge Sort). By indexing the
--    columns in the exact sorting order, PostgreSQL can scan the index directly in
--    this sorted order and return rows instantaneously.
--
-- 2. CONSTANT TIME LOOKUPS O(log N) FOR KEYSET PAGINATION:
--    Our cursor pagination queries use the keyset comparison filter:
--    WHERE updated_at < $1 OR (updated_at = $1 AND id < $2)
--    The B-Tree composite index on (updated_at DESC, id DESC) allows PostgreSQL to
--    perform a fast binary search down the index tree to locate the cursor point
--    in O(log N) time, then retrieve the next few rows sequentially. This remains
--    extremely fast even at the end of a 200,000 product list, unlike OFFSET-based
--    pagination which must scan and discard all previous rows.
-- =========================================================================
CREATE INDEX idx_products_updated_at_id ON products (updated_at DESC, id DESC);
