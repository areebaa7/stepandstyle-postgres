'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import AccountModal, { AuthUser, AuthMode } from '@/app/components/AccountModal';
import { formatPKR } from '@/lib/currency';
import Link from 'next/link';
import Image from 'next/image';
import * as fpixel from '@/lib/fpixel';
import { DEFAULT_STOREFRONT_SETTINGS } from '@/lib/storefrontSettings';
import type { StorefrontSettingsDTO } from '@/types/storefrontSettings';

type PaymentMethod = 'cod' | 'direct';

interface PromoCodeData {
  id: string;
  code: string;
  discountPercent: number;
}


interface ShippingRegion {
  id: string;
  name: string;
  shippingCost: number;
  cities: ShippingCity[];
}

interface ShippingCity {
  id: string;
  name: string;
}

const MANUAL_REGION_OPTION = '__manual_region__';
const MANUAL_CITY_OPTION = '__manual_city__';

interface CustomerAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode?: string | null;
  isDefault: boolean;
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Mini Header */}
      <header className="border-b border-gray-100 py-3 md:py-4 px-4 md:px-10 flex justify-between items-center bg-white sticky top-0 z-[100]">
        <Link href="/" className="group flex items-center -ml-4 md:-ml-8 transition-transform hover:scale-105">
          <Image
            src="/logo_main.png"
            alt="Step & Styl"
            width={180}
            height={60}
            className="h-12 md:h-16 w-auto object-contain"
          />
          <div className="flex items-center -ml-4 md:-ml-7 gap-1">
            <span className="text-xs md:text-[13px] font-semibold  tracking-wide text-gray-900">
              Step
            </span>
            <span className="text-[12px] md:text-[15px] font-semibold  tracking-wide text-yellow-600">
              &
            </span>
            <span className="text-xs md:text-[13px] font-semibold  tracking-wide text-gray-900">
              Style
            </span>
          </div>
        </Link>
        <Link href="/products" aria-label="Continue shopping" className="text-gray-400 hover:text-purple-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </Link>
      </header>

      <CheckoutContent />
    </div>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const { items, subtotal, promoCode, clearCart } = useCart();
  const checkoutAttemptRef = useRef<{ key: string; fingerprint: string } | null>(null);
  const receiptUploadRef = useRef<{ file: File; url: string } | null>(null);

  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    apartment: '',
    city: '',
    postalCode: '',
    saveInfo: false,
    newsletters: false
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [promoInput, setPromoInput] = useState(promoCode);
  const [validatedPromo, setValidatedPromo] = useState<PromoCodeData | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<AuthUser['role'] | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState<AuthMode>('login');
  const [regions, setRegions] = useState<ShippingRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [manualRegion, setManualRegion] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [manualShippingCost, setManualShippingCost] = useState(350);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [, setIsRegionsLoading] = useState(true);
  const [conversionSettings, setConversionSettings] = useState<StorefrontSettingsDTO>(DEFAULT_STOREFRONT_SETTINGS);
  const [showBankPopup, setShowBankPopup] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setUserRole(data.user?.role ?? null);
          if (data.user?.role === 'USER') {
            const nameParts = String(data.user.name || '').trim().split(/\s+/).filter(Boolean);
            setShippingInfo((current) => ({
              ...current,
              email: current.email || data.user.email || '',
              firstName: current.firstName || nameParts[0] || '',
              lastName: current.lastName || nameParts.slice(1).join(' '),
            }));
            const addressResponse = await fetch('/api/account/addresses', { cache: 'no-store' });
            const addressPayload = await addressResponse.json();
            if (addressResponse.ok) {
              setSavedAddresses(addressPayload.addresses || []);
            }
          }
        }
      } catch {
        setUserRole(null);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadConversionSettings = async () => {
      let nextSettings = DEFAULT_STOREFRONT_SETTINGS;
      try {
        const response = await fetch('/api/storefront-settings', { cache: 'no-store' });
        const payload = await response.json();
        if (response.ok && payload.success && payload.data) nextSettings = payload.data;
      } catch (error) {
        console.warn('Unable to load checkout conversion settings', error);
      }
      setConversionSettings(nextSettings);
      setShowBankPopup(nextSettings.bankTransferPopupEnabled && nextSettings.manualPaymentAvailable);
      if (!nextSettings.manualPaymentAvailable) setPaymentMethod('cod');
    };
    loadConversionSettings();
  }, []);

  // Track InitiateCheckout event
  useEffect(() => {
    if (items.length > 0) {
      fpixel.event('InitiateCheckout', {
        value: subtotal,
        currency: 'PKR',
        num_items: items.reduce((sum, item) => sum + item.quantity, 0),
        content_ids: items.map(i => i.id)
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        setIsRegionsLoading(true);
        const response = await fetch('/api/shipping');
        const data = await response.json();
        if (response.ok) {
          setRegions(data.data || []);
          const fallbackCost = Number(data.meta?.manualShippingCost);
          if (Number.isFinite(fallbackCost) && fallbackCost >= 0) setManualShippingCost(fallbackCost);
        }
      } catch (error) { console.error('Failed to load shipping regions', error); }
      finally { setIsRegionsLoading(false); }
    };
    fetchRegions();
  }, []);

  const selectedRegion = regions.find((region) => region.id === selectedRegionId) || null;
  const selectedCity = selectedRegion?.cities.find((city) => city.id === selectedCityId) || null;
  const usesManualRegion = regions.length === 0 || selectedRegionId === MANUAL_REGION_OPTION;
  const usesManualCity = usesManualRegion || selectedCityId === MANUAL_CITY_OPTION;
  const bankPaymentAvailable = Boolean(
    conversionSettings.bankName
      && (conversionSettings.bankAccountNumber || conversionSettings.bankIban),
  );
  const easypaisaAvailable = Boolean(conversionSettings.easypaisaAccountNumber);
  const jazzcashAvailable = Boolean(conversionSettings.jazzcashAccountNumber);
  const manualPaymentLabels = [
    bankPaymentAvailable ? 'bank transfer' : '',
    easypaisaAvailable ? 'Easypaisa' : '',
    jazzcashAvailable ? 'JazzCash' : '',
  ].filter(Boolean);

  const { promoDiscount, bankDiscount, shippingCost, finalTotal } = useMemo(() => {
    const promoAmount = validatedPromo ? (subtotal * validatedPromo.discountPercent) / 100 : 0;
    const afterPromo = subtotal - promoAmount;

    let sCost = selectedRegion?.shippingCost ?? manualShippingCost;

    let bDiscount = 0;
    if (paymentMethod === 'direct') {
      bDiscount = afterPromo * (conversionSettings.bankTransferDiscountPercent / 100);
      sCost = 0; // Free delivery
    }

    return {
      promoDiscount: promoAmount,
      bankDiscount: bDiscount,
      shippingCost: sCost,
      finalTotal: Math.max(0, afterPromo - bDiscount + sCost),
    };
  }, [subtotal, validatedPromo, selectedRegion, manualShippingCost, paymentMethod, conversionSettings.bankTransferDiscountPercent]);

  const applySavedAddress = (addressId: string) => {
    const address = savedAddresses.find((entry) => entry.id === addressId);
    if (!address) return;
    const nameParts = address.fullName.trim().split(/\s+/).filter(Boolean);
    setShippingInfo((current) => ({
      ...current,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
      phone: address.phone,
      address: address.address,
      postalCode: address.postalCode || '',
    }));

    const configuredRegion = regions.find((region) => region.name.toLowerCase() === address.region.toLowerCase());
    const configuredCity = configuredRegion?.cities.find((city) => city.name.toLowerCase() === address.city.toLowerCase());
    if (configuredRegion && configuredCity) {
      setSelectedRegionId(configuredRegion.id);
      setSelectedCityId(configuredCity.id);
      setManualRegion('');
      setManualCity('');
    } else if (configuredRegion) {
      setSelectedRegionId(configuredRegion.id);
      setSelectedCityId(MANUAL_CITY_OPTION);
      setManualRegion('');
      setManualCity(address.city);
    } else {
      setSelectedRegionId(regions.length > 0 ? MANUAL_REGION_OPTION : '');
      setSelectedCityId(MANUAL_CITY_OPTION);
      setManualRegion(address.region);
      setManualCity(address.city);
    }
  };

  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return;
    try {
      const response = await fetch('/api/promo-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.code) throw new Error(data.error || 'Invalid code');
      setValidatedPromo(data.code);
      setPromoError(null);
    } catch (error) {
      setValidatedPromo(null);
      setPromoError(error instanceof Error ? error.message : 'Error');
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const validateStoredPromo = async () => {
      const storedCode = promoCode.trim();
      setPromoInput(storedCode);
      if (!storedCode) {
        setValidatedPromo(null);
        setPromoError(null);
        return;
      }

      try {
        const response = await fetch('/api/promo-codes/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: storedCode }),
        });
        const data = await response.json();
        if (!response.ok || !data.code) throw new Error(data.error || 'Invalid code');
        if (!isCancelled) {
          setValidatedPromo(data.code);
          setPromoError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setValidatedPromo(null);
          setPromoError(error instanceof Error ? error.message : 'Invalid code');
        }
      }
    };

    validateStoredPromo();
    return () => {
      isCancelled = true;
    };
  }, [promoCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || isSubmitting) return;

    if (paymentMethod === 'direct' && !receiptImage) {
      setStatusMessage('Please upload a screenshot of your payment receipt.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      let receiptUrl = null;
      if (paymentMethod === 'direct' && receiptImage) {
        if (receiptUploadRef.current?.file === receiptImage) {
          receiptUrl = receiptUploadRef.current.url;
        } else {
          const formData = new FormData();
          formData.append('file', receiptImage);
          const uploadRes = await fetch('/api/uploads/receipt', {
            method: 'POST',
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData.success) {
            throw new Error(uploadData.error || 'Failed to upload receipt.');
          }
          receiptUrl = uploadData.url;
          receiptUploadRef.current = { file: receiptImage, url: receiptUrl };
        }
      } else {
        receiptUploadRef.current = null;
      }

      const orderRequest = {
        items,
        shippingAddress: { ...shippingInfo, fullName: `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim() },
        shippingMode: usesManualCity ? 'manual' : 'configured',
        shippingRegionId: selectedRegion?.id ?? null,
        shippingCityId: selectedCity?.id ?? null,
        shippingRegion: selectedRegion?.name || manualRegion.trim(),
        shippingCity: selectedCity?.name || manualCity.trim(),
        paymentMethod,
        receiptUrl,
        promoCodeId: validatedPromo?.id ?? null,
      };
      const fingerprint = JSON.stringify(orderRequest);
      if (checkoutAttemptRef.current?.fingerprint !== fingerprint) {
        checkoutAttemptRef.current = { key: crypto.randomUUID(), fingerprint };
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': checkoutAttemptRef.current.key,
        },
        body: fingerprint,
      });
      const orderData = await response.json();
      if (!response.ok || !orderData.success) {
        if (response.status < 500 && orderData.code !== 'IDEMPOTENCY_IN_PROGRESS') {
          checkoutAttemptRef.current = null;
        }
        throw new Error(orderData.error || 'Failed to create order.');
      }

      const orderId = typeof orderData.data?.orderId === 'string'
        ? orderData.data.orderId.trim()
        : '';
      if (!orderId) {
        throw new Error('Your order was created, but its reference could not be loaded. Please check your email for confirmation.');
      }

      const conversionToken = typeof orderData.data?.conversionToken === 'string' ? orderData.data.conversionToken : '';
      if (!conversionToken) throw new Error('Your order was created, but secure conversion confirmation could not be loaded.');

      const successParams = new URLSearchParams({ orderId, claim: conversionToken });
      checkoutAttemptRef.current = null;
      receiptUploadRef.current = null;
      clearCart();
      router.push(`/order-success?${successParams.toString()}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Error');
    } finally { setIsSubmitting(false); }
  };

  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-90px)] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-950">Your cart is empty</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">Add a product before continuing to checkout.</p>
        <Link
          href="/products"
          className="mt-7 rounded-lg bg-purple-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-800"
        >
          Continue shopping
        </Link>
      </main>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col lg:grid lg:grid-cols-[1.2fr_0.8fr] min-h-[calc(100vh-80px)]">
      {/* Left Column: Form */}
      <div className="p-4 sm:p-8 lg:p-20 lg:pr-10">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-12">
          <h1 className="sr-only">Checkout</h1>

          {/* Contact Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-xl font-medium tracking-tight">Contact</h2>
              {!userRole && (
                <button
                  type="button"
                  className="text-sm text-purple-600 underline font-medium"
                  onClick={() => {
                    setAccountModalMode('login');
                    setIsAccountModalOpen(true);
                  }}
                >
                  Sign in
                </button>
              )}
            </div>
            <input
              type="email" required placeholder="Email"
              value={shippingInfo.email}
              onChange={(e) => setShippingInfo(p => ({ ...p, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-600 transition-all"
            />
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox" checked={shippingInfo.newsletters}
                onChange={(e) => setShippingInfo(p => ({ ...p, newsletters: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                I agree to receive marketing emails and offers. I can unsubscribe at any time.{' '}
                <Link href="/privacy-policy" className="font-semibold text-purple-700 underline">Privacy policy</Link>
              </span>
            </label>
          </section>

          {/* Delivery Section */}
          <section className="space-y-6">
            <h2 className="text-xl font-medium tracking-tight">Delivery</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedAddresses.length > 0 && (
                <div className="md:col-span-2">
                  <select
                    aria-label="Use a saved address"
                    defaultValue=""
                    onChange={(event) => applySavedAddress(event.target.value)}
                    className="w-full rounded-lg border border-purple-200 bg-purple-50 px-4 py-3.5 outline-none focus:border-purple-600"
                  >
                    <option value="">Use a saved address</option>
                    {savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.label}{address.isDefault ? ' (Default)' : ''} — {address.city}</option>)}
                  </select>
                </div>
              )}
              {/* Region and city */}
              <div className="md:col-span-2 space-y-4">
                {regions.length > 0 ? (
                  <>
                    <select
                      aria-label="Region or province"
                      required value={selectedRegionId}
                      onChange={(e) => {
                        const nextRegionId = e.target.value;
                        setSelectedRegionId(nextRegionId);
                        setSelectedCityId(nextRegionId === MANUAL_REGION_OPTION ? MANUAL_CITY_OPTION : '');
                        if (nextRegionId !== MANUAL_REGION_OPTION) setManualRegion('');
                        setManualCity('');
                      }}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3.5 bg-white outline-none focus:border-purple-600"
                    >
                      <option value="">Select Region / Province</option>
                      {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      <option value={MANUAL_REGION_OPTION}>Other region / province</option>
                    </select>

                    {usesManualRegion ? (
                      <>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          placeholder="Region / Province"
                          value={manualRegion}
                          onChange={(e) => setManualRegion(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
                        />
                        <input
                          type="text"
                          required
                          maxLength={80}
                          placeholder="City"
                          value={manualCity}
                          onChange={(e) => setManualCity(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
                        />
                      </>
                    ) : (
                      <>
                        <select
                          aria-label="City"
                          required disabled={!selectedRegionId} value={selectedCityId}
                          onChange={(e) => {
                            setSelectedCityId(e.target.value);
                            if (e.target.value !== MANUAL_CITY_OPTION) setManualCity('');
                          }}
                          className="w-full border border-gray-200 rounded-lg px-4 py-3.5 bg-white outline-none focus:border-purple-600 disabled:bg-gray-50"
                        >
                          <option value="">Select city</option>
                          {selectedRegion?.cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          <option value={MANUAL_CITY_OPTION}>My city is not listed</option>
                        </select>
                        {usesManualCity && (
                          <input
                            type="text"
                            required
                            maxLength={80}
                            placeholder="Enter your city"
                            value={manualCity}
                            onChange={(e) => setManualCity(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
                          />
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      placeholder="Region / Province"
                      value={manualRegion}
                      onChange={(e) => setManualRegion(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
                    />
                    <input
                      type="text"
                      required
                      maxLength={80}
                      placeholder="City"
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
                    />
                  </>
                )}
              </div>

              <input
                type="text" required placeholder="First name"
                value={shippingInfo.firstName}
                onChange={(e) => setShippingInfo(p => ({ ...p, firstName: e.target.value }))}
                className="border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
              />
              <input
                type="text" required placeholder="Last name"
                value={shippingInfo.lastName}
                onChange={(e) => setShippingInfo(p => ({ ...p, lastName: e.target.value }))}
                className="border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
              />
              <input
                type="text" required placeholder="Address"
                value={shippingInfo.address}
                onChange={(e) => setShippingInfo(p => ({ ...p, address: e.target.value }))}
                className="md:col-span-2 border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
              />
              <input
                type="text" placeholder="Apartment, suite, etc. (optional)"
                value={shippingInfo.apartment}
                onChange={(e) => setShippingInfo(p => ({ ...p, apartment: e.target.value }))}
                className="md:col-span-2 border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
              />
              <input
                type="tel" required placeholder="Phone"
                value={shippingInfo.phone}
                onChange={(e) => setShippingInfo(p => ({ ...p, phone: e.target.value }))}
                className="md:col-span-2 border border-gray-200 rounded-lg px-4 py-3.5 outline-none focus:border-purple-600"
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-purple-600" />
                <span className="text-sm text-gray-600">Save this information for next time</span>
              </label>
            </div>
          </section>

          {/* Delivery cost Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight">Delivery cost</h2>
            <div className="border border-gray-200 rounded-xl p-5 bg-purple-50/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Standard delivery</p>
                    <p className="text-xs text-gray-400">Usually 3-5 business days</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-900">{formatPKR(shippingCost)}</span>
              </div>
            </div>
          </section>

          {/* Payment method Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight">Payment method</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <label className={`flex items-center gap-4 p-5 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500">Please have the exact amount ready.</p>
                </div>
              </label>

              {conversionSettings.manualPaymentAvailable && (
                <>
                  <div className="border-t border-gray-200"></div>

                  <label className={`flex flex-col gap-4 p-5 cursor-pointer transition-colors ${paymentMethod === 'direct' ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="direct"
                        checked={paymentMethod === 'direct'}
                        onChange={() => setPaymentMethod('direct')}
                        className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Bank / Mobile Wallet Transfer</p>
                        <p className="text-xs text-gray-500">Pay using {manualPaymentLabels.join(', ')}.</p>
                      </div>
                    </div>
                  </label>
                </>
              )}

              {paymentMethod === 'direct' && conversionSettings.manualPaymentAvailable && (
                <div className="px-5 pb-5 pt-2 sm:ml-8 space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-100 space-y-3">
                    <p className="text-sm font-bold text-gray-900">Transfer details</p>
                    <div className="grid gap-3 text-xs text-gray-600 sm:grid-cols-2">
                        <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                          <p className="font-bold text-gray-900">Meezan Bank</p>
                          <p><strong>Title:</strong> ANISA SHAHID</p>
                          <p className="break-all"><strong>Account:</strong> 9814 0112796881</p>
                          <p className="break-all"><strong>IBAN:</strong> PK66 MEZN 0098 1401 1279 6881</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 space-y-1">
                          <p className="font-bold text-gray-900">EasyPaisa / JazzCash</p>
                          <p><strong>Number:</strong> +92-332-9822592</p>
                        </div>
                      </div>
                      {conversionSettings.manualPaymentInstructions && (
                      <p className="rounded-lg border border-purple-100 bg-purple-50 p-3 text-xs leading-5 text-purple-900">
                        {conversionSettings.manualPaymentInstructions}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload payment receipt</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
                          setReceiptImage(null);
                          setStatusMessage('Receipt must be a JPG, PNG, or WebP image no larger than 5 MB.');
                          event.target.value = '';
                          return;
                        }
                        setReceiptImage(file);
                        setStatusMessage('');
                      }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP · maximum 5 MB</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Action Button */}
          <div className="pt-6">
            <button
              type="submit" disabled={isSubmitting}
              className="w-full bg-[#E91E63] text-white py-5 rounded-lg text-sm font-semibold  tracking-wide shadow-xl shadow-pink-100 hover:bg-[#D81B60] hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Processing...' : 'Complete order'}
            </button>
            {statusMessage && <p className="text-xs text-red-500 font-bold text-center mt-4">{statusMessage}</p>}
          </div>
        </form>
      </div>

      {/* Right Column: Order Summary */}
      <aside className="bg-purple-50/30 p-4 sm:p-8 lg:p-20 lg:pl-10 border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col items-center">
        <div className="w-full max-w-sm space-y-10">

          {/* Item List */}
          <div className="space-y-6">
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <div className="w-full h-full bg-white rounded-xl border border-gray-100 overflow-hidden">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                        />
                      )}
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800/90 text-white text-xs font-semibold flex items-center justify-center rounded-full border-2 border-white shadow-md z-10">
                      {item.quantity}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-gray-900  tracking-tight line-clamp-1">{item.title}</p>
                    {(item.color || item.size) && (
                      <p className="text-xs text-gray-400 font-bold  tracking-wide">{item.color} / {item.size}</p>
                    )}
                  </div>
                </div>
                <p className="text-[12px] font-semibold text-gray-900">{formatPKR(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>

          {/* Discount Section */}
          <div className="space-y-2 relative">
            <div className="flex gap-3">
              <input
                type="text" value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(null); }}
                placeholder="Discount code"
                className={`flex-1 bg-white border rounded-lg px-4 py-3 text-sm outline-none transition-colors ${promoError ? 'border-red-300 focus:border-red-400' : validatedPromo ? 'border-green-300 focus:border-green-400' : 'border-gray-200 focus:border-purple-400'}`}
              />
              <button
                type="button" onClick={handleValidatePromo}
                className="px-6 py-3 bg-purple-500 text-white text-xs font-bold  tracking-wide rounded-lg hover:bg-purple-600 hover:text-white transition-all active:scale-95"
              >
                Apply
              </button>
            </div>
            {promoError && (
              <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {promoError}
              </p>
            )}
            {validatedPromo && (
              <p className="text-xs font-bold text-green-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Code &quot;{validatedPromo.code}&quot; applied — {validatedPromo.discountPercent}% off!
              </p>
            )}
          </div>

          {/* Pricing Summary */}
          <div className="space-y-3 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center text-sm font-medium text-gray-600">
              <span>Subtotal</span>
              <span>{formatPKR(subtotal)}</span>
            </div>

            {validatedPromo && (
              <div className="flex justify-between items-center text-sm font-bold text-green-600">
                <span>Promo discount</span>
                <span>-{formatPKR(promoDiscount)}</span>
              </div>
            )}
            {bankDiscount > 0 && (
              <div className="flex justify-between items-center text-sm font-bold text-green-600">
                <span>Bank transfer ({conversionSettings.bankTransferDiscountPercent}%)</span>
                <span>-{formatPKR(bankDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-medium text-gray-600">
              <span>Shipping</span>
              <span className={shippingCost === 0 ? 'text-green-600 font-bold' : ''}>{shippingCost === 0 ? 'FREE' : formatPKR(shippingCost)}</span>
            </div>

            <div className="flex justify-between items-center pt-6 text-gray-900">
              <span className="text-xl font-semibold  tracking-tight">Total</span>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-bold  tracking-wide mr-2">PKR</span>
                <span className="text-2xl font-semibold tracking-tight">{formatPKR(finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <AccountModal
        isOpen={isAccountModalOpen}
        mode={accountModalMode}
        onClose={() => setIsAccountModalOpen(false)}
        onModeChange={setAccountModalMode}
        onAuthSuccess={(user) => {
          setUserRole(user.role);
          setShippingInfo(p => ({ ...p, email: user.email }));
        }}
      />

      {/* Encourage Bank transfer Popup */}
      {showBankPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in-95 duration-300 text-center">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold tracking-tight text-gray-900 mb-2">{conversionSettings.bankTransferPopupTitle}</h3>
            <p className="text-sm text-gray-500 mb-8 font-medium">{conversionSettings.bankTransferPopupMessage}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setPaymentMethod('direct');
                  setShowBankPopup(false);
                }}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-xs font-semibold  tracking-wide shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Continue with Manual Transfer
              </button>
              <button
                onClick={() => setShowBankPopup(false)}
                className="w-full py-3.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold  tracking-wide hover:bg-gray-100 transition-all"
              >
                Continue Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
