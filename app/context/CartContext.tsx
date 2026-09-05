'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AUTH_STATE_EVENT, type AuthState } from '@/lib/authState.client';
import { useBusinessContactSettings } from '@/app/context/BusinessContactContext';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image?: string;
  quantity: number;
  size?: string;
    color?: string;
  
}

interface CartContextValue {
  items: CartItem[];
  totalCount: number;
  subtotal: number;
  promoCode: string;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (id: string, size?: string, color?: string) => void;
  updateQuantity: (id: string, quantity: number, size?: string, color?: string) => void;
  clearCart: () => void;
  applyPromoCode: (code: string) => void;
}

type StoredCart = { items: CartItem[]; promoCode: string; promoAppliedAt: string | null };

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_KEY = 'stepstyle-cart';

function itemKey(item: Pick<CartItem, 'id' | 'size' | 'color'>) {
  return `${item.id}::${item.size ?? ''}::${item.color ?? ''}`;
}

function mergeCartItems(accountItems: CartItem[], guestItems: CartItem[]) {
  const merged = new Map<string, CartItem>();

  for (const item of [...accountItems, ...guestItems]) {
    const key = itemKey(item);
    const existing = merged.get(key);
    merged.set(key, existing
      ? { ...existing, ...item, quantity: Math.max(existing.quantity, item.quantity) }
      : item);
  }

  return Array.from(merged.values());
}

function readGuestCart(): StoredCart {
  if (typeof window === 'undefined') return { items: [], promoCode: '', promoAppliedAt: null };

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return { items: [], promoCode: '', promoAppliedAt: null };
    const parsed = JSON.parse(stored) as Partial<StoredCart>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      promoCode: typeof parsed.promoCode === 'string' ? parsed.promoCode : '',
      promoAppliedAt: typeof parsed.promoAppliedAt === 'string' ? parsed.promoAppliedAt : null,
    };
  } catch (error) {
    console.warn('Failed to load cart from storage', error);
    return { items: [], promoCode: '', promoAppliedAt: null };
  }
}

