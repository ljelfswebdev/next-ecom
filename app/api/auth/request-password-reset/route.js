// app/api/auth/request-password-reset/route.js
import { dbConnect } from '@/lib/db';
import User from '@/models/User';
import PasswordResetToken from '@/models/PasswordResetToken';
import crypto from 'crypto';
import { sendMail, getStoreSettings } from '@/lib/email';

export async function POST(req) {
  await dbConnect();
  const { email } = await req.json();
  if (!email) return new Response('Email required', { status: 400 });

  const user = await User.findOne({ email }).lean();
  // Always return 200 to avoid user enumeration
  if (!user) return Response.json({ ok: true });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await PasswordResetToken.create({ userId: user._id, token, expiresAt });

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const { storeName, supportEmail } = await getStoreSettings();

  await sendMail({
    to: user.email,
    subject: `${storeName} – Reset your password`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>${storeName}</h2>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Click here to reset your password</a></p>
        <p>This link expires in 30 minutes. If you didn’t request this, you can ignore this email.</p>
        ${supportEmail ? `<p style="color:#666;font-size:12px">Questions? ${supportEmail}</p>` : ''}
      </div>
    `,
  });

  return Response.json({ ok: true });
}