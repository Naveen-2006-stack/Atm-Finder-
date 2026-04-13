-- ============================================================================
-- LAB EXPERIMENTS SQL SCRIPT - ATM_MoneyChecker Database
-- DBMS Lab Manual Requirements: Week 2 to Week 6
-- MySQL 8.0 Syntax
-- ============================================================================

USE ATM_MoneyChecker;

-- ============================================================================
-- WEEK 2: DQL COMMANDS (Data Query Language)
-- ============================================================================

-- ============================================================================
-- 2.1: Query using LIKE and ORDER BY to filter banks by name
-- Objective: Find all banks containing 'Bank' in their name, ordered alphabetically
-- ============================================================================
SELECT 
    BankID,
    BankName,
    BranchCode,
    HeadOfficeLocation,
    CashCapacity
FROM BANK
WHERE BankName LIKE '%Bank%'
ORDER BY BankName ASC;

-- Alternative: Find banks starting with 'SBI'
-- SELECT * FROM BANK WHERE BankName LIKE 'SBI%' ORDER BY CashCapacity DESC;


-- ============================================================================
-- 2.2: Query using GROUP BY and HAVING to count ATMs per bank
-- Objective: Show only banks with more than 1 ATM deployed
-- ============================================================================
SELECT 
    b.BankID,
    b.BankName,
    COUNT(a.ATMId) AS ATM_Count,
    AVG(b.CashCapacity) AS Avg_Cash_Capacity
FROM BANK b
INNER JOIN ATM a ON b.BankID = a.BankID
GROUP BY b.BankID, b.BankName
HAVING COUNT(a.ATMId) > 1
ORDER BY ATM_Count DESC;


-- ============================================================================
-- 2.3: Query using Arithmetic Operators
-- Objective: Display CashCapacity converted to thousands and add a fee calculation
-- ============================================================================
SELECT 
    BankID,
    BankName,
    CashCapacity,
    ROUND(CashCapacity / 1000, 2) AS CashCapacity_in_Thousands,
    ROUND(CashCapacity * 0.05, 2) AS Maintenance_Fee_5_Percent,
    ROUND(CashCapacity - (CashCapacity * 0.05), 2) AS Net_Cash_After_Fee
FROM BANK
ORDER BY CashCapacity DESC;


-- ============================================================================
-- WEEK 3: TCL & DCL COMMANDS (Transaction Control & Data Control Language)
-- ============================================================================

-- ============================================================================
-- 3.1: TCL - Transaction Block with SAVEPOINT, UPDATE, ROLLBACK, COMMIT
-- Scenario: Simulating a user report submission and rolled-back score update
-- ============================================================================

-- Start transaction to submit a report and update user score
START TRANSACTION;

-- Pick valid existing IDs from the current database instead of hard-coding
SET @sample_atm_id = (SELECT MIN(ATMId) FROM ATM);
SET @sample_user_id = (SELECT MIN(UserID) FROM USER);

-- Simulated report submission
INSERT INTO REPORT (ATMId, UserID, Timestamp, CashLevel)
VALUES (@sample_atm_id, @sample_user_id, NOW(), 'Full');

-- Create a savepoint before updating scores
SAVEPOINT before_score_update;

-- Update user reliability score after successful report
UPDATE USER 
SET ReliabilityScore = ReliabilityScore + 5
WHERE UserID = @sample_user_id;

-- Simulate a business rule check - if score becomes too high, rollback
-- (In real scenario, this would be conditional)
-- For demonstration: we'll show the rollback and commitment separately

ROLLBACK TO SAVEPOINT before_score_update;

-- User report stays committed, but the score update is rolled back
COMMIT;

-- Query to verify the transaction
SELECT 
    u.UserID,
    u.Name,
    u.ReliabilityScore,
    u.BadgeLevel,
    r.ReportID,
    r.Timestamp,
    r.CashLevel
FROM USER u
LEFT JOIN REPORT r ON u.UserID = r.UserID
WHERE u.UserID = @sample_user_id
ORDER BY r.Timestamp DESC;


