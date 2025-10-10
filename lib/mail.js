// lib/mail.js
import nodemailer from 'nodemailer';
import Settings from '@/models/Settings';
import { dbConnect } from '@/lib/db';

let cachedTransporter = null;

export async function getStoreSettings() {
  await dbConnect();
  const s = await Settings.findOne({}).lean();
  return {
    storeName: s?.storeName || 'My Store',
    supportEmail: s?.supportEmail || process.env.SMTP_USER || 'no-reply@example.com',
    storeAddress: s?.storeAddress || '',
    contactNumber: s?.contactNumber || '',
  };
}

export async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const {
    SMTP_HOST = 'smtp.gmail.com',
    SMTP_PORT = 465,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: Number(SMTP_PORT || 465) === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });

  return cachedTransporter;
}

export async function sendMail({ to, subject, html, text }) {
  const transporter = await getTransporter();
  const settings = await getStoreSettings();

  const from = `${settings.storeName} <${settings.supportEmail}>`;

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
}