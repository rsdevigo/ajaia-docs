import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const PASSWORD = "demo1234";

const welcomeContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Ajaia Docs" }] },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Alice owns this document and has shared it with Bob as an editor." }],
    },
  ],
};

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const [alice, bob] = await Promise.all(
    [
      { email: "alice@ajaia.test", name: "Alice" },
      { email: "bob@ajaia.test", name: "Bob" },
      { email: "carol@ajaia.test", name: "Carol" },
    ].map((u) =>
      db.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      }),
    ),
  );

  // Fixed id keeps the seed idempotent.
  const doc = await db.document.upsert({
    where: { id: "seed-welcome-doc" },
    update: {},
    create: {
      id: "seed-welcome-doc",
      title: "Welcome to Ajaia Docs",
      content: welcomeContent,
      ownerId: alice.id,
    },
  });

  await db.documentShare.upsert({
    where: { documentId_userId: { documentId: doc.id, userId: bob.id } },
    update: { role: "EDITOR" },
    create: { documentId: doc.id, userId: bob.id, role: "EDITOR" },
  });

  console.log("Seeded alice, bob, carol (password: demo1234) and one shared document.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
