'use client';

import React from 'react';
import { motion } from 'framer-motion';
import './ForHerForHim.css';

export default function ForHerForHim({ setCurrentPage }) {
  return (
    <section className="gender-split-section">
      
      {/* FOR HER SIDE */}
      <motion.div 
        className="gender-banner her-banner" 
        onClick={() => setCurrentPage('women')}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <div className="banner-image-wrapper">
          <img src="/assets/summer_essentials.jpg" alt="For Her" className="banner-image" />
        </div>
        <div className="banner-overlay">
          <div className="banner-content">
            <h2 className="banner-title">FOR HER</h2>
            <div className="banner-btn-wrapper">
              <span className="banner-explore-btn">EXPLORE COLLECTION</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FOR HIM SIDE */}
      <motion.div 
        className="gender-banner him-banner" 
        onClick={() => setCurrentPage('men')}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
      >
        <div className="banner-image-wrapper">
          <img src="/assets/shoe-1.jpg" alt="For Him" className="banner-image" />
        </div>
        <div className="banner-overlay">
          <div className="banner-content">
            <h2 className="banner-title">FOR HIM</h2>
            <div className="banner-btn-wrapper">
              <span className="banner-explore-btn">EXPLORE COLLECTION</span>
            </div>
          </div>
        </div>
      </motion.div>

    </section>
  );
}