-- ============================================================================
-- 3.2: DCL - User Management (CREATE USER, GRANT, REVOKE)
-- Note: Run with appropriate admin privileges
-- ============================================================================

-- Create a guest user account (if not exists)
-- IMPORTANT: Uncomment and modify credentials before running
-- CREATE USER IF NOT EXISTS 'guest_user'@'localhost' IDENTIFIED BY 'GuestPass123!';

-- Grant SELECT permission on ATM table to guest user
-- GRANT SELECT ON ATM_MoneyChecker.ATM TO 'guest_user'@'localhost';

-- Grant SELECT on other non-sensitive tables
-- GRANT SELECT ON ATM_MoneyChecker.BANK TO 'guest_user'@'localhost';
-- GRANT SELECT ON ATM_MoneyChecker.STATUS_LOOKUP TO 'guest_user'@'localhost';

-- Revoke DELETE permission (if it was granted)
-- REVOKE DELETE ON ATM_MoneyChecker.ATM FROM 'guest_user'@'localhost';

-- Apply privilege changes
-- FLUSH PRIVILEGES;

-- View the granted privileges for guest user
-- SHOW GRANTS FOR 'guest_user'@'localhost';


-- ============================================================================
-- WEEK 4: AGGREGATE FUNCTIONS & SET OPERATIONS
-- ============================================================================

-- ============================================================================
-- 4.1: Aggregate Functions - MAX, AVG, MIN, COUNT on ReliabilityScore
-- Objective: Get comprehensive user score statistics
-- ============================================================================
SELECT 
    COUNT(UserID) AS Total_Users,
    MAX(ReliabilityScore) AS Highest_Score,
    MIN(ReliabilityScore) AS Lowest_Score,
    ROUND(AVG(ReliabilityScore), 2) AS Average_Score,
    STDDEV_POP(ReliabilityScore) AS Score_StdDev,
    (
        SELECT GROUP_CONCAT(Name ORDER BY ReliabilityScore DESC SEPARATOR ', ')
        FROM (
            SELECT Name, ReliabilityScore
            FROM USER
            ORDER BY ReliabilityScore DESC
            LIMIT 5
        ) AS top_users
    ) AS Top_5_Users
FROM USER;

-- Additional: Score distribution by badge level
SELECT 
    BadgeLevel,
    COUNT(*) AS User_Count,
    MAX(ReliabilityScore) AS Max_Score,
    MIN(ReliabilityScore) AS Min_Score,
    ROUND(AVG(ReliabilityScore), 2) AS Avg_Score
FROM USER
GROUP BY BadgeLevel
ORDER BY AVG(ReliabilityScore) DESC;


-- ============================================================================
-- 4.2: UNION Set Operation
-- Objective: Combine Gold badge users with users having score > 150
-- ============================================================================
SELECT 
    UserID,
    Name,
    Email,
    ReliabilityScore,
    BadgeLevel,
    'Gold Badge Holder' AS Category
FROM USER
WHERE BadgeLevel = 'Gold'

UNION

SELECT 
    UserID,
    Name,
    Email,
    ReliabilityScore,
    BadgeLevel,
    'High Score (>150)' AS Category
FROM USER
WHERE ReliabilityScore > 150

ORDER BY ReliabilityScore DESC;

-- Alternative: UNION ALL (includes duplicates if user has both conditions)
-- SELECT ... FROM USER WHERE BadgeLevel = 'Gold'
-- UNION ALL
-- SELECT ... FROM USER WHERE ReliabilityScore > 150;


-- ============================================================================
-- WEEK 5: SUBQUERIES, JOINS & VIEWS
-- ============================================================================

-- ============================================================================
-- 5.1: Nested Subquery using IN
-- Objective: Find all reports submitted for ATMs belonging to a specific bank
-- Parameter: Change @bank_name to filter by different banks
-- ============================================================================
SET @bank_name = 'State Bank of India';

