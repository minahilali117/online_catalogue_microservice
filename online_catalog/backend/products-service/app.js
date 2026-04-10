const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const sequelize = require('./config/database');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Database connection check
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection successful! Sequelize is ready to use.');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Products Service!' });
});

app.get('/products', async (req, res, next) => {
  try {
    const products = await sequelize.query(
      'SELECT id, name, price, description FROM products ORDER BY name ASC',
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

app.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await sequelize.query(
      'SELECT id, name, price, description FROM products WHERE id = ?',
      { replacements: [id], type: sequelize.QueryTypes.SELECT }
    );
    
    if (product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ product: product[0] });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

module.exports = app;
