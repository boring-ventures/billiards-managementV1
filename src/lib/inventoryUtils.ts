import { PrismaClient, InventoryTransactionType } from "@prisma/client";
import prisma from "./prisma";

/**
 * Adjusts inventory quantity and creates a transaction record
 */
export async function adjustInventoryQuantity({
  itemId,
  companyId,
  quantityDelta,
  transactionType,
  note,
  staffId,
  posOrderItemId,
}: {
  itemId: string;
  companyId: string;
  quantityDelta: number;
  transactionType: InventoryTransactionType;
  note?: string;
  staffId?: string;
  posOrderItemId?: string;
}) {
  // Start a transaction to ensure consistency
  return await prisma.$transaction(async (tx) => {
    // Get current inventory item
    const item = await tx.inventoryItem.findUnique({
      where: { id: itemId },
      select: { quantity: true },
    });

    if (!item) {
      throw new Error(`Inventory item with ID ${itemId} not found`);
    }

    // Update quantity
    const newQuantity = item.quantity + quantityDelta;
    
    // Prevent negative inventory (except for ADJUSTMENT type which can be used for corrections)
    if (newQuantity < 0 && transactionType !== 'ADJUSTMENT') {
      throw new Error(`Insufficient stock for item ID ${itemId}`);
    }
    
    // Update inventory item quantity
    const updatedItem = await tx.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    });

    // Create transaction record
    const transaction = await tx.inventoryTransaction.create({
      data: {
        itemId,
        companyId,
        quantityDelta,
        transactionType,
        note: note || null,
        staffId: staffId || null,
        posOrderItemId: posOrderItemId || null,
      },
    });

    return {
      item: updatedItem,
      transaction,
    };
  });
}

/**
 * Checks if an inventory item has critical stock level
 */
export async function checkCriticalStockLevel(itemId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      name: true,
      quantity: true,
      criticalThreshold: true,
    },
  });

  if (!item) {
    throw new Error(`Inventory item with ID ${itemId} not found`);
  }

  const isCritical = item.quantity <= item.criticalThreshold;

  return {
    itemId: item.id,
    name: item.name,
    quantity: item.quantity,
    threshold: item.criticalThreshold,
    isCritical,
  };
}

/**
 * Gets all inventory items with critical stock levels for a company
 */
export async function getCriticalStockItems(companyId: string) {
  const items = await prisma.inventoryItem.findMany({
    where: {
      companyId,
      quantity: {
        lte: prisma.inventoryItem.fields.criticalThreshold,
      },
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      quantity: 'asc',
    },
  });

  return items;
}

/**
 * Create an inventory transaction for a POS order
 */
export async function createPosInventoryTransaction({
  itemId,
  companyId,
  quantity,
  posOrderItemId,
  staffId,
}: {
  itemId: string;
  companyId: string;
  quantity: number;
  posOrderItemId: string;
  staffId?: string;
}) {
  return await adjustInventoryQuantity({
    itemId,
    companyId,
    quantityDelta: -quantity, // Negative as stock is reduced
    transactionType: 'OUTGOING',
    note: 'POS Order',
    staffId,
    posOrderItemId,
  });
} 