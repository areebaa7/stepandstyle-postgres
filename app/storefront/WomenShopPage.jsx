'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProductDetail from './ProductDetail';
import { fetchProducts } from './utils/shopApi';
import './ShopPage.css';

export default function WomenShopPage({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubcategory, setActiveSubcategory] = useState('all');
  const [currentPage, setCurrentPageNum] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      // Fetch women's products from the API
      const fetched = await fetchProducts('women');
      if (isMounted) {
        setProducts(Array.isArray(fetched) ? fetched : []);
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Strict and robust isolation for Women products only
  const strictWomenProducts = products.filter(item => {
    const g = (item.gender || '').toLowerCase().trim();
    return g === 'women' || g === 'female';
  });

  // Updated casual and subcategory filtering logic with fallback keyword matching
  const filtered = activeSubcategory === 'all'
    ? strictWomenProducts
    : strictWomenProducts.filter(item => {
        const itemCat = (item.category || '').toLowerCase().trim();
        const itemTitle = (item.title || '').toLowerCase().trim();
        const targetSub = activeSubcategory.toLowerCase().trim();
        
        return itemCat === targetSub || itemCat.includes(targetSub) || itemTitle.includes(targetSub);
      });

  const itemsPerPage = 8;
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
        Women's Collection
      </motion.h1>

      {/* Category Circle Selector */}
      <div className="shop-categories-row">
        <div className={`category-circle-item ${activeSubcategory === 'all' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('all')}>
          <div className="circle-image-wrapper"><img src="/assets/shoe-7.jpeg" alt="All Women" /></div>
          <span className="category-label">All Women</span>
        </div>
        <div className={`category-circle-item ${activeSubcategory === 'casual' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('casual')}>
          <div className="circle-image-wrapper"><img src="/assets/shoe-2.jpeg" alt="Casual" /></div>
          <span className="category-label">Casual</span>
        </div>
        <div className={`category-circle-item ${activeSubcategory === 'bridal' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('bridal')}>
          <div className="circle-image-wrapper"><img src="/assets/shoe-5.jpg" alt="Bridal" /></div>
          <span className="category-label">Bridal</span>
        </div>
        <div className={`category-circle-item ${activeSubcategory === 'formal' ? 'active' : ''}`} onClick={() => handleSubcategoryChange('formal')}>
          <div className="circle-image-wrapper"><img src="/assets/women-formal.jpg" alt="Formal" /></div>
          <span className="category-label">Formal</span>
        </div>
      </div>

      <div className="shop-filter-bar">
        <p className="results-count">Showing {filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} results</p>
        <div className="filter-dropdown-btn"><span>Default sorting</span></div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>Loading women's collection...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>No products found in this category. Add them in your admin panel!</div>
      ) : (
        <div className="shop-products-grid">
          {paginatedProducts.map((product, index) => {
            const variants = Array.isArray(product.variants) ? product.variants : [];
            const totalStock = variants.reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0);
            const isOutOfStock = product.inStock === false || (variants.length > 0 && totalStock === 0);

            return (
              <motion.div 
                key={product.id}
                className="shop-product-card relative cursor-pointer"
                onClick={() => setSelectedProduct(product)}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <div className="shop-image-box relative overflow-hidden">
                  {product.discount && !isOutOfStock && <span className="shop-discount-tag">{product.discount}</span>}
                  
                  {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <span className="bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 shadow-md">
                        Sold Out
                      </span>
                    </div>
                  )}

                  <img 
                    src={product.image || '/logo_main.png'} 
                    alt={product.title} 
                    className={isOutOfStock ? 'opacity-50 grayscale-[25%]' : ''} 
                  />
                </div>

                <div className="shop-color-swatches">
                  {Array.isArray(product.colors) && product.colors.map((hex, idx) => (
                    <span key={idx} className="shop-swatch-dot" title={hex} style={{ backgroundColor: hex || '#1F2937' }} />
                  ))}
                </div>
                <h3 className="shop-product-title">{product.title}</h3>
                <div className="shop-pricing-box">
                  {product.formattedOriginalPrice && <span className="shop-original-price">{product.formattedOriginalPrice}</span>}
                  <span className="shop-sale-price">{product.formattedPrice}</span>
                </div>
              </motion.div>
            );
          })}
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