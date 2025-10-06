
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { dbConnect } from './db';
import User from '@/models/User';

export const authOptions = {
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const { email, password } = credentials;
        await dbConnect();
        const user = await User.findOne({ email });
        if (!user) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: String(user._id), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) { if (user) token.role = user.role; return token; },
    async session({ session, token }) { session.user.role = token.role; return session; },
  },
  pages: { signIn: '/login' },
};
