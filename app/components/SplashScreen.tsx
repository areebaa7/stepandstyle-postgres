'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface SplashData {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonText?: string;
  buttonEnabled?: boolean;
  dismissMode?: string;
  durationSeconds?: number;
}

const SESSION_KEY = 'step_styl_splash_seen';

export default function SplashScreen() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<SplashData | null>(null);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/splash-settings', { cache: 'no-store' });
        const payload = await response.json();
        if (response.ok && payload.success && payload.data?.enabled) {
          setSettings(payload.data);
        }
      } catch (error) {
        console.warn('Unable to load splash screen settings', error);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!settings) return;
    if (pathname?.startsWith('/admin')) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) return;

    setVisible(true);
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [settings, pathname]);

  useEffect(() => {
    if (!visible || !settings || settings.dismissMode === 'BUTTON') return;
    const duration = Math.min(Math.max(Number(settings.durationSeconds) || 3, 1), 15) * 1000;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, settings]);

  const dismiss = () => {
    if (leaving) return;
    setLeaving(true);
    document.body.style.overflow = '';
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setTimeout(() => setVisible(false), 500);
  };

  if (!settings || !visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer ${leaving ? 'splash-fade-out' : 'splash-fade-in'}`}
      style={{ backgroundColor: settings.backgroundColor || '#A855F7' }}
      onClick={dismiss}
      aria-label="Welcome splash screen"
      role="button"
    >
      <div className="flex flex-col items-center text-center px-6 max-w-xl">
        {settings.imageUrl && (
          <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 splash-pop">
            <Image
              src={settings.imageUrl}
              alt=""
              fill
              priority
              className="object-contain drop-shadow-2xl"
              unoptimized={!settings.imageUrl.startsWith('/')}
             sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
          </div>
        )}
        {settings.title && (
          <h1
            className="text-3xl md:text-5xl font-black tracking-tight mb-3 splash-pop"
            style={{ color: settings.textColor || '#FFFFFF' }}
          >
            {settings.title}
          </h1>
        )}
        {settings.subtitle && (
          <p
            className="text-sm md:text-base font-medium leading-relaxed mb-8 splash-pop"
            style={{ color: settings.textColor || '#FFFFFF', opacity: 0.85 }}
          >
            {settings.subtitle}
          </p>
        )}
        {settings.buttonEnabled && (
          <span
            className="inline-block rounded-full px-8 py-3 text-sm font-bold tracking-wide shadow-xl transition-transform hover:scale-105 splash-pop"
            style={{
              backgroundColor: settings.textColor || '#FFFFFF',
              color: settings.backgroundColor || '#A855F7',
            }}
          >
            {settings.buttonText || 'Enter Site'}
          </span>
        )}
      </div>
    </div>
  );
}
