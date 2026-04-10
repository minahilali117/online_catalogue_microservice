const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'catalog.sqlite');
const connection = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((resolve, reject) => {
  connection.run(sql, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  connection.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  connection.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(rows);
  });
});

const init = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT
    )
  `);

  const row = await get('SELECT COUNT(*) AS count FROM products');
  if (row && row.count === 0) {
    const seedProducts = [
      ['Practical Wooden Soap', 460.0, 'High-quality wooden soap'],
      ['Incredible Granite Fish', 482.0, 'Durable granite fish decoration'],
      ['Incredible Metal Salad', 30.0, 'Stainless steel salad bowl'],
      ['Licensed Plastic Sausages', 726.0, 'Food-grade plastic sausages'],
      ['Intelligent Rubber Table', 677.0, 'Anti-slip rubber table'],
      ['Generic Metal Hat', 384.0, 'Lightweight metal hat'],
      ['Refined Fresh Salad', 4.0, 'Fresh organic salad mix'],
      ['Fantastic Fresh Bacon', 57.0, 'Premium bacon strips'],
      ['Intelligent Fresh Pants', 291.0, 'Comfortable fresh fabric pants'],
      ['Generic Fresh Chicken', 378.0, 'Organic free-range chicken'],
    ];

    for (const [name, price, description] of seedProducts) {
      // Seeding once keeps local startup simple and deterministic.
      await run('INSERT INTO products (name, price, description) VALUES (?, ?, ?)', [name, price, description]);
    }
  }
};

module.exports = {
  init,
  run,
  get,
  all,
};
