require('dotenv').config();
const { createClient } = require('@libsql/client');
const { put } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const source = createClient({ url: process.env.SOURCE_DATABASE_URL || 'file:database/ahla-akla.db' });
const tables = ['categories', 'products', 'customers', 'orders', 'buffet_requests', 'settings', 'order_items', 'push_subscriptions'];

async function migrate() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before migrating.');
  await db.init();
  for (const table of tables) {
    const columns = (await source.execute(`PRAGMA table_info(${table})`)).rows.map(row => row.name);
    const rows = (await source.execute(`SELECT * FROM ${table}`)).rows;
    for (const row of rows) {
      if (table === 'products' && row.image && row.image.startsWith('/uploads/') && process.env.BLOB_READ_WRITE_TOKEN) {
        const localFile = path.join(__dirname, '..', 'public', row.image);
        if (fs.existsSync(localFile)) {
          const blob = await put(row.image.slice(1), fs.createReadStream(localFile), { access: 'public', addRandomSuffix: false });
          row.image = blob.url;
        }
      } else if (table === 'products' && row.image && row.image.startsWith('/uploads/') && fs.existsSync(path.join(__dirname, '..', 'public', row.image))) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required to migrate existing product images.');
      }
      const names = columns.join(',');
      const placeholders = columns.map(() => '?').join(',');
      await db.run(`INSERT OR REPLACE INTO ${table} (${names}) VALUES (${placeholders})`, columns.map(column => row[column]));
    }
    console.log(`${table}: ${rows.length} rows`);
  }
  console.log('Migration complete.');
}

migrate().catch(error => { console.error(error); process.exitCode = 1; });