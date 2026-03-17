import GoogleProvider from "next-auth/providers/google";

export function createAuthOptions() {
  const env = {
    nextAuthSecret: process.env.NEXTAUTH_SECRET,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };

  if (!env.nextAuthSecret || !env.googleClientId || !env.googleClientSecret) {
    throw new Error(
      "Missing required NextAuth environment variables: NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET",
    );
  }

  return {
    providers: [
      GoogleProvider({
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      }),
    ],
    secret: env.nextAuthSecret,
    pages: {
      signIn: "/login",
      signOut: "/login",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.email = user.email;
          token.name = user.name;
        }

        return token;
      },

      async session({ session, token }) {
        if (token) {
          session.user.email = token.email;
          session.user.name = token.name;
        }

        return session;
      },
    },
  };
}