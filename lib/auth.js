// lib/auth.js
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import { dbConnect } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        await dbConnect();
        const user = await User.findOne({ email: credentials.email }).lean();
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        // IMPORTANT: include id and role here
        return {
          _id: user._id.toString(),
          email: user.email,
          name: user.name || '',
          role: user.role || 'customer',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // First login: copy fields from user into token
      if (user) {
        token.id = user._id || user.id || token.id;
        token.role = user.role || token.role || 'customer';
      }

      // Optional: re-hydrate role from DB on every request (keeps role changes in sync)
      // Comment this block out if you don't need live re-hydration.
      if (!user && token?.id) {
        try {
          await dbConnect();
          const dbUser = await User.findById(token.id).lean();
          if (dbUser?.role) token.role = dbUser.role;
        } catch {}
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) session.user = {};
      if (token?.id)   session.user.id = token.id.toString();
      if (token?.role) session.user.role = token.role;
      return session;
    },
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
};