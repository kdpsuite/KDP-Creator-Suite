# Database Migration Guide: Password Reset Feature

This guide explains how to safely update your existing database to support the new password reset functionality. The migration adds two new columns to your `users` table without affecting any existing user data.

## New Database Columns

The following columns will be added to the `users` table:

| Column Name | Data Type | Nullable | Purpose |
| :--- | :--- | :--- | :--- |
| `reset_token` | `VARCHAR(100)` | Yes | Stores the unique password reset token |
| `reset_token_expires` | `DATETIME` | Yes | Tracks the expiration of the reset token |

## Migration Options

### Option 1: Using the Provided Script (Recommended)

I have created a standalone migration script `migrate.py` in the `backend-api/kdp-creator-api/` directory. This script is designed to be safe and idempotent, meaning it won't cause errors if run multiple times.

**Steps to Run:**

1. Navigate to the backend directory:
   ```bash
   cd backend-api/kdp-creator-api/
   ```

2. Run the migration script:
   ```bash
   python3 migrate.py
   ```

**What the script does:**
- Connects to your SQLite database (`src/database/app.db`).
- Checks if the `users` table exists.
- Checks if the new columns already exist.
- Adds the missing columns using `ALTER TABLE` commands.
- Prints the status of each operation.

### Option 2: Manual Migration (Using SQLite CLI)

If you prefer to run the SQL commands manually, you can use the SQLite command-line tool.

1. Open the database:
   ```bash
   sqlite3 src/database/app.db
   ```

2. Execute the following SQL commands:
   ```sql
   ALTER TABLE users ADD COLUMN reset_token VARCHAR(100);
   ALTER TABLE users ADD COLUMN reset_token_expires DATETIME;
   .exit
   ```

## Verification

After performing the migration, you can verify the new schema by running:

```bash
sqlite3 src/database/app.db "PRAGMA table_info(users);"
```

You should see `reset_token` and `reset_token_expires` in the output list.

## Safety Precautions

> **Note:** Always back up your database file (`app.db`) before performing any schema migrations. While these `ALTER TABLE` commands are safe for SQLite, a backup ensures you can quickly restore your data in case of any unexpected issues.

## Integration with Existing Data

- **Existing Users**: All current users will have `NULL` values for these new columns initially. This is perfectly normal and won't affect their ability to log in or use the application.
- **New Users**: When new users register, these columns will be created automatically with `NULL` values until they request a password reset.

If you have any questions or encounter any issues during the migration, please don't hesitate to ask!
