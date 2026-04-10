const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { map } = require('p-iteration');
const fetch = require('node-fetch');

const db = require('./db/models');
const { environment, orderProcessingBaseUrl } = require('./config');

const app = express();

app.use(morgan('dev'));
app.use(cors());

const asyncHandler = (handler) => (req, res, next) => handler(req, res, next).catch(next);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Customer Support service!' });
});

app.get('/customers', asyncHandler(async (req, res) => {
  const customers = await db.Customer.findAll({ order: [['name', 'ASC']] });

  const customersWithOrders = await map(customers, async (customer) => {
    const result = await fetch(`${orderProcessingBaseUrl}/orders/${customer.id}`);
    const data = await result.json();
    return {
      id: customer.id,
      name: customer.name,
      orders: data.orders,
    };
  });

  // const customersWithOrders = [];

  // const customers = await db.Customer.findAll({ order: [['name', 'ASC']] });

  // for (const customer of customers) {
  //   const result = await fetch(`${orderProcessingBaseUrl}/orders/${customer.id}`);
  //   const data = await result.json();
  //   customersWithOrders.push({
  //     id: customer.id,
  //     name: customer.name,
  //     orders: data.orders,
  //   });
  // }

  res.json({ customers: customersWithOrders });
}));

app.get('/customers/:id(\\d+)', asyncHandler(async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const customer = await db.Customer.findByPk(customerId);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const result = await fetch(`${orderProcessingBaseUrl}/orders/${customerId}`);
  const data = await result.json();

  res.json({
    customer: {
      id: customer.id,
      name: customer.name,
      orders: data.orders || [],
    },
  });
}));

app.post('/customers', asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'name is required' });
  }

  const customer = await db.Customer.create({ name: String(name).trim() });
  res.status(201).json({ customer: { id: customer.id, name: customer.name, orders: [] } });
}));

app.put('/customers/:id(\\d+)', asyncHandler(async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const { name } = req.body;

  const customer = await db.Customer.findByPk(customerId);
  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: 'name is required' });
  }

  await customer.update({ name: String(name).trim() });
  res.json({ customer: { id: customer.id, name: customer.name } });
}));

app.delete('/customers/:id(\\d+)', asyncHandler(async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const customer = await db.Customer.findByPk(customerId);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  await customer.destroy();
  res.status(204).send();
}));

app.get('/customers/:id(\\d+)/order-summary', asyncHandler(async (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  const customer = await db.Customer.findByPk(customerId);

  if (!customer) {
    return res.status(404).json({ message: 'Customer not found' });
  }

  const result = await fetch(`${orderProcessingBaseUrl}/orders/${customerId}`);
  const data = await result.json();
  const orders = data.orders || [];

  const summary = {
    totalOrders: orders.length,
    totalAmount: orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0),
    byStatus: orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {}),
  };

  res.json({ customer: { id: customer.id, name: customer.name }, summary });
}));

// Catch unhandled requests and forward to error handler.
app.use((req, res, next) => {
  const err = new Error("The requested resource couldn't be found.");
  err.status = 404;
  next(err);
});

// Generic error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500);
  const isProduction = environment === "production";
  res.json({
    title: err.title || "Server Error",
    message: err.message,
    stack: isProduction ? null : err.stack,
  });
});

module.exports = app;
