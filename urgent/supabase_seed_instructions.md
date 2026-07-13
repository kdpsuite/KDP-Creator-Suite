# Instructions for Seeding Analytics Data in Supabase

Due to network connectivity issues from the sandbox environment to your Supabase database, the analytics seed data could not be inserted programmatically. You will need to run the generated SQL script directly within your Supabase dashboard.

## Steps to Seed Data:

1.  **Access Supabase SQL Editor**: Log in to your Supabase project dashboard.
2.  Navigate to the **SQL Editor** section (usually found in the left sidebar).
3.  **Open the SQL Script**: The SQL script containing the `INSERT` statements for the `analytics_events` table has been generated and saved as `/home/ubuntu/supabase_seed_script.sql`.
4.  **Copy the Script Content**: Open the `/home/ubuntu/supabase_seed_script.sql` file and copy its entire content.
5.  **Paste and Run**: Paste the copied SQL content into the Supabase SQL Editor.
6.  **Execute**: Click the "Run" or "Execute" button to run the SQL statements. This will insert the mock batch analytics data into your `analytics_events` table.

Once executed, you should see the new batch conversion events populated in your `analytics_events` table, which will then be reflected in your dashboard analytics.

## SQL Script Content Preview:

```sql
-- Content of /home/ubuntu/supabase_seed_script.sql will be here
-- (Please open the file in the sandbox to get the full content)
```

**Note**: The `user_id` used in the seed data is `a7384892-e10f-4e21-a3cf-bf76025a184a`. Ensure this user exists in your `auth.users` and `user_profiles` tables, or modify the `user_id` in the script before running if you wish to associate the data with a different existing user.
