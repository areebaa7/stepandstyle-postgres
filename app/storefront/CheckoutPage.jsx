'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, ShieldCheck, Truck } from 'lucide-react';
import './CheckoutPage.css';

const regionsList = [
  'Azad Jammu and Kashmir',
  'Balochistan',
  'Gilgit Baltistan',
  'Islamabad Capital Territory',
  'KPK',
  'Punjab',
  'Sindh',
];

/**
 * @param {{ cartItems: any[], setCurrentPage: Function, onOrderSuccess: Function }} props
 */
export default function CheckoutPage({ cartItems = [], setCurrentPage, onOrderSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    region: 'Punjab',
    postalCode: '',
    saveInfo: false,
    paymentMethod: 'COD', // 'COD' or 'ONLINE'
    receiptUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  // Dynamic cart calculations
  const subtotal = cartItems.reduce((acc, item) => {
    const cleanPrice = Number(item.price) || 0;
    return acc + cleanPrice * (Number(item.quantity) || 1);
  }, 0);

  const shippingCost = 350.00; // Standard Delivery fee
  const total = subtotal + shippingCost;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');
    
    if (cartItems.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (formData.paymentMethod === 'ONLINE' && !formData.receiptUrl) {
      setError('Please upload your payment receipt to continue.');
      return;
    }

    setLoading(true);

    try {
      const idempotencyKey = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.random().toString(36).substring(2, 9)}`;

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          shippingAddress: {
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            postalCode: formData.postalCode,
            newsletters: formData.saveInfo,
          },
          shippingRegion: formData.region,
          shippingCity: formData.city,
          paymentMethod: formData.paymentMethod === 'ONLINE' ? 'direct' : 'cod',
          receiptUrl: formData.paymentMethod === 'ONLINE' ? formData.receiptUrl : undefined,
          items: cartItems.map(item => ({
            id: String(item.id || item.productId || ''),
            name: item.title || item.name || 'Product',
            price: Number(String(item.price).replace(/[^0-9.]/g, '')),
            quantity: Math.min(100, Math.max(1, parseInt(item.quantity, 10) || 1)),
            size: item.selectedSize || item.size || null,
            color: item.selectedColor || item.color || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order. Please verify your details.');
      }

      setSuccessOrder(data.data || data.order || { id: 'SUCCESS' });
      if (onOrderSuccess) onOrderSuccess(data.data || data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingReceipt(true);
    setError('');
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/uploads/receipt', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload receipt');
      }
      setFormData(prev => ({ ...prev, receiptUrl: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingReceipt(false);
    }
  };

  if (successOrder) {
    return (
      <div className="checkout-page-container success-state">
        <motion.div 
          className="order-success-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle size={64} className="success-icon" />
          <h1>Thank you for your order!</h1>
          <p>Your order has been placed successfully.</p>
          <div className="success-actions">
            <button className="btn-return-home" onClick={() => setCurrentPage('home')}>
              Continue Shopping
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <div className="checkout-header-nav">
        <button className="back-to-shop-btn" onClick={() => setCurrentPage('shop')}>
          <ArrowLeft size={16} /> Return to cart
        </button>
        <span className="checkout-brand-title">Step &amp; Styl Secure Checkout</span>
      </div>

      <div className="checkout-content-grid">
        {/* Left Column: Shipping & Payment Form */}
        <div className="checkout-form-column">
          <form onSubmit={handleSubmitOrder} className="dedicated-checkout-form">
            
            {error && <div className="checkout-alert-error">{error}</div>}

            {/* Contact Section */}
            <div className="checkout-section-block">
              <div className="block-title-row">
                <h3>Contact</h3>
                <span className="signin-link" onClick={() => setCurrentPage('home')}>Sign in</span>
              </div>
              <input 
                type="email" 
                placeholder="Email address (for tracking & updates)" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
              <label className="checkbox-news-label">
                <input type="checkbox" defaultChecked /> Email me with news and offers
              </label>
            </div>

            {/* Delivery Section */}
            <div className="checkout-section-block">
              <h3>Delivery</h3>
              
              <div className="form-group-full">
                <label>Select Region / Province</label>
                <select 
                  value={formData.region}
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                  required
                >
                  {regionsList.map((reg) => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div className="form-row-grid">
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
                placeholder="Street Address, Apartment, Suite, etc. *" 
                required 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />

              <div className="form-row-grid triplet">
                <input 
                  type="text" 
                  placeholder="City *" 
                  required 
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Postal Code (Optional)" 
                  value={formData.postalCode}
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                />
              </div>

              <label className="checkbox-news-label">
                <input 
                  type="checkbox" 
                  checked={formData.saveInfo}
                  onChange={(e) => setFormData({...formData, saveInfo: e.target.checked})}
                /> Save this information for next time
              </label>
            </div>

            {/* Delivery Cost Method */}
            <div className="checkout-section-block">
              <h3>Delivery Cost</h3>
              <div className="delivery-method-card selected">
                <div className="method-info">
                  <Truck size={20} />
                  <div>
                    <strong>Standard Delivery</strong>
                    <p>Usually 3-5 business days (Open Parcel Inspection)</p>
                  </div>
                </div>
                <span className="method-price">Rs.350.00</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="checkout-section-block">
              <h3>Payment Method</h3>
              <p className="payment-secure-note">All transactions are secure and encrypted.</p>
              
              <div className="payment-options-group">
                <label className={`payment-option-card ${formData.paymentMethod === 'COD' ? 'active' : ''}`}>
                  <div className="radio-flex">
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={formData.paymentMethod === 'COD'}
                      onChange={() => setFormData({...formData, paymentMethod: 'COD'})}
                    />
                    <span>Cash on Delivery</span>
                  </div>
                  <p className="payment-subtext">Please have the exact amount ready. Open parcel check allowed before paying.</p>
                </label>

                <label className={`payment-option-card ${formData.paymentMethod === 'ONLINE' ? 'active' : ''}`}>
                  <div className="radio-flex">
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={formData.paymentMethod === 'ONLINE'}
                      onChange={() => setFormData({...formData, paymentMethod: 'ONLINE'})}
                    />
                    <span>Online Payment (Bank Transfer / Easy Paisa / Jazz Cash)</span>
                  </div>
                  
                  {formData.paymentMethod === 'ONLINE' && (
                    <div className="manual-payment-details">
                      <div className="bank-info-box">
                        <h4>Meezan Bank</h4>
                        <p><strong>Title:</strong> ANISA SHAHID</p>
                        <p><strong>Account No:</strong> 9814 0112796881</p>
                        <p><strong>IBAN:</strong> PK66 MEZN 0098 1401 1279 6881</p>
                        <hr />
                        <h4>EasyPaisa / JazzCash</h4>
                        <p><strong>Number:</strong> +92-332-9822592</p>
                      </div>

                      <div className="receipt-upload-box">
                        <p className="upload-label">Upload Payment Receipt *</p>
                        <input 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp" 
                          onChange={handleReceiptUpload} 
                          disabled={uploadingReceipt}
                        />
                        {uploadingReceipt && <span className="uploading-text">Uploading...</span>}
                        {formData.receiptUrl && <div className="upload-success">✓ Receipt uploaded successfully!</div>}
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <button type="submit" className="complete-order-btn" disabled={loading}>
              {loading ? 'Processing Order...' : 'Complete Order'}
            </button>
          </form>
        </div>

        {/* Right Column: Dynamic Cart Summary Sidebar */}
        <div className="checkout-summary-column">
          <div className="summary-sticky-box">
            <h3>Order Summary ({cartItems.length} items)</h3>
            
            <div className="summary-items-scroll">
              {cartItems.map((item, idx) => {
                const itemSize = item.selectedSize || item.size;
                const itemColor = item.selectedColor || item.color;
                return (
                  <div key={idx} className="summary-item-row">
                    <div className="item-img-wrap">
                      <img src={item.image} alt={item.title || item.name} />
                      <span className="item-qty-badge">{item.quantity || 1}</span>
                    </div>
                    <div className="item-details-wrap">
                      <h4>{item.title || item.name}</h4>
                      <p>
                        {itemSize ? `Size: ${itemSize}` : ''} 
                        {itemSize && itemColor ? ' | ' : ''}
                        {itemColor ? `Color` : ''}
                      </p>
                    </div>
                    <span className="item-total-price">
                      Rs.{((Number(item.price) || 0) * (item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="summary-totals-breakdown">
              <div className="line"><span>Subtotal</span> <span>Rs.{subtotal.toLocaleString()}</span></div>
              <div className="line"><span>Shipping</span> <span>Rs.{shippingCost.toLocaleString()}</span></div>
              <div className="line total-row"><span>Total</span> <span className="grand-total">Rs.{total.toLocaleString()}</span></div>
            </div>

            <div className="checkout-trust-badge">
              <ShieldCheck size={18} />
              <span>Secure 256-Bit Encrypted Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}