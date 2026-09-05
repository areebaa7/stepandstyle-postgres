'use client';

import React from 'react';
import { motion } from 'framer-motion';
import './NewArrivals.css';

const fallbackPlaceholders = [
  { id: 1, image: '/assets/shoe-2.jpeg' },
  { id: 2, image: '/assets/shoe-6.jpg' },
  { id: 3, image: '/assets/shoe-7.jpeg' },
  { id: 4, image: '/assets/sneaker-4.jpeg' },
];

export default function NewArrivals({ setCurrentPage }) {
  // Directly use the initialized static array without fetching/overriding
  const products = fallbackPlaceholders;

  return (
    <section className="new-arrivals-section">
      {/* Section Title */}
      <motion.h2 
        className="section-title"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        New Arrivals
      </motion.h2>

      {/* 4-Column Grid */}
      <div className="arrivals-grid">
        {products.map((item, index) => (
          <motion.div 
            key={item.id} 
            className="arrival-card" 
            onClick={() => setCurrentPage('shop')}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
            whileHover={{ y: -6 }}
          >
            <div className="arrival-image-wrapper">
              <img src={item.image} alt={item.title} className="arrival-image" />
            </div>
            <h3 className="arrival-title">{item.title}</h3>
          </motion.div>
        ))}
      </div>

      {/* Discover All Button */}
      <div className="arrivals-button-container">
        <motion.button 
          className="btn-discover-all" 
          onClick={() => setCurrentPage('shop')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          DISCOVER ALL
        </motion.button>
      </div>
    </section>
  );
}