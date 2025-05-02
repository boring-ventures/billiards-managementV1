# Boring Next.js Template

A modern Next.js template with Supabase authentication, profiles, and file uploads.

## 🚀 Features

- ⚡️ Next.js 14 with App Router
- 🔋 Prisma ORM with PostgreSQL
- 🔑 Authentication with Supabase Auth
- 🎨 Tailwind CSS + shadcn/ui
- 📁 File uploads with Supabase Storage
- 🔄 Type-safe database queries
- 🎭 Dark mode with next-themes
- 🛠 Complete TypeScript support
- 🔐 JWT-based auth metadata with role management
- 🛡️ Secure service role client with admin API endpoints
- 📊 Cross-company data operations for superadmins
- 📝 Security audit logging for compliance

## 📦 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

## 🛠 Setup

1. Fork the repository:
   - Go to [boring-next](https://github.com/yourusername/boring-next)
   - Click the "Fork" button in the top right corner
   - Clone your forked repository:
   ```bash
   git clone https://github.com/yourusername/boring-next.git
   cd boring-next
   ```

2. Install dependencies:
```bash
pnpm install
```

3. Set up your environment variables:
```bash
cp .env.example .env.local
```

4. Create a Supabase project:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project credentials from Settings > API
   - Create a storage bucket named "avatars" in Storage

5. Configure your `.env.local`:
```env
# Supabase Project Settings
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database URLs
DATABASE_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[YOUR-REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[YOUR-REGION].pooler.supabase.com:5432/postgres"

# Storage
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=avatars
```

6. Initialize Prisma:
```bash
pnpm prisma generate
pnpm prisma db push
```

7. Run database setup scripts:
```bash
# Create audit logs table
psql -h [YOUR-DB-HOST] -U postgres -d postgres -f scripts/create-admin-audit-logs.sql

# Create admin stored procedures
psql -h [YOUR-DB-HOST] -U postgres -d postgres -f scripts/create-admin-stored-procedures.sql
```

8. Migrate existing users to use app_metadata:
```bash
pnpm migrate-metadata
```

## 🚀 Development

Start the development server:
```bash
pnpm dev
```

Your app will be available at `http://localhost:3000`

## 🏗 Project Structure

```
├── app/                   # Next.js App Router
│   ├── api/              # API routes
│   │   ├── admin/       # Admin-only API endpoints
│   ├── auth/             # Auth routes
│   └── (dashboard)/      # Protected routes
├── components/           # React components
│   ├── ui/              # UI components
│   └── settings/        # Settings components
├── docs/                 # Project documentation
│   ├── auth-metadata.md # Auth metadata implementation
│   └── secure-service-role.md # Service role client docs
├── lib/                  # Utility functions
│   ├── admin/           # Admin utilities
│   ├── auth/            # Auth utilities
│   ├── auth-metadata.ts # JWT metadata management
│   ├── serverClient.ts  # Secure service role client
│   └── middleware/      # Middleware components
├── scripts/             # Database scripts
├── providers/           # React context providers
└── public/              # Static assets
```

## 📚 Advanced Features

### Auth Metadata with JWT Claims

The project uses Supabase JWT claims (app_metadata) to store user roles and company assignments. This provides better performance and security by reducing database queries for permission checks.

See `docs/auth-metadata.md` for implementation details.

### Secure Service Role Client

The project includes a secure service role client for admin operations that need to bypass RLS policies. This implementation includes:

- Server-side only validation with `server-only` package
- Runtime checks to prevent client-side usage
- Security audit logging for all privileged operations
- Admin-only API endpoints with strict access control

See `docs/secure-service-role.md` for implementation details.

### Admin API Endpoints

The following API endpoints are available for superadmins:

- `/api/admin/companies` - Manage companies across the platform
- `/api/admin/users` - Manage users across all companies
- `/api/admin/audit-logs` - View security audit logs

All admin endpoints use the `verifySuperAdmin` middleware which verifies the user has superadmin privileges and logs all access attempts.

## 📝 Database Management

### Push schema changes
```bash
pnpm prisma db push
```

### Reset database
```bash
pnpm prisma db reset
```

### Open Prisma Studio
```bash
pnpm prisma studio
```

## 🔧 Common Issues & Solutions

### Image Loading Issues
Add your Supabase storage domain to `next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "your-project-ref.supabase.co"
    ],
  },
}
```

### Database Connection Issues
- Verify your DATABASE_URL in .env.local
- Ensure you're using the correct Supabase connection strings
- Check if your IP is allowed in Supabase dashboard

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)


## Credentials

### Supabase
- Project name: POSITIVE-Next-Template
- DB Password: e9zKY_Km5HbkiiF
- Anon Public Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zmd2ZmhwbWljd3B0dXBqeWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNjY4NDksImV4cCI6MjA1NTY0Mjg0OX0.OiccFqJXdAM6tPIvULA3EaZxtCOsuwhiMugjyGzXNFk
- Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zmd2ZmhwbWljd3B0dXBqeWtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA2Njg0OSwiZXhwIjoyMDU1NjQyODQ5fQ.jOx413xoAvBdez9ofCGU8DEIunRI2SU9SXWJsm_IY2Q
- Project URL: https://swfgvfhpmicwptupjyko.supabase.co

- PRISMA URLs:
    # Connect to Supabase via connection pooling with Supavisor.
    DATABASE_URL="postgresql://postgres.swfgvfhpmicwptupjyko:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

    # Direct connection to the database. Used for migrations.
    DIRECT_URL="postgresql://postgres.swfgvfhpmicwptupjyko:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
        
