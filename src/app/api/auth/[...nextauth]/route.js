import NextAuth from "next-auth";
import { transaction } from "@/lib/db";
import { createAuthOptions } from "@/auth/options";

let handler;

function getHandler() {
  if (!handler) {
    const authOptions = createAuthOptions();

    authOptions.callbacks = {
      ...authOptions.callbacks,
      async signIn({ user }) {
        try {
          await transaction(async (connection) => {
            const [existingUsers] = await connection.execute(
              "SELECT UserID FROM `USER` WHERE Email = ?",
              [user.email],
            );

            if (existingUsers.length === 0) {
              await connection.execute(
                "INSERT INTO `USER` (Name, Email, ReliabilityScore, BadgeLevel) VALUES (?, ?, ?, ?)",
                [user.name, user.email, 100, "Bronze"],
              );
            }
          });

          return true;
        } catch (error) {
          console.error("Error during sign-in callback:", error);
          return false;
        }
      },
    };

    handler = NextAuth(authOptions);
  }
  return handler;
}

export const GET = (req, context) => getHandler()(req, context);
export const POST = (req, context) => getHandler()(req, context);
