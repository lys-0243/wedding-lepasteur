import { PrismaClient } from "./generated/prisma/client.ts";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const userId = "cmqpl24qb00026gltcds8c41s";
  const eventId = "cmqpl8t8400036glth26zqz1u";
  const tableId = "cmqqkjucw00043klt63knvqse";

  console.log("Simulating TableDetailPage queries...");
  
  // 1. Verify event
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId: userId },
    select: { id: true },
  });
  console.log("Event verification result:", event);

  // 2. Fetch table
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      guests: {
        orderBy: { lastName: "asc" },
      },
    },
  });
  console.log("Table fetch result (raw):", table ? { id: table.id, name: table.name, eventId: table.eventId, guestsCount: table.guests.length } : null);

  if (!table) {
    console.log("Table not found!");
  } else if (table.eventId !== eventId) {
    console.log(`Table eventId mismatch! table.eventId=${table.eventId}, eventId=${eventId}`);
  } else {
    console.log("Table matches event perfectly!");
  }
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
    pool.end();
  });
