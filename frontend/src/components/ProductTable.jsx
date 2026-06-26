import React from 'react';

/**
 * ProductTable Component
 * Displays product data in a structured, responsive table.
 * 
 * @param {Object} props
 * @param {Array} props.products - Array of product objects
 */
export default function ProductTable({ products }) {
  // Utility function to format timestamp into a human-readable date string
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  // Utility function to format price as a dollar amount
  const formatPrice = (priceVal) => {
    const parsed = parseFloat(priceVal);
    return isNaN(parsed) ? '$0.00' : `$${parsed.toFixed(2)}`;
  };

  return (
    <div className="table-card">
      <div className="table-wrapper">
        <table className="product-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>
                  <span className="product-category-badge">
                    {product.category}
                  </span>
                </td>
                <td className="product-price">
                  {formatPrice(product.price)}
                </td>
                <td>
                  {formatDateTime(product.updated_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
