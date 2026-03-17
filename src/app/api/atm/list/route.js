import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createAuthOptions } from "@/auth/options";
import { query } from "@/lib/db";

export async function GET(request) {
  try {
    const session = await getServerSession(createAuthOptions());
    let currentUserId = null;

    if (session?.user?.email) {
      const [userRow] = await query(
        `SELECT UserID
         FROM \`USER\`
         WHERE Email = :email
         LIMIT 1`,
        { email: session.user.email },
      );

      currentUserId = userRow?.UserID ?? null;
    }

    const { searchParams } = new URL(request.url);
    const pincode = searchParams.get("pincode")?.trim();

    const rows = await query(
      `SELECT
        a.ATMId,
        a.PlaceID,
        a.Pincode,
        a.WheelChairAccess,
        a.SecurityGuard,
        a.Latitude,
        a.Longitude,
        b.BankName,
        s.StatusDescription,
        r.Timestamp AS LastUpdated,
        CASE
          WHEN r.Timestamp IS NULL THEN NULL
          ELSE TIMESTAMPDIFF(MINUTE, r.Timestamp, NOW())
        END AS MinutesAgo,
        EXISTS(
          SELECT 1
          FROM REPORT ur
          WHERE ur.ATMId = a.ATMId
            AND ur.UserID = :currentUserId
            AND DATE(ur.Timestamp) = CURDATE()
        ) AS HasReported,
        reporter.Name AS ReporterName,
        reporter.BadgeLevel AS ReporterBadgeLevel,
        COALESCE(r.CashLevel, 'Unknown') AS CashLevel,
        COALESCE(sv.Deposit, 0) AS Deposit,
        COALESCE(sv.Printers, 0) AS Printers
      FROM ATM a
      INNER JOIN BANK b ON b.BankID = a.BankID
      INNER JOIN STATUS_LOOKUP s ON s.StatusID = a.StatusID
      LEFT JOIN ATM_SERVICES sv ON sv.ATMId = a.ATMId
      LEFT JOIN REPORT r ON r.ReportID = (
        SELECT rr.ReportID
        FROM REPORT rr
        WHERE rr.ATMId = a.ATMId
        ORDER BY rr.Timestamp DESC
        LIMIT 1
      )
      LEFT JOIN \`USER\` reporter ON reporter.UserID = r.UserID
      WHERE (:pincode IS NULL OR a.Pincode = :pincode)
      ORDER BY LastUpdated DESC, a.ATMId DESC`,
      { pincode: pincode || null, currentUserId },
    );

    return NextResponse.json({ results: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load ATM list." },
      { status: 500 },
    );
  }
}
