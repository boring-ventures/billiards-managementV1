import {
  PrismaClient,
  InventoryTransactionType,
  FinanceCategoryType,
} from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed process...");

  // Create companies
  const company1 = await prisma.company.create({
    data: {
      name: "Cue Masters Billiards",
      address: "123 Main Street, Downtown, NY 10001",
      phone: "(212) 555-1234"
    },
  });

  const company2 = await prisma.company.create({
    data: {
      name: "Pocket Aces Pool Hall",
      address: "456 Broadway Ave, Los Angeles, CA 90001",
      phone: "(323) 555-6789"
    },
  });

  console.log("Created companies");

  // Create tables for each company
  const tables1 = await Promise.all(
    Array.from({ length: 6 }, (_, i) => i + 1).map((num) =>
      prisma.table.create({
        data: {
          companyId: company1.id,
          name: `Table ${num}`,
          status: "AVAILABLE",
          hourlyRate: 15 + (num % 3) * 5, // Vary rates: 15, 20, 25
        },
      })
    )
  );

  const tables2 = await Promise.all(
    Array.from({ length: 4 }, (_, i) => i + 1).map((num) =>
      prisma.table.create({
        data: {
          companyId: company2.id,
          name: `Table ${num}`,
          status: "AVAILABLE",
          hourlyRate: 12 + (num % 2) * 8, // Vary rates: 12, 20
        },
      })
    )
  );

  console.log("Created tables");

  // Create inventory categories
  const drinksCat1 = await prisma.inventoryCategory.create({
    data: {
      companyId: company1.id,
      name: "Drinks",
      description: "Beverages and refreshments",
    },
  });

  const foodCat1 = await prisma.inventoryCategory.create({
    data: {
      companyId: company1.id,
      name: "Food",
      description: "Snacks and meals",
    },
  });

  const equipmentCat1 = await prisma.inventoryCategory.create({
    data: {
      companyId: company1.id,
      name: "Equipment",
      description: "Cues, chalk, and other billiards equipment",
    },
  });

  const drinksCat2 = await prisma.inventoryCategory.create({
    data: {
      companyId: company2.id,
      name: "Beverages",
      description: "All drinks",
    },
  });

  const snacksCat2 = await prisma.inventoryCategory.create({
    data: {
      companyId: company2.id,
      name: "Snacks",
      description: "Quick bites and appetizers",
    },
  });

  console.log("Created inventory categories");

  // Create inventory items
  const items1 = await Promise.all([
    // Drinks for company 1
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: drinksCat1.id,
        name: "Soft Drink",
        sku: "DRK-001",
        quantity: 100,
        criticalThreshold: 20,
        price: 2.5,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: drinksCat1.id,
        name: "Bottled Water",
        sku: "DRK-002",
        quantity: 150,
        criticalThreshold: 30,
        price: 1.5,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: drinksCat1.id,
        name: "Beer",
        sku: "DRK-003",
        quantity: 75,
        criticalThreshold: 15,
        price: 5.0,
      },
    }),

    // Food for company 1
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: foodCat1.id,
        name: "Nachos",
        sku: "FOOD-001",
        quantity: 30,
        criticalThreshold: 5,
        price: 7.5,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: foodCat1.id,
        name: "Pizza Slice",
        sku: "FOOD-002",
        quantity: 40,
        criticalThreshold: 8,
        price: 4.0,
      },
    }),

    // Equipment for company 1
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: equipmentCat1.id,
        name: "Cue Chalk",
        sku: "EQ-001",
        quantity: 50,
        criticalThreshold: 10,
        price: 1.0,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        companyId: company1.id,
        categoryId: equipmentCat1.id,
        name: "House Cue",
        sku: "EQ-002",
        quantity: 20,
        criticalThreshold: 3,
        price: 25.0,
      },
    }),

    // Items for company 2
    prisma.inventoryItem.create({
      data: {
        companyId: company2.id,
        categoryId: drinksCat2.id,
        name: "Cola",
        sku: "B-DRK-001",
        quantity: 80,
        criticalThreshold: 15,
        price: 2.25,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        companyId: company2.id,
        categoryId: drinksCat2.id,
        name: "Craft Beer",
        sku: "B-DRK-002",
        quantity: 60,
        criticalThreshold: 12,
        price: 6.5,
      },
    }),
    prisma.inventoryItem.create({
      data: {
        companyId: company2.id,
        categoryId: snacksCat2.id,
        name: "French Fries",
        sku: "B-FOOD-001",
        quantity: 45,
        criticalThreshold: 10,
        price: 5.0,
      },
    }),
  ]);

  console.log("Created inventory items");

  // Create finance categories
  const income1 = await prisma.financeCategory.create({
    data: {
      companyId: company1.id,
      name: "Table Revenue",
      categoryType: FinanceCategoryType.INCOME,
    },
  });

  const income2 = await prisma.financeCategory.create({
    data: {
      companyId: company1.id,
      name: "Food & Beverage Sales",
      categoryType: FinanceCategoryType.INCOME,
    },
  });

  const expense1 = await prisma.financeCategory.create({
    data: {
      companyId: company1.id,
      name: "Utilities",
      categoryType: FinanceCategoryType.EXPENSE,
    },
  });

  const expense2 = await prisma.financeCategory.create({
    data: {
      companyId: company1.id,
      name: "Staff Salaries",
      categoryType: FinanceCategoryType.EXPENSE,
    },
  });

  const expense3 = await prisma.financeCategory.create({
    data: {
      companyId: company1.id,
      name: "Maintenance",
      categoryType: FinanceCategoryType.EXPENSE,
    },
  });

  // Also for company 2
  const income1_c2 = await prisma.financeCategory.create({
    data: {
      companyId: company2.id,
      name: "Table Revenue",
      categoryType: FinanceCategoryType.INCOME,
    },
  });

  const expense1_c2 = await prisma.financeCategory.create({
    data: {
      companyId: company2.id,
      name: "Operating Expenses",
      categoryType: FinanceCategoryType.EXPENSE,
    },
  });

  console.log("Created finance categories");

  // Create finance transactions
  const transactions = await Promise.all([
    // Income for company 1
    prisma.financeTransaction.create({
      data: {
        companyId: company1.id,
        categoryId: income1.id,
        amount: 450.0,
        transactionDate: new Date("2023-05-01"),
        description: "Weekend table revenue",
      },
    }),
    prisma.financeTransaction.create({
      data: {
        companyId: company1.id,
        categoryId: income2.id,
        amount: 325.5,
        transactionDate: new Date("2023-05-01"),
        description: "Weekend F&B sales",
      },
    }),

    // Expenses for company 1
    prisma.financeTransaction.create({
      data: {
        companyId: company1.id,
        categoryId: expense1.id,
        amount: 180.25,
        transactionDate: new Date("2023-05-05"),
        description: "Monthly electricity bill",
      },
    }),
    prisma.financeTransaction.create({
      data: {
        companyId: company1.id,
        categoryId: expense2.id,
        amount: 1200.0,
        transactionDate: new Date("2023-05-15"),
        description: "Staff salaries - first half of May",
      },
    }),
    prisma.financeTransaction.create({
      data: {
        companyId: company1.id,
        categoryId: expense3.id,
        amount: 75.0,
        transactionDate: new Date("2023-05-10"),
        description: "Table cloth replacement",
      },
    }),

    // For company 2
    prisma.financeTransaction.create({
      data: {
        companyId: company2.id,
        categoryId: income1_c2.id,
        amount: 320.0,
        transactionDate: new Date("2023-05-01"),
        description: "Weekend table revenue",
      },
    }),
    prisma.financeTransaction.create({
      data: {
        companyId: company2.id,
        categoryId: expense1_c2.id,
        amount: 150.0,
        transactionDate: new Date("2023-05-05"),
        description: "Weekly cleaning service",
      },
    }),
  ]);

  console.log("Created finance transactions");

  // Create table reservations
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const reservation1 = await prisma.tableReservation.create({
    data: {
      companyId: company1.id,
      tableId: tables1[0].id,
      customerName: "John Smith",
      customerPhone: "555-123-4567",
      reservedFrom: new Date(tomorrow.setHours(18, 0, 0, 0)),
      reservedTo: new Date(tomorrow.setHours(20, 0, 0, 0)),
      status: "CONFIRMED",
    },
  });

  const reservation2 = await prisma.tableReservation.create({
    data: {
      companyId: company1.id,
      tableId: tables1[1].id,
      customerName: "Emily Johnson",
      customerPhone: "555-987-6543",
      reservedFrom: new Date(tomorrow.setHours(19, 0, 0, 0)),
      reservedTo: new Date(tomorrow.setHours(21, 0, 0, 0)),
      status: "PENDING",
    },
  });

  console.log("Created table reservations");

  // Create table maintenance records
  const maintenance1 = await prisma.tableMaintenance.create({
    data: {
      companyId: company1.id,
      tableId: tables1[2].id,
      description: "Replace felt and bumpers",
      maintenanceAt: new Date("2023-05-15T10:00:00Z"),
      cost: 350.0,
    },
  });

  const maintenance2 = await prisma.tableMaintenance.create({
    data: {
      companyId: company2.id,
      tableId: tables2[0].id,
      description: "Regular maintenance and leveling",
      maintenanceAt: new Date("2023-05-20T09:00:00Z"),
      cost: 150.0,
    },
  });

  console.log("Created table maintenance records");

  // Create inventory transactions
  const invTransaction1 = await prisma.inventoryTransaction.create({
    data: {
      companyId: company1.id,
      itemId: items1[0].id, // Soft Drink
      transactionType: InventoryTransactionType.INCOMING,
      quantityDelta: 50,
      note: "Initial stock order",
    },
  });

  const invTransaction2 = await prisma.inventoryTransaction.create({
    data: {
      companyId: company1.id,
      itemId: items1[2].id, // Beer
      transactionType: InventoryTransactionType.OUTGOING,
      quantityDelta: -10,
      note: "Weekend sales",
    },
  });

  const invTransaction3 = await prisma.inventoryTransaction.create({
    data: {
      companyId: company1.id,
      itemId: items1[3].id, // Nachos
      transactionType: InventoryTransactionType.ADJUSTMENT,
      quantityDelta: -2,
      note: "Inventory count adjustment",
    },
  });

  console.log("Created inventory transactions");

  // Create activity logs
  const activityLogs = await Promise.all([
    prisma.tableActivityLog.create({
      data: {
        companyId: company1.id,
        action: "CREATE",
        entityType: "TABLE",
        entityId: tables1[0].id,
        metadata: { description: "New table added to system" },
      },
    }),
    prisma.tableActivityLog.create({
      data: {
        companyId: company1.id,
        action: "UPDATE",
        entityType: "INVENTORY",
        entityId: items1[0].id,
        metadata: {
          description: "Stock updated",
          previousQuantity: 50,
          newQuantity: 100,
        },
      },
    }),
    prisma.tableActivityLog.create({
      data: {
        companyId: company2.id,
        action: "CREATE",
        entityType: "RESERVATION",
        entityId: reservation1.id,
        metadata: { description: "New reservation created" },
      },
    }),
  ]);

  console.log("Created activity logs");

  // Create a simulated complete table session with POS order
  const completedSession = await prisma.tableSession.create({
    data: {
      companyId: company1.id,
      tableId: tables1[0].id,
      startedAt: new Date("2023-05-01T14:00:00Z"),
      endedAt: new Date("2023-05-01T16:30:00Z"),
      durationMin: 150,
      totalCost: 37.5, // 2.5 hours at $15/hour
      status: "CLOSED",
    },
  });

  const posOrder = await prisma.posOrder.create({
    data: {
      companyId: company1.id,
      orderNumber: "ORD-001",
      tableSessionId: completedSession.id,
      totalAmount: 52.5, // Table fee + food/drinks
      paidAmount: 52.5,
    },
  });

  const orderItems = await Promise.all([
    // Table charge is implicitly included via the session
    // Add some food and drinks to the order
    prisma.posOrderItem.create({
      data: {
        orderId: posOrder.id,
        itemId: items1[0].id, // Soft Drink
        quantity: 2,
        unitPrice: 2.5,
        lineTotal: 5.0,
      },
    }),
    prisma.posOrderItem.create({
      data: {
        orderId: posOrder.id,
        itemId: items1[3].id, // Nachos
        quantity: 1,
        unitPrice: 7.5,
        lineTotal: 7.5,
      },
    }),
    prisma.posOrderItem.create({
      data: {
        orderId: posOrder.id,
        itemId: items1[2].id, // Beer
        quantity: 1,
        unitPrice: 5.0,
        lineTotal: 5.0,
      },
    }),
  ]);

  console.log("Created simulated table session with POS order");

  // Add a currently active table session
  const activeSession = await prisma.tableSession.create({
    data: {
      companyId: company1.id,
      tableId: tables1[3].id,
      startedAt: new Date(Date.now() - 3600000), // Started 1 hour ago
      status: "ACTIVE",
    },
  });

  // Create a POS order for the active session
  const activeOrder = await prisma.posOrder.create({
    data: {
      companyId: company1.id,
      orderNumber: "ORD-002",
      tableSessionId: activeSession.id,
      totalAmount: 15.0, // Food/drinks only so far
      paidAmount: 0, // Not paid yet
    },
  });

  const activeOrderItems = await Promise.all([
    prisma.posOrderItem.create({
      data: {
        orderId: activeOrder.id,
        itemId: items1[1].id, // Bottled Water
        quantity: 2,
        unitPrice: 1.5,
        lineTotal: 3.0,
      },
    }),
    prisma.posOrderItem.create({
      data: {
        orderId: activeOrder.id,
        itemId: items1[4].id, // Pizza Slice
        quantity: 3,
        unitPrice: 4.0,
        lineTotal: 12.0,
      },
    }),
  ]);

  console.log("Created active table session with ongoing order");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
