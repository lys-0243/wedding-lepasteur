import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const catalog = [
  {
    name: "Primus",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394793/lepasteur/boissons/zavjhzjsol5ugncfca4v.jpg",
  },
  {
    name: "Heineken",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782307676/lepasteur/boissons/x69im59yurwq36yc4awp.png",
  },
  {
    name: "Turbo King",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394795/lepasteur/boissons/kp5cvzdw9uhganerckqh.jpg",
  },
  {
    name: "Class",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394796/lepasteur/boissons/xqgsigm6motzbdsd2nkc.jpg",
  },
  {
    name: "Mutzig",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394794/lepasteur/boissons/w0arvdf4l7yrycsgy9fe.jpg",
  },
  {
    name: "Nkoyi Blonde",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782306760/lepasteur/boissons/xg8c75sct63zca11exfv.webp",
  },
  {
    name: "Nkoyi Black",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782307569/lepasteur/boissons/bmfsnxqk2ubjqqgysw5e.webp",
  },
  {
    name: "Nkoyi Rumba",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394794/lepasteur/boissons/jhja2ckehqr4y2zqj7oo.jpg",
  },
  {
    name: "Tembo",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394796/lepasteur/boissons/oi7oe9wvrdcxwzja01rt.jpg",
  },
  {
    name: "Castel Beer",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397275/lepasteur/boissons/kwlxmsi7viwskxe043ie.jpg",
  },
  {
    name: "Beaufort",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397273/lepasteur/boissons/jjak2hap2y2hwci9ue7o.jpg",
  },
  {
    name: "33 Export",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397359/lepasteur/boissons/hnqfu2vfdemkqhlkxygx.jpg",
  },
  {
    name: "Doppel Munich",
    isAlcoholic: true,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397356/lepasteur/boissons/qya6khg0gcb2wxth8zom.jpg",
  },
  {
    name: "Coca-Cola",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394793/lepasteur/boissons/pg4elrq13veo9fmehdne.jpg",
  },
  {
    name: "Fanta",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782394795/lepasteur/boissons/oly7v00nmj0sb49lrazb.jpg",
  },
  {
    name: "Sprite",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397359/lepasteur/boissons/tzttd9hey9qgiylbjblc.jpg",
  },
  {
    name: "Vital'O",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397316/lepasteur/boissons/zk7bqsiym0x85zdgk8r8.jpg",
  },
  {
    name: "Maltina",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397360/lepasteur/boissons/waknxaqks3trabriv0kj.jpg",
  },
  {
    name: "Schweppes",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397333/lepasteur/boissons/ipuphu9wafllclf4c3h1.jpg",
  },
  {
    name: "Energy Malt",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397284/lepasteur/boissons/bw4nzdcxjeychqcogzv3.jpg",
  },
  {
    name: "Top",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397323/lepasteur/boissons/ks1awirpwoih2ag39bcp.jpg",
  },
  {
    name: "D'jino",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397358/lepasteur/boissons/bchrpcoi7kptso5x0mec.jpg",
  },
  {
    name: "World Cola",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397275/lepasteur/boissons/fcnubgzdtuic7tcczw0i.jpg",
  },
  {
    name: "Youzou",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397306/lepasteur/boissons/mvddwf5gc8ytuvuv8l2e.jpg",
  },
  {
    name: "XXL Energy",
    isAlcoholic: false,
    imageUrl:
      "https://res.cloudinary.com/dhttj3w2f/image/upload/v1782397278/lepasteur/boissons/htuqfhlwqgckqx2zkvur.jpg",
  },
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
        imageUrl: item.imageUrl,
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