SELECT 
    r.ReportID,
    r.UserID,
    u.Name AS Reporter_Name,
    r.ATMId,
    a.Pincode,
    sl.StatusDescription,
    r.Timestamp,
    r.CashLevel
FROM REPORT r
INNER JOIN USER u ON r.UserID = u.UserID
INNER JOIN ATM a ON r.ATMId = a.ATMId
INNER JOIN STATUS_LOOKUP sl ON a.StatusID = sl.StatusID
WHERE r.ATMId IN (
    SELECT a2.ATMId
    FROM ATM a2
    INNER JOIN BANK b ON a2.BankID = b.BankID
    WHERE b.BankName = @bank_name
)
ORDER BY r.Timestamp DESC;


-- ============================================================================
-- 5.2: Joins - INNER JOIN and LEFT JOIN
-- Objective: Display comprehensive ATM information with joins
-- ============================================================================
SELECT 
    a.ATMId,
    a.Pincode,
    b.BankName,
    sl.StatusDescription,
    a.WheelChairAccess,
    a.SecurityGuard,
    GROUP_CONCAT(CONCAT(ats.ServiceName, ' (Deposit: ', ats.Deposit, ', Printer: ', ats.Printers, ')') 
                 SEPARATOR ' | ') AS Available_Services,
    COUNT(DISTINCT r.ReportID) AS Total_Reports
FROM ATM a
INNER JOIN BANK b ON a.BankID = b.BankID
INNER JOIN STATUS_LOOKUP sl ON a.StatusID = sl.StatusID
LEFT JOIN ATM_SERVICES ats ON a.ATMId = ats.ATMId
LEFT JOIN REPORT r ON a.ATMId = r.ATMId
GROUP BY a.ATMId, a.Pincode, b.BankName, sl.StatusDescription, a.WheelChairAccess, a.SecurityGuard
ORDER BY a.Pincode, b.BankName;


-- ============================================================================
-- 5.3: CREATE VIEW - Dashboard View of Working ATMs
-- Objective: Create a reusable view for monitoring currently working ATMs
-- ============================================================================
CREATE OR REPLACE VIEW vw_Working_ATMs AS
SELECT 
    a.ATMId,
    a.Pincode,
    b.BankName,
    b.HeadOfficeLocation,
    sl.StatusDescription,
    a.WheelChairAccess,
    a.SecurityGuard,
    b.CashCapacity,
    COUNT(DISTINCT r.ReportID) AS Recent_Reports,
    MAX(r.Timestamp) AS Last_Report_Time,
    CASE 
        WHEN MAX(r.CashLevel) = 'Full' THEN 'Fully Stocked'
        WHEN MAX(r.CashLevel) = 'Partial' THEN 'Partial Stock'
        WHEN MAX(r.CashLevel) = 'Empty' THEN 'Out of Cash'
        ELSE 'Unknown Status'
    END AS Latest_Cash_Status
FROM ATM a
INNER JOIN BANK b ON a.BankID = b.BankID
INNER JOIN STATUS_LOOKUP sl ON a.StatusID = sl.StatusID
LEFT JOIN REPORT r ON a.ATMId = r.ATMId
WHERE sl.StatusDescription = 'Working'
GROUP BY a.ATMId, a.Pincode, b.BankName, b.HeadOfficeLocation, sl.StatusDescription, 
         a.WheelChairAccess, a.SecurityGuard, b.CashCapacity
ORDER BY a.Pincode ASC;

-- Query the view
SELECT * FROM vw_Working_ATMs;

-- Additional dashboard view for manual user verification
CREATE OR REPLACE VIEW vw_User_Contribution_Dashboard AS
SELECT 
    u.UserID,
    u.Name,
    u.Email,
    u.ReliabilityScore,
    u.BadgeLevel,
    COUNT(DISTINCT r.ReportID) AS Total_Reports_Submitted,
    COUNT(DISTINCT r.ATMId) AS Unique_ATMs_Reported,
    MAX(r.Timestamp) AS Last_Report_Date,
    DATEDIFF(CURDATE(), DATE(MAX(r.Timestamp))) AS Days_Since_Last_Report
