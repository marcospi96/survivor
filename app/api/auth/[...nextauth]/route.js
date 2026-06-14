import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const result = await query(
          'SELECT * FROM users WHERE username = $1',
          [credentials.username.trim()]
        );

        const user = result.rows[0];
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id.toString(),
          name: user.username,
          username: user.username,
          isAdmin: user.is_admin,
          isAlive: user.is_alive,
          hasSeeenWelcome: user.has_seen_welcome,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.isAdmin = user.isAdmin;
        token.isAlive = user.isAlive;
        token.hasSeeenWelcome = user.hasSeeenWelcome;
      }
      if (trigger === 'update' && session) {
        token.isAlive = session.isAlive ?? token.isAlive;
        token.hasSeeenWelcome = session.hasSeeenWelcome ?? token.hasSeeenWelcome;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.isAdmin = token.isAdmin;
      session.user.isAlive = token.isAlive;
      session.user.hasSeeenWelcome = token.hasSeeenWelcome;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
