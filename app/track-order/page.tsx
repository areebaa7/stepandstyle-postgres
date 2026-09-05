'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { Package, Search, CheckCircle2, Clock, Truck, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState<any>(null);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !identifier.trim()) {
      setError('Please enter both your Order ID and Email/Phone Number.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setOrderData(null);

      const res = await fetch(
        `/api/orders/track?orderId=${encodeURIComponent(orderId.trim())}&identifier=${encodeURIComponent(identifier.trim())}`
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to find order.');
      }

      setOrderData(data.order);
    } catch (err: any) {
      setError(err.message || 'Could not find an order matching these details.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Order Placed', desc: 'Received & verified', icon: Clock, step: 1 },
    { title: 'Payment Approved', desc: 'Confirmed by store', icon: ShieldCheck, step: 2 },
    { title: 'Order Shipped', desc: 'On its way to you', icon: Truck, step: 3 },
    { title: 'Delivered', desc: 'Arrived safely', icon: CheckCircle2, step: 4 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FF]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-[#6B21A8] text-xs font-bold uppercase tracking-widest mb-4">
            <Package className="w-4 h-4 text-[#A855F7]" />
            Live Shipment Tracker
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight uppercase">
            Track Your Order
          </h1>
          <p className="text-gray-600 text-sm md:text-base mt-3">
            Enter your Order ID along with your registered Email or Phone number to check live status and shipment updates.
          </p>
        </div>

        {/* Search Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/5 border border-purple-100 max-w-xl mx-auto mb-12">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Order ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. cmr12345..."
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#A855F7] focus:ring-2 focus:ring-purple-200 text-sm outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Email or Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. name@example.com or 03001234567"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#A855F7] focus:ring-2 focus:ring-purple-200 text-sm outline-none transition-all"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#A855F7] hover:bg-[#9333EA] text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Track Order</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Details & Status Section */}
        {orderData && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Status Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/5 border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Order Details</div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                  <span>Order #{orderData.id.slice(-8).toUpperCase()}</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Placed on {new Date(orderData.createdAt).toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Amount</div>
                  <div className="text-xl font-black text-gray-900">Rs {orderData.total.toLocaleString()}</div>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
                    orderData.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : orderData.status === 'SHIPPED'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : orderData.status === 'CANCELLED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {orderData.status}
                </span>
              </div>
            </div>

            {/* 4-Step Progress Bar */}
            {orderData.currentStep > 0 ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/5 border border-purple-100">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-8">Shipment Progress</h3>

                <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6">
                  {steps.map((step) => {
                    const isPassed = orderData.currentStep >= step.step;
                    const isCurrent = orderData.currentStep === step.step;
                    const IconComponent = step.icon;

                    return (
                      <div key={step.step} className="flex flex-col items-center text-center relative z-10">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md mb-3 ${
                            isCurrent
                              ? 'bg-[#A855F7] text-white ring-4 ring-purple-100 scale-105'
                              : isPassed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className={`text-xs font-bold ${isPassed ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{step.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-center">
                <p className="text-sm font-bold text-rose-800">This order has been cancelled.</p>
              </div>
            )}

            {/* Items Summary Table */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/5 border border-purple-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-6">Items in this Order</h3>

              <div className="divide-y divide-gray-100">
                {Array.isArray(orderData.items) &&
                  orderData.items.map((item: any, idx: number) => (
                    <div key={idx} className="py-4 flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                        {item.image || item.imageUrl ? (
                          <Image src={item.image || item.imageUrl} alt={item.name || 'Product'} fill className="object-cover"  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {item.color && <span>Color: {item.color} • </span>}
                          {item.size && <span>Size: {item.size} • </span>}
                          <span>Qty: {item.quantity || item.qty || 1}</span>
                        </div>
                      </div>

                      <div className="text-right font-black text-gray-900 text-sm">
                        Rs {((item.price || 0) * (item.quantity || item.qty || 1)).toLocaleString()}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Order Summary & Shipping Address */}
              <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50/70 p-5 rounded-2xl border border-gray-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-2">Delivery Address</div>
                  <div className="text-sm font-bold text-gray-900">{orderData.shippingName}</div>
                  <div className="text-xs text-gray-600 mt-1 leading-relaxed">{orderData.shippingAddress}</div>
                  <div className="text-xs text-gray-600 font-medium">{orderData.shippingCity}</div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-gray-900">Rs {orderData.subtotal.toLocaleString()}</span>
                  </div>
                  {orderData.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-semibold">-Rs {orderData.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping Cost:</span>
                    <span className="font-semibold text-gray-900">Rs {orderData.shippingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total Amount:</span>
                    <span className="text-[#6B21A8]">Rs {orderData.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
