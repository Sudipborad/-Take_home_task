import React from 'react';

// Hardcoded categories as required by the seed and backend definitions
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

/**
 * CategoryFilter Component
 * Renders a dropdown select to choose a product category.
 * 
 * @param {Object} props
 * @param {string} props.selectedCategory - Currently active category filter
 * @param {Function} props.onCategoryChange - Callback when user selects a different category
 */
export default function CategoryFilter({ selectedCategory, onCategoryChange }) {
  return (
    <div className="controls-card">
      <span className="controls-label">Filter Products:</span>
      <div className="select-wrapper">
        <select
          id="category-select"
          className="category-select"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
