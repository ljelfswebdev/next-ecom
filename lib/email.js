// lib/email.js
import nodemailer from 'nodemailer';
import { dbConnect } from '@/lib/db';

export function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('Missing SMTP credentials');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    secure: true,
    auth: { user, pass },
  });
}

// Generic mail sender (used by password reset + admin/customer mails)
export async function sendMail({ to, subject, html }) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

// Pull store details from Settings (fallbacks to envs)
export async function getStoreSettings() {
  await dbConnect();
  const Settings = (await import('@/models/Settings')).default;
  const s = await Settings.findOne({}).lean();

  return {
    storeName: s?.storeName || process.env.STORE_NAME || 'My Store',
    supportEmail: s?.supportEmail || process.env.SMTP_USER || '',
    storeAddress: s?.storeAddress || '',
    contactNumber: s?.contactNumber || '',
  };
}

// (kept from your original file)
export async function sendOrderConfirmation({ to, orderId, totalFormatted }) {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: `Order Confirmation #${orderId}`,
    html: `<div style="font-family:Arial,sans-serif">
      <h2>Thanks for your order!</h2>
      <p>Your order <strong>#${orderId}</strong> was received.</p>
      <p>Total: <strong>${totalFormatted}</strong></p>
    </div>`,
  });
}