#!/usr/bin/env node

/**
 * This script helps migrate from @supabase/auth-helpers-nextjs to @supabase/ssr
 * 
 * Usage:
 * node scripts/supabase-migrate.js
 */

const fs = require('fs');
const path = require('path');

// Pattern to look for
const OLD_IMPORT_PATTERN = /import\s+{\s*createRouteHandlerClient\s*}\s+from\s+['"]@supabase\/auth-helpers-nextjs['"]/;
const OLD_COOKIE_PATTERN = /const\s+supabase\s*=\s*createRouteHandlerClient\(\s*{\s*cookies\s*}\s*\)/;

// New imports and client creation
const NEW_IMPORT = `import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-utils"`;
const NEW_CLIENT = `const supabase = createSupabaseRouteHandlerClient()`;

// Function to recursively find files to update
function findFilesToUpdate(dir, filesToUpdate = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('node_modules') && !entry.name.startsWith('.')) {
        findFilesToUpdate(fullPath, filesToUpdate);
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      if (
        OLD_IMPORT_PATTERN.test(content) ||
        OLD_COOKIE_PATTERN.test(content)
      ) {
        filesToUpdate.push({
          path: fullPath,
          content
        });
      }
    }
  }
  
  return filesToUpdate;
}

// Function to process a file
function updateFile(file) {
  let { content } = file;
  let updated = false;
  
  // Replace imports
  if (OLD_IMPORT_PATTERN.test(content)) {
    content = content.replace(OLD_IMPORT_PATTERN, NEW_IMPORT);
    updated = true;
    
    // Also remove any direct imports of cookies from next/headers
    // if they're only used with createRouteHandlerClient
    if (OLD_COOKIE_PATTERN.test(content)) {
      content = content.replace(/import\s+{\s*cookies\s*}\s+from\s+['"]next\/headers['"]\s*;?/, '');
    }
  }
  
  // Replace client creation
  if (OLD_COOKIE_PATTERN.test(content)) {
    content = content.replace(OLD_COOKIE_PATTERN, NEW_CLIENT);
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(file.path, content);
    return true;
  }
  
  return false;
}

// Main function
function main() {
  console.log('🔍 Finding files to update...');
  const filesToUpdate = findFilesToUpdate(path.join(process.cwd(), 'src'));
  
  console.log(`Found ${filesToUpdate.length} files to update.`);
  
  if (filesToUpdate.length === 0) {
    console.log('✅ No files to update. Migration complete!');
    return;
  }
  
  console.log('\nUpdating files:');
  let updatedCount = 0;
  
  for (const file of filesToUpdate) {
    const wasUpdated = updateFile(file);
    if (wasUpdated) {
      console.log(`✓ Updated: ${path.relative(process.cwd(), file.path)}`);
      updatedCount++;
    }
  }
  
  console.log(`\n✅ Migration complete! Updated ${updatedCount} files.`);
  console.log('\nNext steps:');
  console.log('1. Review the changes to ensure everything was updated correctly');
  console.log('2. Run the tests to make sure everything still works');
  console.log('3. Deploy your application');
}

main(); 