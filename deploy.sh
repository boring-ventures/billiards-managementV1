#!/bin/bash

# Ensure we're in the project root
cd "$(dirname "$0")"

echo "---------------------------------------"
echo "Deploying Billiards Management System"
echo "---------------------------------------"

# Clean up build artifacts
echo "Cleaning previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
echo "Installing dependencies..."
pnpm install

# Build the project
echo "Building the project..."
pnpm run build

# Deploy to Vercel
echo "Deploying to Vercel..."
echo "NOTE: Make sure you have the Vercel CLI installed."
echo "If not, run: npm i -g vercel"
echo ""
echo "IMPORTANT: When prompted during deployment:"
echo "1. Confirm all the default settings"
echo "2. Set the following environment variables in Vercel:"
echo "   - DATABASE_URL: Your Supabase/PostgreSQL connection string"
echo "   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon key"
echo ""
npx vercel --prod

echo ""
echo "Deployment initiated. Please check the Vercel dashboard for deployment status."
echo ""
echo "After deployment completes, verify that:"
echo "1. API routes are accessible (test /api/admin/superadmins)"
echo "2. Superadmin user switching works"
echo "3. Row-level security policies are enforced correctly"
echo ""
echo "If you experience issues with the deployed API routes, try:"
echo "1. Running 'vercel --prod' again if the initial deployment fails"
echo "2. Checking environment variables in the Vercel dashboard"
echo "3. Verifying database connections by checking logs in Vercel"
echo "---------------------------------------" 