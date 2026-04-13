import mysql.connector
from mysql.connector import Error

def get_atm_status():
    """
    Basic backend snippet demonstrating Database Connectivity 
    for the ATM Money Checker system using Python.
    """
    try:
        # Establish connection to the MySQL database
        connection = mysql.connector.connect(
            host='localhost',
            database='ATM_MoneyChecker',
            user='root',         # Ensure you replace with your user
            password='password'  # Ensure you replace with your password
        )

        if connection.is_connected():
            db_Info = connection.get_server_info()
            print(f"Connected to MySQL Server version {db_Info}")
            
            cursor = connection.cursor(dictionary=True)
            
            # Execute a basic query reflecting the system
            query = """
                SELECT a.ATMId, b.BankName, s.StatusDescription 
                FROM ATM a
                JOIN BANK b ON a.BankID = b.BankID
                JOIN STATUS_LOOKUP s ON a.StatusID = s.StatusID
                WHERE s.StatusDescription = 'Working'
                LIMIT 5;
            """
            cursor.execute(query)
            records = cursor.fetchall()
            
            print("\n--- Currently Working ATMs ---")
            for row in records:
                print(f"ATM ID: {row['ATMId']} | Bank: {row['BankName']} | Status: {row['StatusDescription']}")
                
    except Error as e:
        print(f"Error while connecting to MySQL: {e}")
    finally:
        # Ensure the connection is always closed
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()
            print("\nMySQL connection is closed.")

if __name__ == '__main__':
    get_atm_status()
