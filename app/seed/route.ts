import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// 🚀 seedUsers з транзакційним екземпляром
async function seedUsers(tx: postgres.Sql) {
  await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await tx`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await tx`
      INSERT INTO users (id, name, email, password)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
}

// 🚀 seedInvoices з транзакційним екземпляром
async function seedInvoices(tx: postgres.Sql) {
  await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await tx`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  for (const invoice of invoices) {
    await tx`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
}

// 🚀 seedCustomers з транзакційним екземпляром
async function seedCustomers(tx: postgres.Sql) {
  await tx`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await tx`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  for (const customer of customers) {
    await tx`
      INSERT INTO customers (id, name, email, image_url)
      VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
      ON CONFLICT (id) DO NOTHING;
    `;
  }
}

// 🚀 seedRevenue з транзакційним екземпляром
async function seedRevenue(tx: postgres.Sql) {
  await tx`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  for (const rev of revenue) {
    await tx`
      INSERT INTO revenue (month, revenue)
      VALUES (${rev.month}, ${rev.revenue})
      ON CONFLICT (month) DO NOTHING;
    `;
  }
}

// 🚀 GET з правильною транзакцією та обробкою помилок
export async function GET() {
  try {
    await sql.begin(async (tx) => {
      await seedUsers(tx);
      await seedCustomers(tx);
      await seedInvoices(tx);
      await seedRevenue(tx);
    });

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error: unknown) {
    console.error('SEED ERROR:', error);
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