FROM USER u
LEFT JOIN REPORT r ON u.UserID = r.UserID
GROUP BY u.UserID, u.Name, u.Email, u.ReliabilityScore, u.BadgeLevel
ORDER BY u.ReliabilityScore DESC;

-- Query the user dashboard
SELECT * FROM vw_User_Contribution_Dashboard;


-- ============================================================================
-- WEEK 6: PL/SQL CONCEPTS (MySQL Procedural Syntax)
-- ============================================================================

-- ============================================================================
-- 6.1: Stored Procedure with Exception Handling
-- Objective: SafeAddUser procedure with error handling for duplicate entries
-- ============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS SafeAddUser $$

CREATE PROCEDURE SafeAddUser(
    IN p_Name VARCHAR(100),
    IN p_Email VARCHAR(140),
    IN p_Phone_no VARCHAR(20),
    OUT p_Success BOOLEAN,
    OUT p_Message VARCHAR(255)
)
BEGIN
    -- Declare exit handler for duplicate key error
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        SET p_Success = FALSE;
        SET p_Message = 'Error: Duplicate Email or Phone Number. User already exists.';
    END;
    
    -- Declare generic exception handler
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_Success = FALSE;
        SET p_Message = 'Error: An unexpected database error occurred. Please try again.';
    END;
    
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM USER WHERE Email = p_Email OR Phone_no = p_Phone_no) THEN
        -- Insert new user with default values
        INSERT INTO USER (Name, Email, Phone_no, ReliabilityScore, BadgeLevel)
        VALUES (p_Name, p_Email, p_Phone_no, 100, 'Bronze');
        
        SET p_Success = TRUE;
        SET p_Message = CONCAT('Success: User ', p_Name, ' added successfully with ReliabilityScore 100 and Badge Bronze');
    ELSE
        SET p_Success = FALSE;
        SET p_Message = 'Error: User with this Email or Phone already exists.';
    END IF;
END $$

DELIMITER ;

-- Test the procedure
-- CALL SafeAddUser('John Doe', 'john@example.com', '9876543210', @success, @message);
-- SELECT @success AS Success, @message AS Message;


-- ============================================================================
-- 6.2: Stored Function with Deterministic Calculation
-- Objective: GetScoreMultiplier - calculates bonus multiplier based on score
-- ============================================================================
DELIMITER $$

DROP FUNCTION IF EXISTS GetScoreMultiplier $$

