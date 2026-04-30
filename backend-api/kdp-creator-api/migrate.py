
from sqlalchemy import create_engine, Column, String, DateTime, MetaData, Table
from sqlalchemy.exc import OperationalError
import os
from datetime import datetime

# Define the path to your database
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'src', 'database', 'app.db')
DATABASE_URI = f'sqlite:///{DATABASE_PATH}'

def run_migration():
    engine = create_engine(DATABASE_URI)
    metadata = MetaData()
    metadata.reflect(bind=engine)

    # Check if 'users' table exists
    if 'users' not in metadata.tables:
        print(f"Table 'users' not found in {DATABASE_PATH}. Skipping migration.")
        print("If this is a new deployment, the table will be created with the new columns automatically.")
        return

    users_table = Table('users', metadata, autoload_with=engine)

    # Check if columns already exist
    if 'reset_token' in users_table.columns and 'reset_token_expires' in users_table.columns:
        print("Columns 'reset_token' and 'reset_token_expires' already exist. No migration needed.")
        return

    # Perform the migration
    with engine.connect() as connection:
        if 'reset_token' not in users_table.columns:
            try:
                connection.execute(f'ALTER TABLE users ADD COLUMN reset_token VARCHAR(100) NULL;')
                print("Added column 'reset_token' to 'users' table.")
            except OperationalError as e:
                print(f"Error adding reset_token column: {e}")
                if "duplicate column name" in str(e):
                    print("Column 'reset_token' already exists, skipping.")
                else:
                    raise

        if 'reset_token_expires' not in users_table.columns:
            try:
                connection.execute(f'ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL;')
                print("Added column 'reset_token_expires' to 'users' table.")
            except OperationalError as e:
                print(f"Error adding reset_token_expires column: {e}")
                if "duplicate column name" in str(e):
                    print("Column 'reset_token_expires' already exists, skipping.")
                else:
                    raise
        connection.commit()

    print("Database migration completed.")

if __name__ == '__main__':
    run_migration()
