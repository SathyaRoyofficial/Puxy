import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const invites = await prisma.invite.findMany({ include: { room: { include: { participants: true } } } });
  console.log(JSON.stringify(invites, null, 2));
}

run().catch(console.error).finally(() => process.exit(0));
