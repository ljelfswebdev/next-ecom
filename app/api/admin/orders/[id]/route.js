// app/api/admin/orders/[id]/route.js
import { dbConnect } from '@/lib/db';
import Order from '@/models/Order';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { sendMail, getStoreSettings } from '@/lib/mail';
import {
  renderOrderSummaryHTML,
  subjectCustomerShipped,
} from '@/lib/emailTemplates';

export async function GET(_req, { params }) {
  await dbConnect();
  const order = await Order.findById(params.id).lean();
  if (!order) return new Response('Not found', { status: 404 });

  let customer = null;
  if (order.userId) {
    const User = (await import('@/models/User')).default;
    customer = await User.findById(order.userId).lean();
  }
  return Response.json({ order, customer });
}

export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !['admin','staff'].includes(session.user?.role)) {
    return new Response('Forbidden', { status: 403 });
  }

  await dbConnect();
  const b = await req.json();
  const prev = await Order.findById(params.id);
  if (!prev) return new Response('Not found', { status:404 });

  // Only allow updating status for now (extend as needed)
  if (typeof b.status === 'string' && b.status !== prev.status) {
    prev.status = b.status;
    await prev.save();

    // Fire email on "shipped"
    if (b.status === 'shipped' && prev.email) {
      queueMicrotask(async () => {
        try {
          const store = await getStoreSettings();
          const html = renderOrderSummaryHTML(prev.toObject ? prev.toObject() : prev, store);
          await sendMail({
            to: prev.email,
            subject: subjectCustomerShipped(prev, store),
            html,
          });
        } catch {}
      });
    }

    return Response.json(prev);
  }

  // If nothing changed / unsupported fields
  return Response.json(prev);
}