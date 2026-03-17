import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { transaction } from "@/lib/db";

export function getAuthOptions() {
  const { nextAuthSecret, googleClientId, googleClientSecret } = require("@/lib/env").getEnv(true);

  return {
    providers: [
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    ],
    secret: nextAuthSecret,
    pages: {
      signIn: "/login",
      signOut: "/login",
    },
    callbacks: {
      async signIn({ user, account, profile }) {
        // Sync user to database on login
        try {
          await transaction(async (connection) => {
            // Check if user exists
            const [existingUsers] = await connection.execute(
              "SELECT UserID FROM `USER` WHERE Email = ?",
              [user.email]
            );

            if (existingUsers.length === 0) {
              // User doesn't exist, insert them
              await connection.execute(
                "INSERT INTO `USER` (Name, Email, ReliabilityScore, BadgeLevel) VALUES (?, ?, ?, ?)",
                [user.name, user.email, 100, "Bronze"]
              );
            }
          });
          return true;
        } catch (error) {
          console.error("Error during sign-in callback:", error);
          return false;
        }
      },

      async jwt({ token, user, account }) {
        // Add user data to JWT token
        if (user) {
          token.email = user.email;
          token.name = user.name;
        }
        return token;
      },

      async session({ session, token }) {
        // Add token data to session
        if (token) {
          session.user.email = token.email;
          session.user.name = token.name;
        }
        return session;
      },
    },
    events: {
      async signOut() {
        // Optional: Handle sign-out logic
      },
    },
  };
}

export function getHandler() {
  const authOptions = getAuthOptions();
  return NextAuth(authOptions);
}
