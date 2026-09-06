'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductDetail from './ProductDetail';
import { fetchProducts } from './utils/shopApi';
import './ShopPage.css';

export default function KidsShopPage({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const fetched = await fetchProducts('KIDS');
      if (isMounted) {
        setProducts(fetched);
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const itemsPerPage = 6;
  const strictKidsProducts = products.filter(item => 
    (item.gender || '').toLowerCase() === 'kids' || 
    (item.category || '').toLowerCase() === 'kids'
  );

  const totalPages = Math.ceil(strictKidsProducts.length / itemsPerPage) || 1;
  const paginatedProducts = strictKidsProducts.slice((currentPageNum - 1) * itemsPerPage, currentPageNum * itemsPerPage);

  if (selectedProduct) {
    return (
      <ProductDetail 
        product={selectedProduct} 
        onBack={() => setSelectedProduct(null)} 
        onAddToCart={onAddToCart}
      />
    );
  }

  return (
    <div className="shop-page-container">
      <motion.h1 
        className="shop-main-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Kids' Collection
      </motion.h1>

      <div className="shop-filter-bar">
        <p className="results-count">
          Showing {strictKidsProducts.length > 0 ? (currentPageNum - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPageNum * itemsPerPage, strictKidsProducts.length)} of {strictKidsProducts.length} results
        </p>
        <div className="filter-dropdown-btn"><span>Default sorting</span></div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>Loading collection...</div>
      ) : strictKidsProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>No kids' products available yet. Add them in your admin panel!</div>
      ) : (
        <div className="shop-products-grid">
          {paginatedProducts.map((product, index) => (
            <motion.div 
              key={product.id}
              className="shop-product-card"
              onClick={() => setSelectedProduct(product)}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <div className="shop-image-box">
                {product.discount && <span className="shop-discount-tag">{product.discount}</span>}
                <img src={product.image} alt={product.title} />
              </div>
              <div className="shop-color-swatches">
                {product.colors.map((colorName, idx) => (
                  <span key={idx} className="shop-swatch-dot" title={colorName} style={{ backgroundColor: colorName || '#1F2937' }} />
                ))}
              </div>
              <h3 className="shop-product-title">{product.title}</h3>
              <div className="shop-pricing-box">
                {product.formattedOriginalPrice && <span className="shop-original-price">{product.formattedOriginalPrice}</span>}
                <span className="shop-sale-price">{product.formattedPrice}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="shop-pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <button key={num} className={`page-btn ${currentPageNum === num ? 'active-page' : ''}`} onClick={() => setCurrentPageNum(num)}>
              {num}
            </button>
          ))}
          <button className="page-btn" onClick={() => setCurrentPageNum(prev => Math.min(prev + 1, totalPages))} disabled={currentPageNum === totalPages}>
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}