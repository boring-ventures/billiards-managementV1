-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '{"sections":{}}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_sections" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_sections_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "role_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_sections_key_key" ON "dashboard_sections"("key");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Populate roles based on existing UserRole enum
INSERT INTO "roles" ("id", "name", "permissions") VALUES
  (gen_random_uuid(), 'SUPERADMIN', '{"sections":{"dashboard":{"view":true,"create":true,"edit":true,"delete":true},"inventory":{"view":true,"create":true,"edit":true,"delete":true},"tables":{"view":true,"create":true,"edit":true,"delete":true},"finance":{"view":true,"create":true,"edit":true,"delete":true},"reports":{"view":true,"create":true,"edit":true,"delete":true},"admin":{"view":true,"create":true,"edit":true,"delete":true},"admin.users":{"view":true,"create":true,"edit":true,"delete":true},"admin.roles":{"view":true,"create":true,"edit":true,"delete":true},"admin.companies":{"view":true,"create":true,"edit":true,"delete":true}}}'),
  (gen_random_uuid(), 'ADMIN', '{"sections":{"dashboard":{"view":true,"create":true,"edit":true,"delete":true},"inventory":{"view":true,"create":true,"edit":true,"delete":true},"tables":{"view":true,"create":true,"edit":true,"delete":true},"finance":{"view":true,"create":true,"edit":true,"delete":true},"reports":{"view":true,"create":true,"edit":true,"delete":true},"admin":{"view":true},"admin.users":{"view":true,"create":true,"edit":true,"delete":true}}}'),
  (gen_random_uuid(), 'SELLER', '{"sections":{"dashboard":{"view":true},"inventory":{"view":true},"tables":{"view":true,"create":true,"edit":true},"finance":{"view":true,"create":true},"reports":{"view":true}}}'),
  (gen_random_uuid(), 'USER', '{"sections":{"dashboard":{"view":true},"tables":{"view":true}}}'); 