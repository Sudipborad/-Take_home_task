import axios from 'axios';

// Instantiate an axios client with our backend's address.
// We support an environment variable or default to port 3001 matching the active server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001'
});

/**
 * Fetches a list of products from the backend API.
 * 
 * @param {Object} params - Query options
 * @param {number} params.limit - Number of products to fetch
 * @param {string} params.category - Optional category filter
 * @param {string} params.cursor - Optional pagination cursor (Base64 string)
 * @returns {Promise<Object>} Object containing { data: Array, nextCursor: String, hasMore: Boolean }
 */
export const fetchProducts = async ({ limit, category, cursor }) => {
  const response = await api.get('/products', {
    params: {
      limit,
      category: category || undefined, // Send category only if it is non-empty
      cursor: cursor || undefined      // Send cursor only if it is non-empty
    }
  });
  return response.data;
};

export default api;
