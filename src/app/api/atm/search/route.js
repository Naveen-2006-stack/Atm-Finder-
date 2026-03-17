import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createAuthOptions } from "@/auth/options";
import { query, transaction } from "@/lib/db";
import { geocodePincode, getNearbyAtms } from "@/lib/googleMaps";

let schemaChecked = false;

function sanitizePincode(pincode) {
  return String(pincode || "").trim();
}

function parseBankName(name = "") {
  const cleaned = name.replace(/\bATM\b/gi, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts.length > 1 ? `${parts[0]} Bank` : cleaned || "Unknown Bank";
}

async function ensureAtmSchema(connection) {
  if (schemaChecked) {
    return;
  }

  const [columnRows] = await connection.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ATM'`,
  );

  const columns = new Set(columnRows.map((row) => row.COLUMN_NAME));

  if (!columns.has("Latitude")) {
    await connection.execute("ALTER TABLE ATM ADD COLUMN Latitude DECIMAL(10, 8) NULL");
  }

  if (!columns.has("Longitude")) {
    await connection.execute("ALTER TABLE ATM ADD COLUMN Longitude DECIMAL(11, 8) NULL");
  }

  if (!columns.has("PlaceID")) {
    await connection.execute("ALTER TABLE ATM ADD COLUMN PlaceID VARCHAR(255) NULL");
  }

  const [indexRows] = await connection.execute(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'ATM'
       AND COLUMN_NAME = 'PlaceID'`,
  );

  if (!indexRows.length) {
    await connection.execute("ALTER TABLE ATM ADD UNIQUE KEY uq_atm_placeid (PlaceID)");
  }

  schemaChecked = true;
}

async function getOrCreateBank(connection, bankName) {
  const [existing] = await connection.execute(
    "SELECT BankID FROM BANK WHERE BankName = ? LIMIT 1",
    [bankName],
  );

  if (existing.length) {
    return existing[0].BankID;
  }

  await connection.execute(
    `INSERT INTO BANK (BankID, BankName, BranchCode, HeadOfficeLocation, CashCapacity)
     SELECT COALESCE(MAX(BankID), 0) + 1, ?, CONCAT('AUTO-', COALESCE(MAX(BankID), 0) + 1), 'Unknown', 0
     FROM BANK`,
    [bankName],
  );

  const [created] = await connection.execute(
    "SELECT BankID FROM BANK WHERE BankName = ? LIMIT 1",
    [bankName],
  );

  if (!created.length) {
    throw new Error("Unable to create BANK row for ATM sync.");
  }

  return created[0].BankID;
}

async function getWorkingStatusId(connection) {
  const [status] = await connection.execute(
    "SELECT StatusID FROM STATUS_LOOKUP WHERE StatusDescription = 'Working' LIMIT 1",
  );

  if (status.length) {
    return status[0].StatusID;
  }

  await connection.execute(
    `INSERT INTO STATUS_LOOKUP (StatusID, StatusDescription)
     SELECT COALESCE(MAX(StatusID), 0) + 1, 'Working'
     FROM STATUS_LOOKUP`,
  );

  const [created] = await connection.execute(
    "SELECT StatusID FROM STATUS_LOOKUP WHERE StatusDescription = 'Working' LIMIT 1",
  );

  if (created.length) {
    return created[0].StatusID;
  }

  const [fallback] = await connection.execute(
    "SELECT StatusID FROM STATUS_LOOKUP ORDER BY StatusID ASC LIMIT 1",
  );

  if (!fallback.length) {
    throw new Error("STATUS_LOOKUP is empty. Seed at least one status row.");
  }

  return fallback[0].StatusID;
}

function toDbRows(placeResults, pincode) {
  return placeResults.map((place) => ({
    placeId: place.place_id,
    name: place.name || "Unknown ATM",
    lat: place.geometry?.location?.lat,
    lng: place.geometry?.location?.lng,
    pincode,
  }));
}

export async function POST(request) {
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

    const body = await request.json();
    const pincode = sanitizePincode(body?.pincode);

    if (!/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Pincode must be a 6-digit number." },
        { status: 400 },
      );
    }

    const coords = await geocodePincode(pincode);
    const places = await getNearbyAtms({ lat: coords.lat, lng: coords.lng, radius: 2000 });
    const rowsToSync = toDbRows(places, pincode).filter((item) => item.lat && item.lng);

    await transaction(async (connection) => {
      await ensureAtmSchema(connection);
      const statusId = await getWorkingStatusId(connection);

      for (const atm of rowsToSync) {
        const bankName = parseBankName(atm.name);
        const bankId = await getOrCreateBank(connection, bankName);

        await connection.execute(
          `INSERT INTO ATM (ATMId, Pincode, WheelChairAccess, SecurityGuard, BankID, StatusID, Latitude, Longitude, PlaceID)
           SELECT COALESCE(MAX(ATMId), 0) + 1, ?, 0, 0, ?, ?, ?, ?, ?
           FROM ATM
           ON DUPLICATE KEY UPDATE
             Pincode = VALUES(Pincode),
             BankID = VALUES(BankID),
             StatusID = VALUES(StatusID),
             Latitude = VALUES(Latitude),
             Longitude = VALUES(Longitude)`,
          [atm.pincode, bankId, statusId, atm.lat, atm.lng, atm.placeId],
        );
      }
    });

    const cardRows = await query(
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
        sv.Deposit,
        sv.Printers,
        COALESCE(r.CashLevel, 'Unknown') AS CashLevel
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
      WHERE a.Pincode = :pincode
      ORDER BY LastUpdated DESC, a.ATMId DESC`,
      { pincode, currentUserId },
    );

    return NextResponse.json({
      pincode,
      coordinates: coords,
      count: cardRows.length,
      results: cardRows,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to fetch ATM data." },
      { status: 500 },
    );
  }
}
