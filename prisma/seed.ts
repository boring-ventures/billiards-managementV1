import {
  PrismaClient,
  UserRole,
  InventoryTransactionType,
  FinanceCategoryType,
} from "@prisma/client";

const prisma = new PrismaClient();

// Define dashboard sections with their respective titles and descriptions
const dashboardSections = [
  {
    key: "dashboard",
    title: "Dashboard",
    description: "Main overview dashboard",
    icon: "layout-dashboard",
    order: 10,
  },
  {
    key: "inventory",
    title: "Inventory",
    description: "Manage inventory items and categories",
    icon: "package",
    order: 20,
  },
  {
    key: "tables",
    title: "Tables",
    description: "Manage billiard tables and reservations",
    icon: "table-2",
    order: 30,
  },
  {
    key: "finance",
    title: "Finance",
    description: "Track financial transactions",
    icon: "dollar-sign",
    order: 40,
  },
  {
    key: "reports",
    title: "Reports",
    description: "Generate and view reports",
    icon: "bar-chart",
    order: 50,
  },
  {
    key: "admin",
    title: "Admin",
    description: "Admin settings",
    icon: "settings",
    order: 60,
  },
  {
    key: "admin.users",
    title: "Users",
    description: "Manage users",
    icon: "users",
    order: 61,
  },
  {
    key: "admin.roles",
    title: "Roles",
    description: "Manage roles and permissions",
    icon: "shield",
    order: 62,
  },
  {
    key: "admin.companies",
    title: "Companies",
    description: "Manage companies",
    icon: "building",
    order: 63,
  },
];

// Permission structures for different roles
const rolePermissions = {
  SUPERADMIN: {
    sections: {
      dashboard: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      tables: { view: true, create: true, edit: true, delete: true },
      finance: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      admin: { view: true, create: true, edit: true, delete: true },
      "admin.users": { view: true, create: true, edit: true, delete: true },
      "admin.roles": { view: true, create: true, edit: true, delete: true },
      "admin.companies": { view: true, create: true, edit: true, delete: true },
    },
  },
  ADMIN: {
    sections: {
      dashboard: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      tables: { view: true, create: true, edit: true, delete: true },
      finance: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: true, edit: true, delete: true },
      admin: { view: true },
      "admin.users": { view: true, create: true, edit: true, delete: true },
    },
  },
  SELLER: {
    sections: {
      dashboard: { view: true },
      inventory: { view: true },
      tables: { view: true, create: true, edit: true },
      finance: { view: true, create: true },
      reports: { view: true },
    },
  },
  USER: {
    sections: {
      dashboard: { view: true },
      tables: { view: true },
    },
  },
};

