const { createClient } = require('@libsql/client');
const { categories, products } = require('./menu-seed');

const url =
  process.env.TURSO_DATABASE_URL || 'file:database/ahla-akla.db';

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const schema = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  icon TEXT DEFAULT '🍽️',
  visible INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT DEFAULT '',
  description_en TEXT DEFAULT '',
  image TEXT DEFAULT '',
  price_ready REAL,
  price_cooked REAL,
  today_price INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT DEFAULT '',
  subtotal REAL,
  delivery REAL,
  total REAL,
  status TEXT DEFAULT 'new',
  client_token TEXT UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS buffet_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_number TEXT UNIQUE,
  customer_id INTEGER,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  guests INTEGER NOT NULL,
  event_occasion TEXT DEFAULT '',
  event_date TEXT DEFAULT '',
  selections TEXT NOT NULL,
  requirements TEXT NOT NULL,
  notes TEXT DEFAULT '',
  price_per_person REAL,
  total REAL,
  status TEXT DEFAULT 'NEW',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  option_name TEXT,
  quantity INTEGER,
  unit_price REAL,
  FOREIGN KEY(order_id) REFERENCES orders(id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chef_username TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  subscription_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_chef
ON push_subscriptions(chef_username);
`;

let initPromise;

async function init() {
  if (!initPromise) {
    initPromise = initializeDatabase();
  }

  return initPromise;
}

async function initializeDatabase() {
  try {
    console.log(
      'DATABASE:',
      process.env.TURSO_DATABASE_URL ? 'TURSO' : 'LOCAL'
    );

    // Create all tables
    await client.batch(
      schema
        .split(';')
        .map(sql => sql.trim())
        .filter(Boolean)
        .map(sql => ({
          sql,
          args: []
        })),
      'write'
    );

    console.log('Database schema ready.');

    // Default settings
    await client.execute({
      sql: `
        INSERT OR IGNORE INTO settings (key, value)
        VALUES ('chef_phone', '')
      `,
      args: []
    });

    await client.execute({
      sql: `
        INSERT OR IGNORE INTO settings (key, value)
        VALUES ('buffet_price_per_person', '0')
      `,
      args: []
    });

    // Check current menu
    const beforeCategories = await get(
      'SELECT COUNT(*) AS count FROM categories'
    );

    const beforeProducts = await get(
      'SELECT COUNT(*) AS count FROM products'
    );

    console.log(
      'BEFORE SEED CATEGORIES:',
      beforeCategories?.count ?? 0
    );

    console.log(
      'BEFORE SEED PRODUCTS:',
      beforeProducts?.count ?? 0
    );

    // Seed menu
    await seedMenu();

    // Check menu after seeding
    const afterCategories = await get(
      'SELECT COUNT(*) AS count FROM categories'
    );

    const afterProducts = await get(
      'SELECT COUNT(*) AS count FROM products'
    );

    console.log(
      'AFTER SEED CATEGORIES:',
      afterCategories?.count ?? 0
    );

    console.log(
      'AFTER SEED PRODUCTS:',
      afterProducts?.count ?? 0
    );

    console.log('Database initialization complete.');
  } catch (error) {
    console.error('DATABASE INITIALIZATION ERROR:', error);
    throw error;
  }
}

async function seedMenu() {
  console.log('Starting menu seed...');

  // -------------------------
  // Categories
  // -------------------------

  for (const category of categories) {
    const [
      slug,
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      icon,
      sortOrder
    ] = category;

    await run(
      `
      INSERT OR IGNORE INTO categories
      (
        slug,
        name_ar,
        name_en,
        description_ar,
        description_en,
        icon,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        slug,
        nameAr,
        nameEn,
        descriptionAr,
        descriptionEn,
        icon,
        sortOrder
      ]
    );

    await run(
      `
      UPDATE categories
      SET name_ar=?, name_en=?, description_ar=?, description_en=?, icon=?, sort_order=?
      WHERE slug=?
      `,
      [nameAr, nameEn, descriptionAr, descriptionEn, icon, sortOrder, slug]
    );
  }

  console.log(`Seeded ${categories.length} categories.`);

  // -------------------------
  // Products
  // -------------------------

  for (const product of products) {
    const [
      categoryIndex,
      nameAr,
      nameEn,
      descriptionAr,
      descriptionEn,
      priceReady,
      priceCooked
    ] = product;

    const categoryData = categories[categoryIndex];

    if (!categoryData) {
      console.error(
        `Invalid category index ${categoryIndex} for product ${nameEn}`
      );
      continue;
    }

    const categorySlug = categoryData[0];

    const category = await get(
      'SELECT id FROM categories WHERE slug = ?',
      [categorySlug]
    );

    if (!category) {
      console.error(
        `Category not found: ${categorySlug} for product ${nameEn}`
      );
      continue;
    }

    // Don't insert duplicates
    const existingProduct = await get(
      `
      SELECT id
      FROM products
      WHERE category_id = ?
      AND name_en = ?
      `,
      [category.id, nameEn]
    );

    if (existingProduct) {
      await run(
        `
        UPDATE products
        SET name_ar=?, description_ar=?, description_en=?, price_ready=?, price_cooked=?, today_price=?, sort_order=?
        WHERE id=?
        `,
        [
          nameAr,
          descriptionAr,
          descriptionEn,
          priceReady,
          priceCooked,
          priceReady === null && priceCooked === null ? 1 : 0,
          Number((await get('SELECT sort_order FROM products WHERE id=?', [existingProduct.id]))?.sort_order ?? 0),
          existingProduct.id
        ]
      );
      continue;
    }

    const countResult = await get(
      `
      SELECT COUNT(*) AS count
      FROM products
      WHERE category_id = ?
      `,
      [category.id]
    );

    const sortOrder = Number(countResult?.count ?? 0);

    await run(
      `
      INSERT INTO products
      (
        category_id,
        name_ar,
        name_en,
        description_ar,
        description_en,
        price_ready,
        price_cooked,
        today_price,
        visible,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        category.id,
        nameAr,
        nameEn,
        descriptionAr,
        descriptionEn,
        priceReady,
        priceCooked,

        // If both prices are null, this is a "today price" product.
        priceReady === null && priceCooked === null ? 1 : 0,

        1,
        sortOrder
      ]
    );
  }

  console.log(`Processed ${products.length} products.`);
}

// -------------------------
// Database helpers
// -------------------------

async function all(sql, args = []) {
  const result = await client.execute({
    sql,
    args
  });

  return result.rows.map(row => ({
    ...row
  }));
}

async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0];
}

async function run(sql, args = []) {
  const result = await client.execute({
    sql,
    args
  });

  return {
    changes: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid
  };
}

async function batch(statements) {
  return client.batch(
    statements.map(statement => ({
      sql: statement.sql,
      args: statement.args || []
    })),
    'write'
  );
}

module.exports = {
  client,
  init,
  all,
  get,
  run,
  batch
};
