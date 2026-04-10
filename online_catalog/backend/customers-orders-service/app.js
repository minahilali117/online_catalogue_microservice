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
  res.json({ message: 'Welcome to the Customers & Orders Service!' });
});

// Get all customers with their orders
app.get('/customers', async (req, res, next) => {
  try {
    const customers = await sequelize.query(
      `SELECT c.id, c.name, c.email, c.phone,
              json_agg(json_build_object(
                'id', o.id,
                'placedOn', o."placedOn",
                'status', o.status
              ) ORDER BY o."placedOn" DESC) FILTER (WHERE o.id IS NOT NULL) as orders
       FROM customers c
       LEFT JOIN orders o ON c.id = o."customerId"
       GROUP BY c.id, c.name, c.email, c.phone
       ORDER BY c.name ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    res.json({ customers });
  } catch (error) {
    next(error);
  }
});

// Get orders for a specific customer
app.get('/orders/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const orders = await sequelize.query(
      'SELECT id, "customerId", "placedOn", status FROM orders WHERE "customerId" = ? ORDER BY "placedOn" DESC',
      { replacements: [customerId], type: sequelize.QueryTypes.SELECT }
    );
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// Get all orders
app.get('/orders', async (req, res, next) => {
  try {
    const orders = await sequelize.query(
      'SELECT id, "customerId", "placedOn", status FROM orders ORDER BY "placedOn" DESC',
      { type: sequelize.QueryTypes.SELECT }
    );
    res.json({ orders });
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
