import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createAuthOptions } from "@/auth/options";
import { query, transaction } from "@/lib/db";

export async function POST(request) {
  try {
    const session = await getServerSession(createAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to submit a report." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const atmId = Number(body?.atmId);
    const cashLevel = String(body?.cashLevel || "Unknown");
    const wheelChairAccess = Boolean(body?.wheelChairAccess);
    const deposit = Boolean(body?.deposit);
    const printers = Boolean(body?.printers);
    const allowedLevels = ["Full", "Partial", "Empty", "Unknown"];

    if (!Number.isInteger(atmId)) {
      return NextResponse.json(
        { error: "atmId is required and must be numeric." },
        { status: 400 },
      );
    }

    if (!allowedLevels.includes(cashLevel)) {
      return NextResponse.json(
        { error: "cashLevel must be one of Full, Partial, Empty, Unknown." },
        { status: 400 },
      );
    }

    const [userRow] = await query(
      `SELECT UserID
       FROM \`USER\`
       WHERE Email = :email
       LIMIT 1`,
      { email: session.user.email },
    );

    if (!userRow?.UserID) {
      return NextResponse.json(
        { error: "Signed-in user was not found in the database." },
        { status: 404 },
      );
    }

    const userId = userRow.UserID;

    const [existingReport] = await query(
      `SELECT ReportID
       FROM REPORT
       WHERE ATMId = :atmId
         AND UserID = :userId
         AND DATE(Timestamp) = CURDATE()
       LIMIT 1`,
      { atmId, userId },
    );

    if (existingReport?.ReportID) {
      return NextResponse.json(
        { error: "You have already reported this ATM today." },
        { status: 409 },
      );
    }

    const inserted = await transaction(async (connection) => {
      const [reportResult] = await connection.execute(
        `INSERT INTO REPORT (ATMId, UserID, Timestamp, CashLevel)
         VALUES (?, ?, NOW(), ?)`,
        [atmId, userId, cashLevel],
      );

      await connection.execute(
        `UPDATE ATM
         SET WheelChairAccess = ?
         WHERE ATMId = ?`,
        [wheelChairAccess ? 1 : 0, atmId],
      );

      const [serviceRows] = await connection.execute(
        `SELECT ServiceName
         FROM ATM_SERVICES
         WHERE ATMId = ?
         ORDER BY ServiceName ASC
         LIMIT 1`,
        [atmId],
      );

      if (serviceRows.length) {
        await connection.execute(
          `UPDATE ATM_SERVICES
           SET Deposit = ?, Printers = ?
           WHERE ATMId = ? AND ServiceName = ?`,
          [deposit ? 1 : 0, printers ? 1 : 0, atmId, serviceRows[0].ServiceName],
        );
      } else {
        await connection.execute(
          `INSERT INTO ATM_SERVICES (ATMId, ServiceName, Deposit, Printers)
           VALUES (?, 'Community Update', ?, ?)`,
          [atmId, deposit ? 1 : 0, printers ? 1 : 0],
        );
      }

      return reportResult;
    });

    const [scoreRow] = await query(
      `SELECT ReliabilityScore, BadgeLevel, Name
       FROM \`USER\`
       WHERE UserID = :userId
       LIMIT 1`,
      { userId },
    );

    return NextResponse.json(
      {
        message: "Report submitted. You earned reliability points.",
        reportId: inserted.insertId,
        reliabilityScore: scoreRow?.ReliabilityScore ?? null,
        badgeLevel: scoreRow?.BadgeLevel ?? null,
        reporterName: scoreRow?.Name ?? null,
        services: {
          wheelChairAccess,
          deposit,
          printers,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to submit report." },
      { status: 500 },
    );
  }
}
