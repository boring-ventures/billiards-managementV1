/**
 * Migration script to populate app_metadata for existing users
 * This script should be run once to migrate existing users to use app_metadata
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Initialize Supabase admin client
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for auth metadata operations');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function migrateUserMetadata() {
  try {
    console.log('Starting migration of user metadata to app_metadata...');
    
    // Get all profiles from the database
    const profiles = await prisma.profile.findMany({
      select: {
        userId: true,
        role: true,
        companyId: true,
      }
    });
    
    console.log(`Found ${profiles.length} profiles to migrate`);
    
    // Get admin client for updating auth metadata
    const adminClient = getAdminClient();
    
    // Process each profile
    let successCount = 0;
    let errorCount = 0;
    
    for (const profile of profiles) {
      try {
        // Get current user data first
        const { data: userData, error: getUserError } = await adminClient.auth.admin.getUserById(profile.userId);
        
        if (getUserError || !userData?.user) {
          console.error(`Error fetching user ${profile.userId}:`, getUserError);
          errorCount++;
          continue;
        }
        
        // Update app_metadata with role and companyId
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          profile.userId,
          { 
            app_metadata: {
              role: profile.role,
              companyId: profile.companyId,
              initialized: true
            }
          }
        );
        
        if (updateError) {
          console.error(`Error updating metadata for ${profile.userId}:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ Updated app_metadata for user ${profile.userId} with role=${profile.role}, companyId=${profile.companyId || 'null'}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing user ${profile.userId}:`, error);
        errorCount++;
      }
    }
    
    console.log('Migration complete!');
    console.log(`Success: ${successCount} users`);
    console.log(`Errors: ${errorCount} users`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateUserMetadata(); 