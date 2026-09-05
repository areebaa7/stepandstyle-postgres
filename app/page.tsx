/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/app/context/CartContext';
import { AnimatePresence } from 'framer-motion';
import Navbar from './storefront/Navbar';
import SplashScreen from './storefront/SplashScreen';
import Hero from './storefront/Hero';
import NewArrivals from './storefront/NewArrivals';
import ForHerForHim from './storefront/ForHerForHim';
import BestSellers from './storefront/BestSellers';
import DiscoverMore from './storefront/DiscoverMore';
import CustomerReviews from './storefront/CustomerReviews';
import AffiliateSection from './storefront/AffiliateSection';
import AffiliatePage from './storefront/AffiliatePage';
import ShopPage from './storefront/ShopPage';
import WomenShopPage from './storefront/WomenShopPage';
import MenShopPage from './storefront/MenShopPage';
import KidsShopPage from './storefront/KidsShopPage';
import CheckoutPage from './storefront/CheckoutPage'; 
import Footer from './storefront/Footer';
import CartDrawer from './storefront/CartDrawer';
import AuthModal from './storefront/AuthModal';
import WhatsAppButton from './components/WhatsAppButton'; 
import ShippingDeliveryPage from './storefront/ShippingDeliveryPage';
import ReturnsExchangesPage from './storefront/ReturnsExchangesPage';

export default function Home() {
  const [currentPage, setCurrentPage] = useState('home');
  const [showSplash, setShowSplash] = useState(true);
  
  // Global Cart State
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, isCartOpen, setIsCartOpen } = useCart();

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'signup'>('login');

  const handleOpenAuthModal = (tab: 'login' | 'signup' = 'login') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleAddToCart = (productWithSpecs: any) => {
    addItem({
      id: productWithSpecs.id,
      title: productWithSpecs.title,
      price: productWithSpecs.price,
      image: productWithSpecs.image || productWithSpecs.images?.[0] || '',
      size: productWithSpecs.size || productWithSpecs.selectedSize || undefined,
      color: productWithSpecs.color || productWithSpecs.selectedColor || undefined
    }, productWithSpecs.quantity || 1);
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const item = cartItems[index];
    if (item) {
      updateQuantity(item.id, newQty, item.size, item.color);
    }
  };

  const handleRemoveItem = (index: number) => {
    const item = cartItems[index];
    if (item) {
      removeItem(item.id, item.size, item.color);
    }
  };

  useEffect(() => {
    const splashSeen = sessionStorage.getItem('splashSeen');
    if (splashSeen) setShowSplash(false);
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
    sessionStorage.setItem('splashSeen', 'true');
  };

  return (
    <div className="relative overflow-x-hidden font-sans">
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>

      <Navbar 
        setCurrentPage={setCurrentPage} 
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} 
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
      />

      <main className="flex flex-col">
        {currentPage === 'home' ? (
          <>
            <Hero setCurrentPage={setCurrentPage} />
            <div id="new-arrivals-section">
              <NewArrivals setCurrentPage={setCurrentPage} />
            </div>
            <ForHerForHim setCurrentPage={setCurrentPage} />
            <div id="best-sellers-section">
              <BestSellers setCurrentPage={setCurrentPage} />
            </div>
            <DiscoverMore setCurrentPage={setCurrentPage} />
            <AffiliateSection setCurrentPage={setCurrentPage} />
            <CustomerReviews />
          </>
        ) : currentPage === 'shop' ? (
          <ShopPage setCurrentPage={setCurrentPage} onAddToCart={handleAddToCart} />
        ) : currentPage === 'women' ? (
          <WomenShopPage onAddToCart={handleAddToCart} />
        ) : currentPage === 'men' ? (
          <MenShopPage onAddToCart={handleAddToCart} />
        ) : currentPage === 'kids' ? (
          <KidsShopPage onAddToCart={handleAddToCart} />
        ) : currentPage === 'checkout' ? (
          <CheckoutPage 
            cartItems={cartItems} 
            setCurrentPage={setCurrentPage} 
            onOrderSuccess={() => {
              clearCart(); 
            }}
          />
        ) : currentPage === 'affiliate' ? (
          <AffiliatePage />
        ) : currentPage === 'shipping-delivery' ? (
          <ShippingDeliveryPage setCurrentPage={setCurrentPage} />
        ) : currentPage === 'returns-exchanges' ? (
          <ReturnsExchangesPage setCurrentPage={setCurrentPage} />
        ) : (
          <div className="dynamic-page-view px-6 py-20 text-center">
            <h1 className="text-3xl font-bold">{currentPage.toUpperCase()} COLLECTION</h1>
            <p className="mt-2 text-gray-600">Explore premium luxury items curated for {currentPage}.</p>
            <button className="mt-6 rounded-full bg-black px-6 py-2.5 text-white" onClick={() => setCurrentPage('home')}>
              Back to Home
            </button>
          </div>
        )}
      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        setCurrentPage={setCurrentPage}
      />

      {/* Authentication Modal (Login / Sign Up) */}
      <AuthModal 
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />

      {/* Floating WhatsApp Button added directly to the page view layer */}
      <WhatsAppButton />

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}