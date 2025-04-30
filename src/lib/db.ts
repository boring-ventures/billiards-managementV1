import { PrismaClient } from "@prisma/client";

// Add prisma to the global type
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient();

// In development, we want to use a global variable so that hot reloads
// don't create a new PrismaClient each time
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
