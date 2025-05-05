-- Create Role table
CREATE TABLE IF NOT EXISTS "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{"sections":{}}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- Create unique index on role name
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_key" ON "roles"("name");

-- Create DashboardSection table
CREATE TABLE IF NOT EXISTS "dashboard_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_sections_pkey" PRIMARY KEY ("id")
);

-- Create unique index on section key
CREATE UNIQUE INDEX IF NOT EXISTS "dashboard_sections_key_key" ON "dashboard_sections"("key");

-- Add role_id column to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_attribute 
        WHERE attrelid = 'profiles'::regclass 
        AND attname = 'role_id' 
        AND NOT attisdropped
    ) THEN
        ALTER TABLE "profiles" ADD COLUMN "role_id" UUID;
        
        -- Add foreign key constraint
        ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_id_fkey" 
        FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Populate roles based on existing UserRole enum
INSERT INTO "roles" ("id", "name", "description", "permissions") 
VALUES
  (gen_random_uuid(), 'SUPERADMIN', 'Super Administrator with full access', 
   '{"sections":{"dashboard":{"view":true,"create":true,"edit":true,"delete":true},"inventory":{"view":true,"create":true,"edit":true,"delete":true},"tables":{"view":true,"create":true,"edit":true,"delete":true},"finance":{"view":true,"create":true,"edit":true,"delete":true},"reports":{"view":true,"create":true,"edit":true,"delete":true},"admin":{"view":true,"create":true,"edit":true,"delete":true},"admin.users":{"view":true,"create":true,"edit":true,"delete":true},"admin.roles":{"view":true,"create":true,"edit":true,"delete":true},"admin.companies":{"view":true,"create":true,"edit":true,"delete":true}}}')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

INSERT INTO "roles" ("id", "name", "description", "permissions") 
VALUES
  (gen_random_uuid(), 'ADMIN', 'Administrator with company-wide access', 
   '{"sections":{"dashboard":{"view":true,"create":true,"edit":true,"delete":true},"inventory":{"view":true,"create":true,"edit":true,"delete":true},"tables":{"view":true,"create":true,"edit":true,"delete":true},"finance":{"view":true,"create":true,"edit":true,"delete":true},"reports":{"view":true,"create":true,"edit":true,"delete":true},"admin":{"view":true},"admin.users":{"view":true,"create":true,"edit":true,"delete":true}}}')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

INSERT INTO "roles" ("id", "name", "description", "permissions") 
VALUES
  (gen_random_uuid(), 'SELLER', 'Sales staff with limited access', 
   '{"sections":{"dashboard":{"view":true},"inventory":{"view":true},"tables":{"view":true,"create":true,"edit":true},"finance":{"view":true,"create":true},"reports":{"view":true}}}')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

INSERT INTO "roles" ("id", "name", "description", "permissions") 
VALUES
  (gen_random_uuid(), 'USER', 'Basic user with minimal access', 
   '{"sections":{"dashboard":{"view":true},"tables":{"view":true}}}')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

-- Seed dashboard sections
INSERT INTO "dashboard_sections" ("key", "title", "description", "icon", "order") 
VALUES
  ('dashboard', 'Dashboard', 'Main overview dashboard', 'layout-dashboard', 10),
  ('inventory', 'Inventory', 'Manage inventory items and categories', 'package', 20),
  ('tables', 'Tables', 'Manage billiard tables and reservations', 'table-2', 30),
  ('finance', 'Finance', 'Track financial transactions', 'dollar-sign', 40),
  ('reports', 'Reports', 'Generate and view reports', 'bar-chart', 50),
  ('admin', 'Admin', 'Admin settings', 'settings', 60),
  ('admin.users', 'Users', 'Manage users', 'users', 61),
  ('admin.roles', 'Roles', 'Manage roles and permissions', 'shield', 62),
  ('admin.companies', 'Companies', 'Manage companies', 'building', 63)
ON CONFLICT (key) DO UPDATE SET 
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  "order" = EXCLUDED."order";

-- Update existing profiles to link to roles
UPDATE "profiles" p
SET "role_id" = r.id
FROM "roles" r
WHERE 
  (
    (p.role = 'SUPERADMIN' AND r.name = 'SUPERADMIN') OR
    (p.role = 'ADMIN' AND r.name = 'ADMIN') OR
    (p.role = 'SELLER' AND r.name = 'SELLER') OR
    (p.role = 'USER' AND r.name = 'USER')
  )
  AND p."role_id" IS NULL; 