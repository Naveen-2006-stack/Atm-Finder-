USE ATM_MoneyChecker;

-- Ensure required Google tracking fields exist in ATM.
SET @lat_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ATM'
    AND COLUMN_NAME = 'Latitude'
);
SET @lat_col_sql := IF(
  @lat_col_exists = 0,
  'ALTER TABLE ATM ADD COLUMN Latitude DECIMAL(10, 8) NULL',
  'SELECT "Latitude already exists"'
);
PREPARE lat_stmt FROM @lat_col_sql;
EXECUTE lat_stmt;
DEALLOCATE PREPARE lat_stmt;

SET @lng_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ATM'
    AND COLUMN_NAME = 'Longitude'
);
SET @lng_col_sql := IF(
  @lng_col_exists = 0,
  'ALTER TABLE ATM ADD COLUMN Longitude DECIMAL(11, 8) NULL',
  'SELECT "Longitude already exists"'
);
PREPARE lng_stmt FROM @lng_col_sql;
EXECUTE lng_stmt;
DEALLOCATE PREPARE lng_stmt;

SET @place_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ATM'
    AND COLUMN_NAME = 'PlaceID'
);
SET @place_col_sql := IF(
  @place_col_exists = 0,
  'ALTER TABLE ATM ADD COLUMN PlaceID VARCHAR(255) NULL',
  'SELECT "PlaceID already exists"'
);
PREPARE place_stmt FROM @place_col_sql;
EXECUTE place_stmt;
DEALLOCATE PREPARE place_stmt;

-- Backfill PlaceID for legacy rows to enforce a unique non-null key.
UPDATE ATM
SET PlaceID = CONCAT('legacy-atm-', ATMId)
WHERE PlaceID IS NULL OR TRIM(PlaceID) = '';

ALTER TABLE ATM MODIFY COLUMN PlaceID VARCHAR(255) NOT NULL;

-- Create PlaceID unique index only when no unique index exists on PlaceID.
SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ATM'
    AND COLUMN_NAME = 'PlaceID'
    AND NON_UNIQUE = 0
);
SET @idx_sql := IF(
  @idx_exists = 0,
  'ALTER TABLE ATM ADD UNIQUE KEY uq_atm_placeid (PlaceID)',
  'SELECT "uq_atm_placeid already exists"'
);
PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

-- Create geo index only when missing.
SET @geo_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ATM'
    AND INDEX_NAME = 'idx_atm_geo'
);
SET @geo_idx_sql := IF(
  @geo_idx_exists = 0,
  'CREATE INDEX idx_atm_geo ON ATM (Latitude, Longitude)',
  'SELECT "idx_atm_geo already exists"'
);
PREPARE geo_stmt FROM @geo_idx_sql;
EXECUTE geo_stmt;
DEALLOCATE PREPARE geo_stmt;

-- Ensure key statuses exist.
INSERT IGNORE INTO STATUS_LOOKUP (StatusID, StatusDescription)
SELECT COALESCE(MAX(StatusID), 0) + 1, 'Working' FROM STATUS_LOOKUP
WHERE NOT EXISTS (SELECT 1 FROM STATUS_LOOKUP WHERE StatusDescription = 'Working');

INSERT IGNORE INTO STATUS_LOOKUP (StatusID, StatusDescription)
SELECT COALESCE(MAX(StatusID), 0) + 1, 'Partial/Low Cash' FROM STATUS_LOOKUP
WHERE NOT EXISTS (SELECT 1 FROM STATUS_LOOKUP WHERE StatusDescription = 'Partial/Low Cash');

INSERT IGNORE INTO STATUS_LOOKUP (StatusID, StatusDescription)
SELECT COALESCE(MAX(StatusID), 0) + 1, 'Out of Service' FROM STATUS_LOOKUP
WHERE NOT EXISTS (SELECT 1 FROM STATUS_LOOKUP WHERE StatusDescription = 'Out of Service');
