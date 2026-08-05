import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@codesphere.dev";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: { name: "Super Admin", email: adminEmail, passwordHash, role: "SUPER_ADMIN" },
    });
    console.log(`✅ Created SUPER_ADMIN: ${adminEmail} / ${adminPassword} — CHANGE THIS PASSWORD IMMEDIATELY after first login.`);
  } else {
    console.log(`ℹ️  SUPER_ADMIN ${adminEmail} already exists, skipping.`);
  }

  // One sample sales rep so the round-robin lead-assignment logic in
  // publicRoutes.ts has someone to assign to out of the box.
  const salesEmail = "sales@codesphere.dev";
  const existingSales = await prisma.user.findUnique({ where: { email: salesEmail } });
  if (!existingSales) {
    const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
    await prisma.user.create({ data: { name: "Sales Rep", email: salesEmail, passwordHash, role: "SALES" } });
    console.log(`✅ Created sample SALES user: ${salesEmail} / ChangeMe123!`);
  }

  const services = ["Custom Web Applications", "Business Software Solutions", "SaaS Product Development", "Website Development", "Software Maintenance & Support", "HSE Documentation & Compliance"];
  for (const name of services) {
    await prisma.serviceOffering.upsert({ where: { name }, update: {}, create: { name } });
  }

  const industries = ["Manufacturing", "Healthcare", "Construction", "Retail", "Logistics", "Hospitality", "Education", "Government", "Corporate / Professional Services"];
  for (const name of industries) {
    await prisma.industryOption.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log("🌱 Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
