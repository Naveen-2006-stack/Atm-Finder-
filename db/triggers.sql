USE ATM_MoneyChecker;

DROP TRIGGER IF EXISTS trg_report_after_insert;

DELIMITER $$
CREATE TRIGGER trg_report_after_insert
AFTER INSERT ON REPORT
FOR EACH ROW
BEGIN
  UPDATE `USER`
  SET
    ReliabilityScore = ReliabilityScore + 5,
    BadgeLevel = CASE
      WHEN ReliabilityScore + 5 >= 200 THEN 'Platinum'
      WHEN ReliabilityScore + 5 >= 100 THEN 'Gold'
      WHEN ReliabilityScore + 5 >= 40 THEN 'Silver'
      ELSE 'Bronze'
    END
  WHERE UserID = NEW.UserID;
END$$
DELIMITER ;
