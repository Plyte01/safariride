import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";
import { UserRole } from "@prisma/client"; // Import your Role enum

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole; // Add your custom role property
      emailVerified: Date | null;
    } & DefaultSession["user"]; // Keep default properties like name, email, image
  }

  interface User extends DefaultUser {
    id: string;
    role: UserRole; // Add role to the User object returned by authorize
    emailVerified: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: UserRole; // Add role to the JWT token
    emailVerified: Date | null;
    picture?: string | null;
    accessToken?: string; // Example if storing OAuth access token
    provider?: string;    // Example if storing OAuth provider
  }
}