const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

const asyncHandler = (handler) => (req, res, next) => handler(req, res, next).catch(next);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Catalog Management service!' });
});

app.get('/products', asyncHandler(async (req, res) => {
  const products = await db.all('SELECT id, name, price, description FROM products ORDER BY name ASC');
  res.json({ products });
}));

app.get('/products/:id(\\d+)', asyncHandler(async (req, res) => {
  const product = await db.get('SELECT id, name, price, description FROM products WHERE id = ?', [req.params.id]);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json({ product });
}));

app.post('/products', asyncHandler(async (req, res) => {
  const { name, price, description } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ message: 'name and price are required' });
  }

  const normalizedPrice = Number(price);
  if (Number.isNaN(normalizedPrice) || normalizedPrice < 0) {
    return res.status(400).json({ message: 'price must be a valid non-negative number' });
  }

  const result = await db.run(
    'INSERT INTO products (name, price, description) VALUES (?, ?, ?)',
    [name.trim(), normalizedPrice.toFixed(2), description || null],
  );

  const product = await db.get('SELECT id, name, price, description FROM products WHERE id = ?', [result.lastID]);
  res.status(201).json({ product });
}));

app.put('/products/:id(\\d+)', asyncHandler(async (req, res) => {
  const { name, price, description } = req.body;
  const existing = await db.get('SELECT id FROM products WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const updates = {
    name: name !== undefined ? String(name).trim() : undefined,
    price: price !== undefined ? Number(price) : undefined,
    description: description !== undefined ? description : undefined,
  };

  if (updates.price !== undefined && (Number.isNaN(updates.price) || updates.price < 0)) {
    return res.status(400).json({ message: 'price must be a valid non-negative number' });
  }

  await db.run(
    `UPDATE products
     SET name = COALESCE(?, name),
         price = COALESCE(?, price),
         description = COALESCE(?, description)
     WHERE id = ?`,
    [
      updates.name !== undefined ? updates.name : null,
      updates.price !== undefined ? updates.price.toFixed(2) : null,
      updates.description !== undefined ? updates.description : null,
      req.params.id,
    ],
  );

  const product = await db.get('SELECT id, name, price, description FROM products WHERE id = ?', [req.params.id]);
  res.json({ product });
}));

app.delete('/products/:id(\\d+)', asyncHandler(async (req, res) => {
  const existing = await db.get('SELECT id FROM products WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ message: 'Product not found' });
  }
  await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.status(204).send();
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const port = process.env.PORT || 8081;

db.init().then(() => {
  app.listen(port, () => console.log(`Listening for connections on port ${port}...`));
}).catch((err) => {
  console.error('Failed to initialize catalog database', err);
  process.exit(1);
});
