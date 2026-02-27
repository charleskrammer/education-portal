import AzureADProvider from "next-auth/providers/azure-ad";
import type { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId:     process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId:     process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // On first sign-in, persist the Microsoft email/UPN into the JWT
      if (account && profile) {
        const p = profile as { email?: string; preferred_username?: string };
        token.email = p.email ?? p.preferred_username ?? token.email;
      }
      return token;
    },
  },
  pages: { signIn: "/login" },
};
