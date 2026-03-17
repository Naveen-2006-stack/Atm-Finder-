import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createAuthOptions } from "@/auth/options";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(createAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to view your profile." },
        { status: 401 },
      );
    }

    const [user] = await query(
      `SELECT
         UserID,
         Name,
         Email,
         ReliabilityScore,
         BadgeLevel
       FROM \`USER\`
       WHERE Email = :email
       LIMIT 1`,
      { email: session.user.email },
    );

    if (!user) {
      return NextResponse.json(
        { error: "Signed-in user was not found in the database." },
        { status: 404 },
      );
    }

    const [activity] = await query(
      `SELECT
         COUNT(*) AS TotalReports,
         SUM(CASE WHEN DATE(Timestamp) = CURDATE() THEN 1 ELSE 0 END) AS ReportsToday,
         COUNT(DISTINCT ATMId) AS UniqueAtmsReported
       FROM REPORT
       WHERE UserID = :userId`,
      { userId: user.UserID },
    );

    return NextResponse.json({
      profile: {
        userId: user.UserID,
        name: user.Name,
        email: user.Email,
        reliabilityScore: user.ReliabilityScore,
        badgeLevel: user.BadgeLevel,
        totalReports: Number(activity?.TotalReports ?? 0),
        reportsToday: Number(activity?.ReportsToday ?? 0),
        uniqueAtmsReported: Number(activity?.UniqueAtmsReported ?? 0),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load user profile." },
      { status: 500 },
    );
  }
}