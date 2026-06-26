import React, { useState, useEffect } from 'react';
import { fetchProducts } from './api';
import CategoryFilter from './components/CategoryFilter';
import ProductTable from './components/ProductTable';

const LIMIT = 100;

export default function App() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('');
  
  // Keyset cursor-caching state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCursors, setPageCursors] = useState({ 1: null }); // Maps page numbers to database cursors
  const [hasMore, setHasMore] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches products for a specific page number.
   * Uses cached cursors to perform keyset queries without OFFSET.
   * 
   * @param {number} pageNumber - Page to load
   * @param {string} activeCategory - Category to query
   */
  const loadPage = async (pageNumber, activeCategory = category) => {
    setLoading(true);
    setError(null);

    try {
      let localCursors = { ...pageCursors };
      let closestPage = pageNumber;
      
      // Find the closest page number <= pageNumber that we have a cursor for.
      while (closestPage > 1 && !localCursors[closestPage]) {
        closestPage--;
      }

      let response = null;

      // Sequentially fetch pages in a loop to resolve cursors for arbitrary page jumps.
      for (let p = closestPage; p <= pageNumber; p++) {
        const cursor = p === 1 ? null : localCursors[p];

        response = await fetchProducts({
          limit: LIMIT,
          category: activeCategory,
          cursor: cursor
        });

        if (response.nextCursor) {
          localCursors[p + 1] = response.nextCursor;
        }
      }

      // Update state once with final results and cached cursors
      setProducts(response.data);
      setHasMore(response.hasMore);
      setCurrentPage(pageNumber);
      setPageCursors(localCursors);
    } catch (err) {
      console.error(`Failed to load page ${pageNumber}:`, err);
      setError(err.response?.data?.error || err.message || 'Unable to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch products from page 1 and clear cursor cache whenever category changes
  useEffect(() => {
    setPageCursors({ 1: null });
    setCurrentPage(1);
    loadPage(1, category);
  }, [category]);

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
  };

  // Build the list of page number buttons to show.
  // We display a sliding window of exactly 3 page buttons (even at page 1)
  // to keep the pagination bar length fixed and constant.
  const renderPageButtons = () => {
    let startPage;
    if (currentPage === 1) {
      startPage = 1;
    } else {
      if (!hasMore) {
        startPage = Math.max(1, currentPage - 2);
      } else {
        startPage = currentPage - 1;
      }
    }

    const pages = [];
    for (let i = startPage; i < startPage + 3; i++) {
      pages.push(i);
    }

    return pages.map((p) => (
      <button
        key={p}
        onClick={() => loadPage(p)}
        className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
        disabled={loading}
      >
        {p}
      </button>
    ));
  };

  return (
    <div className="app-container">
      {/* Header Section */}
      <header className="app-header">
        <h1>Product Catalog</h1>
        <p>Browsing 200,000 products with ultra-fast Cursor Pagination</p>
      </header>

      {/* Category Dropdown */}
      <CategoryFilter
        selectedCategory={category}
        onCategoryChange={handleCategoryChange}
      />

      {/* Error Alert Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Product Grid / Table */}
      {products.length > 0 ? (
        <ProductTable products={products} />
      ) : (
        !loading && !error && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p>No products found in this category.</p>
          </div>
        )
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading products...</span>
        </div>
      )}

      {/* Keyset Pagination Controls (Previous, Numbers, Next) */}
      {!loading && products.length > 0 && (
        <div className="pagination-container">
          <button
            onClick={() => loadPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="pagination-btn"
          >
            Previous
          </button>
          
          {renderPageButtons()}
          
          <button
            onClick={() => loadPage(currentPage + 1)}
            disabled={!hasMore || loading}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

