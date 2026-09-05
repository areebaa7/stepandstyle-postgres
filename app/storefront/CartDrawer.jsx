'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import './CartDrawer.css';

export default function CartDrawer({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, setCurrentPage }) {

  const subtotal = cartItems.reduce((acc, item) => {
    const cleanPrice = Number(item.price) || 0;
    return acc + cleanPrice * item.quantity;
  }, 0);

  const handleProceedToCheckout = () => {
    onClose(); // Close the drawer
    if (setCurrentPage) {
      setCurrentPage('checkout'); // Navigate to dedicated checkout page
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="cart-drawer-overlay" onClick={onClose}>
          <motion.div 
            className="cart-drawer-container"
            onClick={(e) => e.stopPropagation()}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          >
            <div className="cart-drawer-header">
              <div className="cart-title-wrap">
                <ShoppingBag size={20} />
                <h2>Your Shopping Cart ({cartItems.length})</h2>
              </div>
              <button className="cart-close-btn" onClick={onClose}>
                <X size={22} />
              </button>
            </div>

            <div className="cart-promo-banner">
              🎉 <strong>Open Parcel Then Pay</strong> enabled on all orders!
            </div>

            <div className="cart-items-list">
              {cartItems.length === 0 ? (
                <div className="cart-empty-state">
                  <ShoppingBag size={48} strokeWidth={1.5} />
                  <p>Your cart is currently empty.</p>
                </div>
              ) : (
                cartItems.map((item, index) => {
                  const itemSize = item.selectedSize || item.size;
                  const itemColor = item.selectedColor || item.color;
                  return (
                    <div key={`${item.id || 'item'}-${itemSize || 'nosize'}-${itemColor || 'nocolor'}-${index}`} className="cart-item-card">
                      <img src={item.image} alt={item.title || item.name} className="cart-item-img" />
                      <div className="cart-item-details">
                        <h4>{item.title || item.name}</h4>
                        <p className="cart-item-specs">
                          {itemSize && <>Size: <strong>{itemSize}</strong></>}
                          {itemSize && itemColor && ' | '}
                          {itemColor && (
                            <>Color: <span className="cart-color-dot" style={{ backgroundColor: itemColor }} /></>
                          )}
                        </p>
                        <p className="cart-item-price">{typeof item.price === 'number' ? `${item.price.toLocaleString()} PKR` : item.price}</p>
                        
                        <div className="cart-item-controls">
                          <div className="cart-qty-box">
                            <button onClick={() => onUpdateQuantity(index, item.quantity - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(index, item.quantity + 1)}>+</button>
                          </div>
                          <button className="cart-delete-btn" onClick={() => onRemoveItem(index)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-drawer-footer">
                <div className="cart-subtotal-row">
                  <span>Subtotal:</span>
                  <span className="cart-subtotal-price">{subtotal.toLocaleString()} PKR</span>
                </div>
                <button 
                  className="cart-checkout-btn"
                  onClick={handleProceedToCheckout}
                >
                  Proceed to Checkout <ArrowRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}