/**
 * Admin Features Setup Script
 * This script sets up the required database tables and functions for admin operations
 * It also migrates existing users to use app_metadata for role management
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const directUrl = process.env.DIRECT_URL;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing required environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

// Initialize Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Main setup function
async function setupAdminFeatures() {
  console.log('=== Setting up admin features ===');
  
  try {
    // Read SQL files
    const adminAuditLogsSql = fs.readFileSync('./scripts/create-admin-audit-logs.sql', 'utf8');
    const adminStoredProceduresSql = fs.readFileSync('./scripts/create-admin-stored-procedures.sql', 'utf8');
    
    console.log('Creating admin audit logs table...');
    // Execute the audit logs SQL
    const { error: auditLogsError } = await supabase.rpc('exec_sql', { sql: adminAuditLogsSql });
    
    if (auditLogsError) {
      console.error('Error creating audit logs table:', auditLogsError);
      console.log('Trying alternative method through psql...');
      
      if (directUrl) {
        try {
          // Extract database connection details from DIRECT_URL
          const matches = directUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
          
          if (matches) {
            const [, dbUser, dbPass, dbHost, dbPort, dbName] = matches;
            
            // Try using psql as a fallback
            console.log(`Connecting to database: ${dbName} on ${dbHost}:${dbPort}`);
            
            // Create temp file with password for PGPASSFILE
            const pgPassFile = `./.pgpass_temp`;
            fs.writeFileSync(pgPassFile, `${dbHost}:${dbPort}:${dbName}:${dbUser}:${dbPass}`, { mode: 0o600 });
            
            // Execute the SQL files with psql
            try {
              const psqlEnv = { ...process.env, PGPASSFILE: pgPassFile };
              
              console.log('Creating audit logs table with psql...');
              await execAsync(`psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f scripts/create-admin-audit-logs.sql`, { env: psqlEnv });
              
              console.log('Creating stored procedures with psql...');
              await execAsync(`psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f scripts/create-admin-stored-procedures.sql`, { env: psqlEnv });
              
              // Remove temp password file
              fs.unlinkSync(pgPassFile);
            } catch (psqlError) {
              console.error('Error using psql:', psqlError);
              console.log('Please run the SQL scripts manually using your database client.');
            }
          }
        } catch (e) {
          console.error('Error parsing database URL:', e);
        }
      } else {
        console.log('DIRECT_URL is not provided in .env. Please run the SQL scripts manually.');
      }
    } else {
      console.log('Admin audit logs table created successfully.');
      
      console.log('Creating admin stored procedures...');
      // Execute the stored procedures SQL
      const { error: proceduresError } = await supabase.rpc('exec_sql', { sql: adminStoredProceduresSql });
      
      if (proceduresError) {
        console.error('Error creating stored procedures:', proceduresError);
      } else {
        console.log('Admin stored procedures created successfully.');
      }
    }
    
    console.log('=== Database setup completed ===');
    console.log('Now migrating user metadata to JWT claims...');
    
    // Run the metadata migration script
    await import('./migrate-user-metadata');
    
    console.log('=== Setup completed ===');
    console.log('Admin features are now ready to use!');
  } catch (error) {
    console.error('Error setting up admin features:', error);
    process.exit(1);
  }
}

// Run the setup
setupAdminFeatures(); 