'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    load();
  }, []);

  if (!settings) {
    return (
      <footer className="border-t mt-10 py-6 text-center text-sm text-gray-500">
        Loading store info…
      </footer>
    );
  }

  const { storeName, storeAddress, supportEmail, contactNumber } = settings;

  return (
    <footer className="border-t mt-10 bg-gray-50 py-10 text-gray-700">
      <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Store Info */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{storeName || 'Our Store'}</h3>
          {storeAddress && (
            <p className="whitespace-pre-line text-sm text-gray-600">{storeAddress}</p>
          )}
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Contact</h3>
          {contactNumber && (
            <p className="text-sm text-gray-600">📞 {contactNumber}</p>
          )}
          {supportEmail && (
            <p className="text-sm text-gray-600">
              📧 <a href={`mailto:${supportEmail}`} className="hover:underline">{supportEmail}</a>
            </p>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold text-lg mb-2">Quick Links</h3>
          <ul className="space-y-1 text-sm">
            <li><Link href="/" className="hover:underline">Home</Link></li>
            <li><Link href="/shop" className="hover:underline">Shop</Link></li>
            <li><Link href="/pages/about-us" className="hover:underline">About Us</Link></li>
            <li><Link href="/contact" className="hover:underline">Contact</Link></li>
          </ul>
        </div>

        {/* Copyright */}
        <div className="sm:col-span-2 md:col-span-1 text-sm text-gray-500">
          <p className="mt-6 md:mt-0">
            © {new Date().getFullYear()} {storeName || 'MyStore'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}