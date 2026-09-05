'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductDetail from './ProductDetail';
import { fetchProducts } from './utils/shopApi';// Updated to point to your backend API helper
import './ShopPage.css';

export default function MenShopPage({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [currentPage, setCurrentPageNum] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const fetched = await fetchProducts('MEN');
      if (isMounted) {
        setProducts(fetched);
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  const strictMenProducts = products.filter(item => (item.category || '').toUpperCase() === 'MEN');
  const filtered = activeSubcategory === 'all'
    ? strictMenProducts
    : strictMenProducts.filter(item => {
        const sub = activeSubcategory.toLowerCase();
        return (item.category || "").toLowerCase().includes(sub) || 
               (item.title || "").toLowerCase().includes(sub) || 
               (item.description || "").toLowerCase().includes(sub) || 
               (item.shortDescription || "").toLowerCase().includes(sub) ||
               (item.collection || "").toLowerCase().includes(sub);
      });

  const itemsPerPage = 6;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedProducts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSubcategoryChange = (sub) => {
    setActiveSubcategory(sub);
    setCurrentPageNum(1);
  };

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
        Men's Collection
      </motion.h1>

      <div className="shop-categories-row">
        <div className={`category-circle-item ${activeSubcategory === 'all' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('all')}>
          <div className="circle-image-wrapper"><img src="/assets/sneaker-1.jpeg" alt="All Men" /></div>
          <span className="category-label">All Men</span>
        </div>
        <div className={`category-circle-item ${activeSubcategory === 'sneaker' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('sneaker')}>
          <div className="circle-image-wrapper"><img src="/assets/sneaker-2.jpeg" alt="Sneakers" /></div>
          <span className="category-label">Sneakers</span>
        </div>
        <div className={`category-circle-item ${activeSubcategory === 'formal' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('formal')}>
          <div className="circle-image-wrapper"><img src="/assets/men-formal2.jpeg" alt="Formal" /></div>
          <span className="category-label">Formal</span>
        </div>
        <div className={`category-circle-item ${activeSubcategory === 'casual' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('casual')}>
          <div className="circle-image-wrapper"><img src="/assets/men-sandals.jpeg" alt="Casual" /></div>
          <span className="category-label">Casual</span>
        </div>
      </div>

      <div className="shop-filter-bar">
        <p className="results-count">Showing {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} results</p>
        <div className="filter-dropdown-btn"><span>Default sorting</span></div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>Loading men's collection...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>No products found in this category. Add them in your admin panel!</div>
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
                {product.colors.map((hex, idx) => (
                  <span key={idx} className="shop-swatch-dot" style={{ backgroundColor: hex || '#1F2937' }} />
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
            <button key={num} className={`page-btn ${currentPage === num ? 'active-page' : ''}`} onClick={() => setCurrentPageNum(num)}>
              {num}
            </button>
          ))}
          <button className="page-btn" onClick={() => setCurrentPageNum(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
            &gt;
          </button>
        </div>
      )}
    </div>
  );
}
