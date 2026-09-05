'use client';

import React from 'react';
import { MapPin, Phone, Clock, Mail, MessageCircle } from 'lucide-react';
import './Footer.css';

export default function Footer({ setCurrentPage }) {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        
        {/* Column 1: Step&Styl Navigation */}
        <div className="footer-column">
          <h3 className="footer-heading">Step&Styl</h3>
          <ul className="footer-links">
            <li onClick={() => setCurrentPage('shop')}>Category</li>
            <li onClick={() => setCurrentPage('shop')}>New arrivals</li>
            <li onClick={() => setCurrentPage('shop')}>Sales</li>
            <li onClick={() => setCurrentPage('shop')}>Shop</li>
            <li onClick={() => setCurrentPage('shop')}>Contact us</li>
          </ul>
        </div>

        {/* Column 2: Information */}
        <div className="footer-column">
          <h3 className="footer-heading">Information</h3>
          <ul className="footer-links">
            <li onClick={() => window.open('https://wa.me/923329822592', '_blank')}>Contact Us</li>
            <li onClick={() => setCurrentPage('shipping-delivery')}>Shipping & Delivery</li>
            <li onClick={() => setCurrentPage('returns-exchanges')}>Returns & Exchanges</li>
          </ul>
        </div>

        {/* Column 3: Our Contacts & Socials */}
        <div className="footer-column">
          <h3 className="footer-heading">Our Contacts</h3>
          <ul className="footer-contact-list">
            <li>
              <MapPin size={16} className="contact-icon" />
              <span>Islamabad, Pakistan</span>
            </li>
            <li>
              <Phone size={16} className="contact-icon" />
              <span>+92 332 9822592</span>
            </li>
            <li>
              <Clock size={16} className="contact-icon" />
              <span>Mon - Fri: 10:00 - 18:00</span>
            </li>
            <li>
              <Mail size={16} className="contact-icon" />
              <span>support@stepandstyl.com</span>
            </li>
          </ul>

          <div className="footer-socials">
            {/* Instagram */}
            <a 
              href="https://www.instagram.com/step_andstyl?igsh=dHZ0dG1qdjFoaG55" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram" 
              className="social-icon-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            {/* TikTok */}
            <a 
              href="https://www.tiktok.com/@stepandstyl?_r=1&_t=ZN-97XWqWqSZnu" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="TikTok" 
              className="social-icon-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
              </svg>
            </a>

            {/* Facebook */}
            <a 
              href="https://www.facebook.com/profile.php?id=61588784750967" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Facebook" 
              className="social-icon-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>

            {/* WhatsApp */}
            <a 
              href="https://wa.me/923329822592" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="WhatsApp" 
              className="social-icon-btn"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>

      </div>

      {/* Bottom Copyright Bar */}
      <div className="footer-bottom">
        <p>© 2026 Step&Styl. All rights reserved.</p>
      </div>
    </footer>
  );
}