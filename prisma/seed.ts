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

  // Safe to re-run against a live database: existing users are left untouched (no password
  // reset), and the demo document + Bob's share are only created if the document doesn't
  // exist yet, so a re-run never undoes edits, role changes or revocations made since.
  const SEED_DOC_ID = "seed-welcome-doc";
  const existing = await db.document.findUnique({ where: { id: SEED_DOC_ID }, select: { id: true } });
  if (existing) {
    console.log("Users ensured. Demo document already exists, left unchanged.");
    return;
  }

  await db.document.create({
    data: {
      id: SEED_DOC_ID,
      title: "Welcome to Ajaia Docs",
      content: welcomeContent,
      ownerId: alice.id,
      shares: { create: { userId: bob.id, role: "EDITOR" } },
    },
  });
  console.log("Seeded alice, bob, carol (password: demo1234) and one shared document.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