function currentReferral(code: string, appliedAt: string | null, attributionDays: number) {
  if (!code) return { promoCode: '', promoAppliedAt: null };
  const fallbackAppliedAt = new Date().toISOString();
  const normalizedAppliedAt = appliedAt && !Number.isNaN(Date.parse(appliedAt)) ? appliedAt : fallbackAppliedAt;
  const expiresAt = Date.parse(normalizedAppliedAt) + attributionDays * 24 * 60 * 60 * 1000;
  return expiresAt > Date.now()
    ? { promoCode: code, promoAppliedAt: normalizedAppliedAt }
    : { promoCode: '', promoAppliedAt: null };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { affiliateProgram } = useBusinessContactSettings();
  const [items, setItems] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoAppliedAt, setPromoAppliedAt] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasLoadedCart, setHasLoadedCart] = useState(false);
  const [canTrackAbandonedCart, setCanTrackAbandonedCart] = useState(false);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [isSyncReady, setIsSyncReady] = useState(false);
  const itemsRef = useRef<CartItem[]>([]);
  const promoCodeRef = useRef('');
  const promoAppliedAtRef = useRef<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
    promoCodeRef.current = promoCode;
    promoAppliedAtRef.current = promoAppliedAt;
  }, [items, promoCode, promoAppliedAt]);

  const synchronizeCart = useCallback(async (guestCart: StoredCart) => {
    setIsSyncReady(false);

    try {
      const authResponse = await fetch('/api/auth/me', { cache: 'no-store' });
      const authPayload = await authResponse.json();
      const user = authResponse.ok ? authPayload.user : null;

      if (!user || user.role === 'ADMIN') {
        setSyncedUserId(null);
        setCanTrackAbandonedCart(false);
        setItems(guestCart.items);
        const referral = currentReferral(guestCart.promoCode, guestCart.promoAppliedAt, affiliateProgram.attributionDays);
        setPromoCode(referral.promoCode);
        setPromoAppliedAt(referral.promoAppliedAt);
        setIsSyncReady(true);
        return;
      }

      const cartResponse = await fetch('/api/cart', { cache: 'no-store' });
      const cartPayload = await cartResponse.json();
      if (!cartResponse.ok || !cartPayload.success) {
        throw new Error(cartPayload.error || 'Unable to load synced cart.');
      }

      const accountItems = Array.isArray(cartPayload.data?.items) ? cartPayload.data.items : [];
      const mergedItems = mergeCartItems(accountItems, guestCart.items);
      const guestReferral = currentReferral(guestCart.promoCode, guestCart.promoAppliedAt, affiliateProgram.attributionDays);
      const accountReferral = currentReferral(cartPayload.data?.promoCode || '', cartPayload.data?.promoAppliedAt || cartPayload.data?.updatedAt || null, affiliateProgram.attributionDays);
      const mergedReferral = guestReferral.promoCode ? guestReferral : accountReferral;

      setSyncedUserId(user.id);
      setCanTrackAbandonedCart(true);
      setItems(mergedItems);
      setPromoCode(mergedReferral.promoCode);
      setPromoAppliedAt(mergedReferral.promoAppliedAt);
      window.localStorage.removeItem(CART_STORAGE_KEY);
      setIsSyncReady(true);
    } catch (error) {
      console.warn('Unable to synchronize customer cart', error);
      setSyncedUserId(null);
      setCanTrackAbandonedCart(false);
      setItems(guestCart.items);
      const referral = currentReferral(guestCart.promoCode, guestCart.promoAppliedAt, affiliateProgram.attributionDays);
      setPromoCode(referral.promoCode);
      setPromoAppliedAt(referral.promoAppliedAt);
      setIsSyncReady(true);
    } finally {
      setHasLoadedCart(true);
    }
  }, [affiliateProgram.attributionDays]);

  useEffect(() => {
    const guestCart = readGuestCart();
    const initializationTimer = window.setTimeout(() => synchronizeCart(guestCart), 0);

    const handleAuthState = (event: Event) => {
      const state = (event as CustomEvent<AuthState>).detail;
      if (state === 'signed-out') {
        setSyncedUserId(null);
        setCanTrackAbandonedCart(false);
        setItems([]);
        setPromoCode('');
        setPromoAppliedAt(null);
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: [], promoCode: '', promoAppliedAt: null }));
        setIsSyncReady(true);
        return;
      }

      synchronizeCart({ items: itemsRef.current, promoCode: promoCodeRef.current, promoAppliedAt: promoAppliedAtRef.current });
    };

    window.addEventListener(AUTH_STATE_EVENT, handleAuthState);
    return () => {
      window.clearTimeout(initializationTimer);
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthState);
    };
  }, [synchronizeCart]);

  useEffect(() => {
    if (!isSyncReady) return;

    if (!syncedUserId) {
      try {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, promoCode, promoAppliedAt }));
      } catch (error) {
        console.warn('Failed to persist cart to storage', error);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      fetch('/api/cart', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, promoCode, promoAppliedAt }),
        keepalive: true,
      }).catch((error) => console.warn('Unable to save customer cart', error));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [isSyncReady, items, promoAppliedAt, promoCode, syncedUserId]);

  const totalCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.price, 0), [items]);

  useEffect(() => {
    if (!hasLoadedCart || !canTrackAbandonedCart) return;
    const timer = window.setTimeout(() => {
      fetch('/api/marketing/abandoned-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, subtotal }),
        keepalive: true,
      }).catch((error) => console.warn('Unable to save cart recovery state', error));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [canTrackAbandonedCart, hasLoadedCart, items, subtotal]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    setItems((previous) => {
      const existingIndex = previous.findIndex((entry) => itemKey(entry) === itemKey(item));
      if (existingIndex === -1) return [...previous, { ...item, quantity }];

      const next = [...previous];
      next[existingIndex] = {
        ...next[existingIndex],
        quantity: next[existingIndex].quantity + quantity,
      };
      return next;
    });
  };

  const removeItem = (id: string, size?: string, color?: string) => {
    const key = itemKey({ id, size, color });
    setItems((previous) => previous.filter((item) => itemKey(item) !== key));
  };

  const updateQuantity = (id: string, quantity: number, size?: string, color?: string) => {
    const key = itemKey({ id, size, color });
    const safeQuantity = Math.max(1, quantity);
    setItems((previous) => previous.map((item) => itemKey(item) === key ? { ...item, quantity: safeQuantity } : item));
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode('');
    setPromoAppliedAt(null);
  };

  const applyPromoCode = (code: string) => {
    setPromoCode(code.toUpperCase());
    setPromoAppliedAt(new Date().toISOString());
  };

  return (
    <CartContext.Provider value={{
      items,
      totalCount,
      subtotal,
      promoCode,
      isCartOpen,
      setIsCartOpen,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      applyPromoCode,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
