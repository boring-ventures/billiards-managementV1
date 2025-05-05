#!/bin/bash

# Setup Vercel environment variables for your project

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Error: vercel CLI is not installed."
    echo "Please install it with: npm i -g vercel"
    exit 1
fi

# Log in to Vercel if not already logged in
vercel whoami &> /dev/null || vercel login

# Set the Vercel project environment variables
echo "Setting NEXT_PUBLIC_APP_URL environment variable..."
vercel env add NEXT_PUBLIC_APP_URL https://billiards-management-v1.vercel.app

echo "Redeploying the project to apply the changes..."
vercel --prod

echo "Setup complete! Your Vercel project should now use the correct redirect URLs." 