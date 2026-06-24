import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const catalog = [
  { name: "Primus", isAlcoholic: true },
  { name: "Heineken", isAlcoholic: true },
  { name: "Turbo King", isAlcoholic: true },
  { name: "Class", isAlcoholic: true },
  { name: "Mutzig", isAlcoholic: true },
  { name: "Nkoyi Blonde", isAlcoholic: true },
  { name: "Nkoyi Black", isAlcoholic: true },
  { name: "Nkoyi Rumba", isAlcoholic: true },
  { name: "Tembo", isAlcoholic: true },
  { name: "Castel Beer", isAlcoholic: true },
  { name: "Beaufort", isAlcoholic: true },
  { name: "33 Export", isAlcoholic: true },
  { name: "Doppel Munich", isAlcoholic: true },
  { name: "Coca-Cola", isAlcoholic: false },
  { name: "Fanta", isAlcoholic: false },
  { name: "Sprite", isAlcoholic: false },
  { name: "Vital'O", isAlcoholic: false },
  { name: "Maltina", isAlcoholic: false },
  { name: "Schweppes", isAlcoholic: false },
  { name: "Energy Malt", isAlcoholic: false },
  { name: "Top", isAlcoholic: false },
  { name: "D'jino", isAlcoholic: false },
  { name: "World Cola", isAlcoholic: false },
  { name: "Youzou", isAlcoholic: false },
  { name: "XXL Energy", isAlcoholic: false },
];

async function main() {
  for (const item of catalog) {
    await prisma.drink.upsert({
      where: {
        name_isAlcoholic: {
          name: item.name,
          isAlcoholic: item.isAlcoholic,
        },
      },
      update: {},
      create: {
        name: item.name,
        isAlcoholic: item.isAlcoholic,
        category: item.isAlcoholic ? "Alcool" : "Sans alcool",
        imageUrl: null,
      },
    });
  }

  console.log(`Seed complete: ${catalog.length} boissons synchronisees.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
