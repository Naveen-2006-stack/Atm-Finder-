-- Migration: Make Phone_no nullable in USER table to support Google OAuth login
-- Google OAuth does not provide phone numbers, so we make this field optional

USE ATM_MoneyChecker;

ALTER TABLE `USER` 
MODIFY COLUMN Phone_no VARCHAR(20) NULL;