async function main() {
  console.log("Starting seed process...");

  // Clean up existing data to prevent duplicates
  await cleanupData();

  // Seed dashboard sections
  console.log("Creating dashboard sections...");
  for (const section of dashboardSections) {
    await prisma.dashboardSection.upsert({
      where: { key: section.key },
      update: section,
      create: section,
    });
  }
  console.log("Dashboard sections created");

  // Create roles if they don't exist yet
  console.log("Creating roles...");
  const roles = {
    SUPERADMIN: await prisma.role.upsert({
      where: { name: "SUPERADMIN" },
      update: { permissions: rolePermissions.SUPERADMIN },
      create: {
        name: "SUPERADMIN",
        description: "Super Administrator with full access",
        permissions: rolePermissions.SUPERADMIN,
      },
    }),
    ADMIN: await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: { permissions: rolePermissions.ADMIN },
      create: {
        name: "ADMIN",
        description: "Administrator with company-wide access",
        permissions: rolePermissions.ADMIN,
      },
    }),
    SELLER: await prisma.role.upsert({
      where: { name: "SELLER" },
      update: { permissions: rolePermissions.SELLER },
      create: {
        name: "SELLER",
        description: "Sales staff with limited access",
        permissions: rolePermissions.SELLER,
      },
    }),
    USER: await prisma.role.upsert({
      where: { name: "USER" },
      update: { permissions: rolePermissions.USER },
      create: {
        name: "USER",
        description: "Basic user with minimal access",
        permissions: rolePermissions.USER,
      },
    }),
  };
  console.log("Roles created");

  // Migrate existing profiles to use new role IDs
  console.log("Migrating existing profiles to use new roles...");
  const profiles = await prisma.profile.findMany();
  for (const profile of profiles) {
    // Map old enum role to new role ID
    const roleKey = profile.role as keyof typeof roles;
    const roleId = roles[roleKey]?.id;
    
    if (roleId) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { roleId },
      });
      console.log(`Updated profile ${profile.id} with role ${roleKey}`);
    }
  }

  // Continue with the rest of the seeding process...
  // Create a superadmin user without company association
  const superadmin = await prisma.profile.upsert({
    where: { userId: "00000000-0000-0000-0000-000000000001" },
    update: {
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPERADMIN,
      roleId: roles.SUPERADMIN.id,
      active: true,
    },
    create: {
      userId: "00000000-0000-0000-0000-000000000001",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPERADMIN,
      roleId: roles.SUPERADMIN.id,
      active: true,
    },
  });

  // Create a company
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000004" },
    update: {
      name: "Billiards Alpha",
      phone: "+59170000000",
      address: "Av. Libertadores #1000",
    },
    create: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Billiards Alpha",
      phone: "+59170000000",
      address: "Av. Libertadores #1000",
    },
  });

  // Create admin and staff users linked to the company
  const alice = await prisma.profile.upsert({
    where: { userId: "00000000-0000-0000-0000-000000000002" },
    update: {
      companyId: company.id,
      firstName: "Alice",
      lastName: "Johnson",
      role: UserRole.ADMIN,
      roleId: roles.ADMIN.id,
      active: true,
    },
    create: {
      userId: "00000000-0000-0000-0000-000000000002",
      companyId: company.id,
      firstName: "Alice",
      lastName: "Johnson",
      role: UserRole.ADMIN,
      roleId: roles.ADMIN.id,
      active: true,
    },
  });

  const bob = await prisma.profile.upsert({
    where: { userId: "00000000-0000-0000-0000-000000000003" },
    update: {
      companyId: company.id,
      firstName: "Bob",
      lastName: "Smith",
      role: UserRole.SELLER,
      roleId: roles.SELLER.id,
      active: true,
    },
    create: {
      userId: "00000000-0000-0000-0000-000000000003",
      companyId: company.id,
      firstName: "Bob",
      lastName: "Smith",
      role: UserRole.SELLER,
      roleId: roles.SELLER.id,
      active: true,
    },
  });

  console.log("Created or updated company users:", { alice, bob });

  // Create tables
  const table1 = await prisma.table.create({
    data: {
      companyId: company.id,
      name: "Table 1",
      status: "AVAILABLE",
      hourlyRate: 50.00,
    },
  });

  const table2 = await prisma.table.create({
    data: {
      companyId: company.id,
      name: "Table 2",
      status: "AVAILABLE",
      hourlyRate: 40.00,
    },
  });

  console.log("Created tables:", { table1, table2 });

  // Create inventory category and items
  const barCategory = await prisma.inventoryCategory.create({
    data: {
      companyId: company.id,
      name: "Bar",
      description: "Bebidas y refrescos",
    },
  });

  console.log("Created inventory category:", barCategory);

  const cerveza = await prisma.inventoryItem.create({
    data: {
      companyId: company.id,
      categoryId: barCategory.id,
      name: "Cerveza",
      quantity: 50,
      criticalThreshold: 10,
      price: 20.00,
    },
  });

  const soda = await prisma.inventoryItem.create({
    data: {
      companyId: company.id,
      categoryId: barCategory.id,
      name: "Soda",
      quantity: 30,
      criticalThreshold: 5,
      price: 10.00,
    },
  });

  console.log("Created inventory items:", { cerveza, soda });

  // Create a table session 
  const startTime = new Date();
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 45); // 45 minutes later

  const tableSession = await prisma.tableSession.create({
    data: {
      companyId: company.id,
      tableId: table1.id,
      staffId: bob.id,
      startedAt: startTime,
      endedAt: endTime,
      durationMin: 45,
      totalCost: 37.50, // 45 minutes of 50/hour rate = 37.50
      status: "CLOSED",
    },
  });

  console.log("Created table session:", tableSession);

  // Create a POS order linked to the session
  const posOrder = await prisma.posOrder.create({
    data: {
      companyId: company.id,
      orderNumber: "ORD-001",
      staffId: bob.id,
      tableSessionId: tableSession.id, 
      totalAmount: 50.00, // 2 cervezas (20.00 each) + 1 soda (10.00) = 50.00
      paidAmount: 50.00,
    },
  });

  console.log("Created POS order:", posOrder);

  // Create order items
  const orderItems = await Promise.all([
    prisma.posOrderItem.create({
      data: {
        orderId: posOrder.id,
        itemId: cerveza.id,
        quantity: 2,
        unitPrice: 20.00,
        lineTotal: 40.00,
      },
    }),
    prisma.posOrderItem.create({
      data: {
        orderId: posOrder.id,
        itemId: soda.id,
        quantity: 1,
        unitPrice: 10.00,
        lineTotal: 10.00,
      },
    }),
  ]);

  console.log("Created order items:", orderItems);

  // Update inventory to reflect the order
  await prisma.inventoryTransaction.create({
    data: {
      companyId: company.id,
      itemId: cerveza.id,
      transactionType: InventoryTransactionType.OUTGOING,
      quantityDelta: -2, // Decrease by 2
      note: "Sale via POS order ORD-001",
    },
  });

  await prisma.inventoryTransaction.create({
    data: {
      companyId: company.id,
      itemId: soda.id,
      transactionType: InventoryTransactionType.OUTGOING,
      quantityDelta: -1, // Decrease by 1
      note: "Sale via POS order ORD-001",
    },
  });

  // Create finance categories
  const incomeCategory = await prisma.financeCategory.create({
    data: {
      companyId: company.id,
      name: "Ventas",
      categoryType: FinanceCategoryType.INCOME,
    },
  });

  const expenseCategory = await prisma.financeCategory.create({
    data: {
      companyId: company.id,
      name: "Compras",
      categoryType: FinanceCategoryType.EXPENSE,
    },
  });

  console.log("Created finance categories:", { incomeCategory, expenseCategory });

  // Create finance transactions
  const incomeTransaction = await prisma.financeTransaction.create({
    data: {
      companyId: company.id,
      categoryId: incomeCategory.id,
      amount: 100.00,
      transactionDate: new Date(),
      description: "Venta de bebidas",
    },
  });

  const expenseTransaction = await prisma.financeTransaction.create({
    data: {
      companyId: company.id,
      categoryId: expenseCategory.id,
      amount: 60.00,
      transactionDate: new Date(),
      description: "Compra de insumos",
    },
  });

  console.log("Created finance transactions:", { incomeTransaction, expenseTransaction });

  // Create a profile for the mock user
  const mockProfile = await prisma.profile.upsert({
    where: { userId: '123e4567-e89b-12d3-a456-426614174000' },
    update: {},
    create: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'Demo',
      lastName: 'User',
      role: UserRole.SUPERADMIN,
      active: true,
    },
  });

  // Create a profile for the real Supabase user
  const supabaseProfile = await prisma.profile.upsert({
    where: { userId: 'f4785505-d83c-4f72-beeb-4156a72ccdc5' },
    update: {},
    create: {
      userId: 'f4785505-d83c-4f72-beeb-4156a72ccdc5',
      firstName: 'Supabase',
      lastName: 'Admin',
      role: UserRole.SUPERADMIN,
      active: true,
    },
  });

  console.log("Created profiles:", { mockProfile, supabaseProfile });

  console.log("Seeding completed successfully!");
}

// Helper function to clean up existing data to prevent duplicates on re-runs
async function cleanupData() {
  console.log("Cleaning up existing data...");

  // Delete in proper order to respect foreign key constraints
  await prisma.financeTransaction.deleteMany({});
  await prisma.financeCategory.deleteMany({});
  await prisma.posOrderItem.deleteMany({});
  await prisma.posOrder.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.tableActivityLog.deleteMany({});
  await prisma.tableSession.deleteMany({});
  await prisma.tableReservation.deleteMany({});
  await prisma.tableMaintenance.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.inventoryCategory.deleteMany({});
  await prisma.table.deleteMany({});
  
  // Only delete company-linked profiles, keep the superadmin
  await prisma.profile.deleteMany({
    where: {
      companyId: {
        not: null
      }
    }
  });
  
  await prisma.company.deleteMany({});
  
  // Delete specific superadmin to avoid duplicates
  await prisma.profile.deleteMany({
    where: {
      userId: "00000000-0000-0000-0000-000000000001"
    }
  });
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
