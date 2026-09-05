import type { Metadata } from "next";
import { Geist_Mono, Instrument_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import WhatsAppButton from "./components/WhatsAppButton";
import MetaPixel from './components/MetaPixel';
import MarketingScripts from './components/MarketingScripts';
import NewsletterPopup from './components/NewsletterPopup';
import SplashScreen from './storefront/SplashScreen'; // <-- Updated to point to your storefront folder
import { Suspense } from 'react';
import { BusinessContactProvider } from './context/BusinessContactContext';

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.stepandstyl.com'),
  title: {
    default: "Step & Styl - Premium Footwear & Slippers",
    template: "%s | Step & Styl",
  },
  description: "Discover premium bridal heels, slippers, and footwear collections at Step & Styl. Luxury comfort and elegant designs for every occasion.",
  alternates: { canonical: '/' },
  keywords: ['premium footwear', 'women shoes Pakistan', 'men shoes Pakistan', 'bridal heels', 'slippers'],
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: '/',
    siteName: 'Step & Styl',
    title: 'Step & Styl - Premium Footwear & Slippers',
    description: 'Premium footwear crafted for comfort, elegance and everyday style.',
    images: [{ url: '/logo_main.png', alt: 'Step & Styl' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Step & Styl - Premium Footwear & Slippers',
    description: 'Premium footwear crafted for comfort, elegance and everyday style.',
    images: ['/logo_main.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-W2JBDNZW');
            `,
          }}
        />
        {/* End Google Tag Manager */}
      </head>
      <body
        suppressHydrationWarning
        className={`${instrumentSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-W2JBDNZW"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* End Google Tag Manager (noscript) */}

        <BusinessContactProvider>
          <WishlistProvider>
            <CartProvider>
              {children}
              <WhatsAppButton />
              <NewsletterPopup />
            </CartProvider>
          </WishlistProvider>
        </BusinessContactProvider>
      </body>
      <MarketingScripts />
      <Suspense fallback={null}>
        <MetaPixel />
      </Suspense>
    </html>
  );
}