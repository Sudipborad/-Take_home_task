const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * Encodes a cursor object containing updated_at and id into a Base64 string.
 * This abstracts the database details away from the client.
 */
function encodeCursor(updatedAt, id) {
  const cursorObj = {
    updated_at: updatedAt,
    id: id
  };
  return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
}

/**
 * Decodes a Base64 cursor string back into an object containing updated_at and id.
 */
function decodeCursor(cursorStr) {
  try {
    const decodedStr = Buffer.from(cursorStr, 'base64').toString('utf8');
    return JSON.parse(decodedStr);
  } catch (err) {
    // If decoding fails, throw a custom error to handle it gracefully in routes
    const error = new Error('Invalid cursor format');
    error.status = 400;
    throw error;
  }
}

/**
 * GET /products
 * Supports:
 *  - limit: number of rows (default 20, max 100)
 *  - category: string (filter)
 *  - cursor: Base64 encoded string representing the starting position
 */
router.get('/', async (req, res, next) => {
  try {
    // 1. Parse and validate inputs
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const { category, cursor } = req.query;

    let cursorObj = null;
    if (cursor) {
      cursorObj = decodeCursor(cursor);
    }

    // 2. Build the query dynamically
    let queryText = 'SELECT id, name, category, price, created_at, updated_at FROM products';
    const whereClauses = [];
    const queryParams = [];

    // Filter by category if supplied
    if (category) {
      queryParams.push(category);
      whereClauses.push(`category = $${queryParams.length}`);
    }

    // Apply cursor pagination keyset logic if cursor is present
    if (cursorObj) {
      // Keyset comparison: We want items that appear AFTER the cursor item.
      // Since we sort by updated_at DESC and id DESC:
      // - Any item with updated_at strictly less than the cursor's updated_at is next.
      // - If updated_at is identical, then any item with id strictly less than the cursor's id is next.
      queryParams.push(cursorObj.updated_at);
      const updatedAtPlaceholder = `$${queryParams.length}`;

      queryParams.push(cursorObj.id);
      const idPlaceholder = `$${queryParams.length}`;

      whereClauses.push(`(
        updated_at < ${updatedAtPlaceholder} 
        OR (updated_at = ${updatedAtPlaceholder} AND id < ${idPlaceholder})
      )`);
    }

    // Join all WHERE conditions with AND
    if (whereClauses.length > 0) {
      queryText += ' WHERE ' + whereClauses.join(' AND ');
    }

    // 3. Set the ordering
    // This ordering matches the idx_products_updated_at_id composite index
    queryText += ' ORDER BY updated_at DESC, id DESC';

    // 4. Fetch LIMIT + 1 records.
    // By fetching one extra record, we can know if there is a next page ('hasMore')
    // without executing a separate COUNT(*) query or sending empty next cursors.
    queryParams.push(limit + 1);
    queryText += ` LIMIT $${queryParams.length}`;

    // Execute query using our shared pool
    const result = await pool.query(queryText, queryParams);
    const rows = result.rows;

    // 5. Determine pagination status
    const hasMore = rows.length > limit;
    
    // Slice down rows to the requested limit if we fetched the extra checking row
    const data = hasMore ? rows.slice(0, limit) : rows;

    // Create next cursor if more rows exist
    let nextCursor = null;
    if (hasMore && data.length > 0) {
      const lastProduct = data[data.length - 1];
      nextCursor = encodeCursor(lastProduct.updated_at, lastProduct.id);
    }

    // 6. Return response
    return res.status(200).json({
      data,
      nextCursor,
      hasMore
    });

  } catch (err) {
    // Pass errors to our centralized error handler in server.js
    next(err);
  }
});

module.exports = router;
