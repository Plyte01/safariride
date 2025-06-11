import { AuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from '@/lib/prisma'; // Your Prisma client instance
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client'; // Your Prisma UserRole enum

// Interface for the user object returned by authorize or used by adapter,
// ensuring all necessary fields for JWT/session are present.
interface ExtendedAuthUser extends NextAuthUser {
  id: string;
  role: UserRole;
  emailVerified: Date | null;
  // name, email, image are part of NextAuthUser but ensure they are passed
}

// Interface for what we store in the JWT token
interface ExtendedToken {
  id?: string;
  role?: UserRole;
  emailVerified?: Date | null;
  name?: string | null;
  email?: string | null;
  picture?: string | null; // Corresponds to user.image
  accessToken?: string; // For OAuth access token
  provider?: string;    // To know which provider was used
  // Standard JWT claims
  sub?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        // Map Google profile to your User model structure for the adapter
        return {
          id: profile.sub, // Required by NextAuth User object
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: UserRole.RENTER, // Default role for new OAuth users
          emailVerified: profile.email_verified ? new Date() : null,
          // Ensure any other non-optional fields in your Prisma User model
          // (without a default value) are provided here or handled by adapter.
        };
      },
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('No user found with this email. Please sign up.');
        }

        if (!user.password) {
          throw new Error('This account was registered using a social login. Please use that method.');
        }
        
        // Email verification check was moved to signIn callback for more flexibility
        // but can also be kept here if preferred. If kept here, the signIn callback's check is redundant.

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error('Incorrect password. Please try again.');
        }

        // Return necessary fields for the user object in JWT/session
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        }; // This will be cast to ExtendedAuthUser effectively by NextAuth if types match
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async signIn({ user, account }) {
      // `user` is the object from `authorize` or from adapter after OAuth sign-in
      // `account` is populated for OAuth flows
      
      // This check is crucial: fetch the latest user state from DB
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! } // user.email should always exist here
      });

      if (!dbUser) return false; // Should ideally not happen

      // Enforce email verification for credentials login
      if (account?.provider === "credentials") {
        if (!dbUser.emailVerified) {
          // By throwing an error with a specific code, the custom error page can handle it.
          // The default NextAuth error page will show "VERIFY_EMAIL_ERROR"
          // The client receives error=Callback&callbackError=VERIFY_EMAIL
          console.log("signIn callback: Email not verified for credentials login.");
          throw new Error('VERIFY_EMAIL'); 
          // You can also redirect by throwing an error that is a URL string,
          // but NextAuth handles this by redirecting to its own error page if pages.error is set.
          // Example: throw new Error("/auth/verify-email-notice");
        }
      }
      
      // For OAuth providers like Google, `dbUser.emailVerified` would have been set by the
      // Prisma adapter based on the `profile` callback of the GoogleProvider.
      // You could add checks here too if needed for OAuth users.
      // if (account && account.provider !== "credentials" && !dbUser.emailVerified) {
      //   console.log(`signIn callback: OAuth user ${user.email} email not verified by provider.`);
      //   throw new Error('OAUTH_EMAIL_NOT_VERIFIED');
      // }

      return true; // Allow sign-in
    },

    async jwt({ token, user, account, trigger, session: updateSessionData }) {
      // `user` is populated on initial sign-in (from `authorize` or adapter after OAuth)
      // `account` is populated on initial OAuth sign-in
      
      // console.log("JWT TRIGGER:", trigger);
      // if(user) console.log("JWT USER:", user);
      // if(account) console.log("JWT ACCOUNT:", account);

      if (trigger === "update" && updateSessionData) {
        // Handle client-side session updates via useSession().update()
        // Carefully decide what can be updated from the client.
        if (updateSessionData.name) token.name = updateSessionData.name;
        if (updateSessionData.image) token.picture = updateSessionData.image; // map to token.picture
        // Avoid allowing role or emailVerified status to be updated from client for security.
      }

      if (user) { // This block runs on initial sign-in
        // The 'user' object here is what 'authorize' returned or what the adapter processed for OAuth.
        // It should already have id, role, emailVerified.
        const u = user as ExtendedAuthUser; // Cast to ensure our custom fields are recognized
        token.id = u.id;
        (token as ExtendedToken).role = u.role;
        (token as ExtendedToken).emailVerified = u.emailVerified;
        token.name = u.name; // Ensure these are passed through
        token.email = u.email;
        token.picture = u.image; // NextAuth maps session.user.image to token.picture
      }

      // If using OAuth, persist access_token and provider to the token
      if (account) {
        token.accessToken = account.access_token;
        (token as ExtendedToken).provider = account.provider;
      }
      
      // console.log("JWT OUT:", token);
      return token;
    },

    async session({ session, token }) {
      // `token` is the JWT object from the `jwt` callback.
      // We need to transfer our custom claims from the token to the session.user object.
      
      // console.log("SESSION TOKEN IN:", token);

      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as ExtendedAuthUser).role = (token as ExtendedToken).role as UserRole;
        (session.user as ExtendedAuthUser).emailVerified = (token as ExtendedToken).emailVerified as Date | null;
        // session.user.name, email, image are usually populated by NextAuth if token has name, email, picture
      }
      
      // console.log("SESSION OUT:", session);
      return session;
    },
  },

  pages: {
    signIn: '/auth/login', // Your custom login page path
    error: '/auth/error',  // Custom error page path for auth errors (e.g. /auth/error?error=Verification)
    // verifyRequest: '/auth/verify-request', // For magic link emails if you use EmailProvider
    // newUser: '/welcome', // Optional: redirect new OAuth users to a page to complete profile
  },

  // events: { // Optional: for side-effects
  //   async signIn(message) { /* ... */ },
  //   async createUser(message) { /* ... */ }
  // },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};