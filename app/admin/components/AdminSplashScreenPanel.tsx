'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import FileUpload from './FileUpload';
import { AdminLoadingState, AdminNotice } from './AdminAsyncState';

interface SplashSettings {
  enabled: boolean;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  buttonText: string | null;
  buttonEnabled: boolean;
  dismissMode: string | null;
  durationSeconds: number | null;
}

const DEFAULT_SETTINGS: SplashSettings = {
  enabled: false,
  title: 'Step & Styl',
  subtitle: 'Premium footwear for the modern individual.',
  imageUrl: '/logo_main.png',
  backgroundColor: '#A855F7',
  textColor: '#FFFFFF',
  buttonText: 'Enter Site',
  buttonEnabled: true,
  dismissMode: 'AUTO',
  durationSeconds: 3,
};

const COLOR_PRESETS = ['#A855F7', '#6B21A8', '#0F172A', '#7C3AED', '#DB2777', '#0EA5E9', '#111111', '#FFFFFF'];

export default function AdminSplashScreenPanel() {
  const [settings, setSettings] = useState<SplashSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings/splash', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to load splash screen settings.');
        setSettings({ ...DEFAULT_SETTINGS, ...payload.data });
      } catch (error) {
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load splash screen settings.' });
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setMessage(null);
      const response = await fetch('/api/admin/settings/splash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Failed to save splash screen settings.');
      setSettings({ ...DEFAULT_SETTINGS, ...payload.data });
      setMessage({ type: 'success', text: 'Splash screen settings saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save splash screen settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const update = <K extends keyof SplashSettings>(key: K, value: SplashSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  if (isLoading) return <AdminLoadingState label="Loading splash screen settings..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-600">Storefront intro</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">Splash Screen</h2>
          <p className="mt-1 text-sm text-gray-500">
            A full-screen intro shown once per visit when the website loads. Visitors can tap anywhere or use the button to enter the store.
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 cursor-pointer">
          <span className="text-sm font-bold text-purple-900">Enable splash screen</span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => update('enabled', event.target.checked)}
            className="h-5 w-5 rounded accent-purple-600"
          />
        </label>
      </div>

      {message && <AdminNotice type={message.type} message={message.text} />}

      <form onSubmit={saveSettings} className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Content</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Title</label>
                <input
                  type="text"
                  value={settings.title || ''}
                  onChange={(event) => update('title', event.target.value)}
                  placeholder="e.g. Step & Styl"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Subtitle / Tagline</label>
                <textarea
                  value={settings.subtitle || ''}
                  onChange={(event) => update('subtitle', event.target.value)}
                  placeholder="e.g. Premium footwear for the modern individual."
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Logo / Image</label>
                <FileUpload
                  value={settings.imageUrl || ''}
                  onChange={(url) => update('imageUrl', url)}
                  accept="image"
                  label="Splash image"
                  placeholder="Upload a logo or brand image"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Appearance</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Background color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.backgroundColor || '#A855F7'}
                    onChange={(event) => update('backgroundColor', event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200"
                  />
                  <input
                    type="text"
                    value={settings.backgroundColor || ''}
                    onChange={(event) => update('backgroundColor', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update('backgroundColor', color)}
                      className={`h-7 w-7 rounded-full border-2 transition ${settings.backgroundColor === color ? 'border-gray-900 scale-110' : 'border-white shadow'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Set background to ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Text color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.textColor || '#FFFFFF'}
                    onChange={(event) => update('textColor', event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-gray-200"
                  />
                  <input
                    type="text"
                    value={settings.textColor || ''}
                    onChange={(event) => update('textColor', event.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Behavior</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Dismiss mode</label>
                <select
                  value={settings.dismissMode || 'AUTO'}
                  onChange={(event) => update('dismissMode', event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-500"
                >
                  <option value="AUTO">Auto dismiss after duration</option>
                  <option value="BUTTON">Wait for tap / button click</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Duration (seconds, 1–15)</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={settings.durationSeconds || 3}
                  onChange={(event) => update('durationSeconds', Number(event.target.value))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <label className="mt-5 flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.buttonEnabled}
                onChange={(event) => update('buttonEnabled', event.target.checked)}
                className="h-5 w-5 rounded accent-purple-600"
              />
              <span className="text-sm font-semibold text-gray-700">Show enter button</span>
            </label>
            {settings.buttonEnabled && (
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Button text</label>
                <input
                  type="text"
                  value={settings.buttonText || ''}
                  onChange={(event) => update('buttonText', event.target.value)}
                  placeholder="e.g. Enter Site"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-purple-600 px-8 py-3 text-sm font-bold text-white shadow-md shadow-purple-200 transition hover:bg-purple-500 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="lg:sticky lg:top-24 self-start">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-purple-600">Live preview</p>
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
              style={{ backgroundColor: settings.backgroundColor || '#A855F7' }}
            >
              {settings.imageUrl && (
                <div className="relative w-24 h-24 mb-5">
                  <Image
                    src={settings.imageUrl}
                    alt=""
                    fill
                    className="object-contain drop-shadow-xl"
                    unoptimized={!settings.imageUrl.startsWith('/')}
                   sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                </div>
              )}
              {settings.title && (
                <h4 className="text-2xl font-black tracking-tight" style={{ color: settings.textColor || '#FFFFFF' }}>
                  {settings.title}
                </h4>
              )}
              {settings.subtitle && (
                <p className="mt-2 text-xs font-medium leading-relaxed" style={{ color: settings.textColor || '#FFFFFF', opacity: 0.85 }}>
                  {settings.subtitle}
                </p>
              )}
              {settings.buttonEnabled && (
                <span
                  className="mt-6 rounded-full px-6 py-2.5 text-xs font-bold shadow-lg"
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
          <p className="mt-3 text-xs text-gray-500">
            The splash screen appears once per browser session on the storefront, before the site content is visible.
          </p>
        </div>
      </form>
    </div>
  );
}
