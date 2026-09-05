'use client';

import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import './CheckoutModal.css';

export default function CheckoutModal({ isOpen, onClose, cartItems, onOrderSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    paymentMethod: 'COD', // Cash on Delivery / Open Parcel
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => {
    const cleanPrice = Number(item.price) || 0;
    return acc + cleanPrice * (item.quantity || 1);
  }, 0);

  const shippingCost = 0; // Free delivery
  const total = subtotal + shippingCost;

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          postalCode: formData.postalCode,
          paymentMethod: formData.paymentMethod,
          items: cartItems.map(item => ({
            productId: item.id,
            name: item.title,
            price: Number(String(item.price).replace(/[^0-9.]/g, '')),
            quantity: item.quantity || 1,
            size: item.selectedSize,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order. Please check your details.');
      }

      setSuccessOrder(data.order || { id: 'SUCCESS' });
      if (onOrderSuccess) onOrderSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-modal-overlay" onClick={onClose}>
      <div className="checkout-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close-btn" onClick={onClose}><X size={20} /></button>
        
        {successOrder ? (
          <div className="order-success-box">
            <CheckCircle size={50} color="#10B981" />
            <h2>Order Placed Successfully!</h2>
            <p>Thank you for shopping with Step & Styl. Your order is confirmed with Open Parcel inspection enabled.</p>
            <button className="btn-close-success" onClick={onClose}>Continue Shopping</button>
          </div>
        ) : (
          <form onSubmit={handleCheckoutSubmit} className="checkout-form">
            <h2>Checkout & Shipping Details</h2>
            <p className="checkout-sub">Open Parcel Then Pay enabled on all orders!</p>

            {error && <div className="checkout-error">{error}</div>}

            <div className="form-row">
              <input 
                type="text" 
                placeholder="Full Name *" 
                required 
                value={formData.fullName} 
                onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
              />
              <input 
                type="tel" 
                placeholder="Phone Number (e.g. 03001234567) *" 
                required 
                value={formData.phone} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              />
            </div>

            <input 
              type="text" 
              placeholder="Complete Street Address *" 
              required 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
            />

            <div className="form-row">
              <input 
                type="text" 
                placeholder="City *" 
                required 
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})} 
              />
              <input 
                type="text" 
                placeholder="Region / Province *" 
                required 
                value={formData.region} 
                onChange={(e) => setFormData({...formData, region: e.target.value})} 
              />
            </div>

            <div className="checkout-summary-box">
              <div className="summary-line"><span>Subtotal:</span> <span>Rs.{subtotal.toLocaleString()}</span></div>
              <div className="summary-line"><span>Shipping:</span> <span className="free-text">FREE</span></div>
              <div className="summary-line total"><span>Total Amount:</span> <span>Rs.{total.toLocaleString()}</span></div>
            </div>

            <div className="payment-method-box">
              <label>
                <input type="radio" checked readOnly /> 
                <span>Cash on Delivery (Open Parcel Inspection Allowed)</span>
              </label>
            </div>

            <button type="submit" className="place-order-btn" disabled={loading}>
              {loading ? 'Processing Order...' : `Place Order (Rs.${total.toLocaleString()})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}