CREATE FUNCTION GetScoreMultiplier(p_ReliabilityScore INT)
RETURNS DECIMAL(3, 2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE multiplier DECIMAL(3, 2);
    
    IF p_ReliabilityScore >= 250 THEN
        SET multiplier = 2.0;  -- Platinum level
    ELSEIF p_ReliabilityScore >= 200 THEN
        SET multiplier = 1.5;  -- Gold level
    ELSEIF p_ReliabilityScore >= 150 THEN
        SET multiplier = 1.25; -- Silver level
    ELSEIF p_ReliabilityScore >= 100 THEN
        SET multiplier = 1.1;  -- Bronze level
    ELSE
        SET multiplier = 1.0;  -- Standard level
    END IF;
    
    RETURN multiplier;
END $$

DELIMITER ;

-- Test the function
SELECT 
    UserID,
    Name,
    ReliabilityScore,
    GetScoreMultiplier(ReliabilityScore) AS Score_Multiplier,
    ROUND(ReliabilityScore * GetScoreMultiplier(ReliabilityScore), 2) AS Adjusted_Score
FROM USER
ORDER BY ReliabilityScore DESC;


-- ============================================================================
-- 6.3: Stored Procedure with Explicit Cursor
-- Objective: ShowUserScores - iterate through users and display scores
-- ============================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS ShowUserScores $$

CREATE PROCEDURE ShowUserScores()
BEGIN
    -- Variable declarations
    DECLARE done INT DEFAULT FALSE;
    DECLARE user_name VARCHAR(100);
    DECLARE user_score INT;
    DECLARE user_badge VARCHAR(20);
    DECLARE score_label VARCHAR(20);
    
    -- Explicit cursor declaration
    DECLARE user_cursor CURSOR FOR 
        SELECT Name, ReliabilityScore, BadgeLevel 
        FROM USER 
        ORDER BY ReliabilityScore DESC;
    
    -- Handler for cursor end
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Create temporary table for results
    DROP TEMPORARY TABLE IF EXISTS temp_user_scores;
    CREATE TEMPORARY TABLE temp_user_scores (
        UserName VARCHAR(100),
        Score INT,
        BadgeLevel VARCHAR(20),
        ScoreCategory VARCHAR(30)
    );
    
    -- Open cursor
    OPEN user_cursor;
    
    -- Loop through all users
    read_loop: LOOP
        FETCH user_cursor INTO user_name, user_score, user_badge;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Categorize scores
        IF user_score >= 250 THEN
            SET score_label = 'Platinum Expert';
        ELSEIF user_score >= 200 THEN
            SET score_label = 'Gold Member';
        ELSEIF user_score >= 150 THEN
            SET score_label = 'Silver Contributor';
        ELSEIF user_score >= 100 THEN
            SET score_label = 'Bronze User';
        ELSE
            SET score_label = 'Newcomer';
        END IF;
        
        -- Insert into temporary table
        INSERT INTO temp_user_scores 
        VALUES (user_name, user_score, user_badge, score_label);
    END LOOP;
    
    -- Close cursor
    CLOSE user_cursor;
    
    -- Display results
    SELECT * FROM temp_user_scores ORDER BY Score DESC;
    
END $$

DELIMITER ;

-- Execute the procedure
-- CALL ShowUserScores();


-- ============================================================================
-- 6.4: BEFORE UPDATE Trigger for Badge Level Upgrade
-- Objective: Automatically upgrade BadgeLevel when ReliabilityScore crosses thresholds
-- ============================================================================
DELIMITER $$

DROP TRIGGER IF EXISTS trg_update_badge_level $$

CREATE TRIGGER trg_update_badge_level
BEFORE UPDATE ON USER
FOR EACH ROW
BEGIN
    -- Upgrade only to the badge levels defined by the lab requirement
    IF NEW.ReliabilityScore >= 200 AND OLD.BadgeLevel <> 'Gold' THEN
        SET NEW.BadgeLevel = 'Gold';
    ELSEIF NEW.ReliabilityScore >= 150 AND OLD.BadgeLevel NOT IN ('Gold', 'Silver') THEN
        SET NEW.BadgeLevel = 'Silver';
    ELSE
        -- Keep existing Bronze/default badge below Silver threshold
        SET NEW.BadgeLevel = 'Bronze';
    END IF;
END $$

DELIMITER ;

-- Test the trigger by updating a user's score
-- UPDATE USER SET ReliabilityScore = 200 WHERE UserID = 1;
-- SELECT UserID, Name, ReliabilityScore, BadgeLevel FROM USER WHERE UserID = 1;


-- ============================================================================
-- ADDITIONAL TRIGGERS FOR COMPREHENSIVE TESTING
-- ============================================================================

-- ============================================================================
-- 6.5: AFTER INSERT Trigger - Log new reports
-- Objective: Create audit trail of new ATM reports
-- ============================================================================

-- First, create audit table
CREATE TABLE IF NOT EXISTS REPORT_AUDIT (
    AuditID INT AUTO_INCREMENT PRIMARY KEY,
    ReportID BIGINT NOT NULL,
    ATMId INT NOT NULL,
    UserID INT NOT NULL,
    CashLevel VARCHAR(20),
    AuditTimestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    Action VARCHAR(20) DEFAULT 'INSERT'
);

DELIMITER $$

DROP TRIGGER IF EXISTS trg_log_report_insert $$

CREATE TRIGGER trg_log_report_insert
AFTER INSERT ON REPORT
FOR EACH ROW
BEGIN
    INSERT INTO REPORT_AUDIT (ReportID, ATMId, UserID, CashLevel, Action)
    VALUES (NEW.ReportID, NEW.ATMId, NEW.UserID, NEW.CashLevel, 'INSERT');
END $$

DELIMITER ;


-- ============================================================================
-- WEEK 7: CONCURRENCY CONTROL & LOCKS
-- ============================================================================

-- ============================================================================
-- 7.1: Concurrency Control using SELECT ... FOR UPDATE
-- Objective: Demonstrate a row-level lock when two transactions try to update ATM status simultaneously to prevent race conditions.
-- ============================================================================

-- Transaction A: Admin 1 locks an ATM row to update its status
START TRANSACTION;

-- Lock the specific ATM row for update so no other transaction can modify it simultaneously (Pessimistic Locking)
SELECT ATMId, StatusID, BankID 
FROM ATM 
WHERE ATMId = 1 
FOR UPDATE;

-- Perform the status update
UPDATE ATM 
SET StatusID = (SELECT StatusID FROM STATUS_LOOKUP WHERE StatusDescription = 'Working')
WHERE ATMId = 1;

-- Note: If Transaction B runs concurrently in another session, e.g.:
-- START TRANSACTION; 
-- UPDATE ATM SET StatusID = 2 WHERE ATMId = 1; 
-- It would be forced to wait here until Transaction A commits or rolls back.

-- Release the lock and commit changes
COMMIT;


-- ============================================================================
-- SAMPLE TEST QUERIES - Verify All Lab Implementations
-- ============================================================================

-- Query 1: Verify badge upgrades
SELECT UserID, Name, ReliabilityScore, BadgeLevel 
FROM USER 
ORDER BY ReliabilityScore DESC 
LIMIT 10;

-- Query 2: Check reports submitted
SELECT COUNT(*) AS Total_Reports FROM REPORT;

-- Query 3: Verify view creation
SHOW FULL TABLES WHERE Table_type LIKE 'VIEW';

-- Query 4: Check procedures and functions
SELECT ROUTINE_NAME, ROUTINE_TYPE 
FROM INFORMATION_SCHEMA.ROUTINES 
WHERE ROUTINE_SCHEMA = 'ATM_MoneyChecker';

-- ============================================================================
-- WEEK 8: DATABASE NORMALIZATION (1NF to 5NF)
-- ============================================================================
-- The schema architecture (in schema.sql) is fully normalized up to 5NF:
-- 
-- * 1NF (First Normal Form - Atomic Values):
--   All attributes contain single, atomic values. Pincode, Latitude, Longitude,
--   etc. No arrays or lists exist under a single attribute.
--
-- * 2NF (Second Normal Form - Partial Dependencies):
--   The schema meets 1NF, and all non-key attributes are fully dependent on the 
--   primary key. In ATM_SERVICES, composite dependencies (Deposit and Printers) 
--   rely completely on the combined keys of ATMId and ServiceName.
--
-- * 3NF (Third Normal Form - Transitive Dependencies):
--   There are no transitive dependencies. Status descriptions are not stored 
--   directly in the ATM table. They are abstracted out via a foreign key linkage 
--   (StatusID) into the STATUS_LOOKUP table to prevent update anomalies.
--
-- * BCNF (Boyce-Codd Normal Form - Strict Dependencies):
--   For every functional dependency X -> Y within the tables, X is a strict 
--   mathematical superkey.
--
-- * 4NF (Fourth Normal Form - Multi-valued Dependencies):
--   No table contains two or more independent, multi-valued attributes tracking 
--   the same entity. By separating REPORT and ATM_SERVICES, we prevent infinite 
--   data duplication and empty columns.
--
-- * 5NF (Fifth Normal Form - Join Dependency):
--   The schema handles join dependencies successfully. The tables (USER, ATM, 
--   REPORT) can be decomposed without data loss and mathematically reconstructed 
--   through natural joins without creating spurious or false tuples.
-- ============================================================================

-- ============================================================================
-- END OF LAB EXPERIMENTS SCRIPT
-- ============================================================================
