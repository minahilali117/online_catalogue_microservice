const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const db = require('./db/models');
const { environment } = require('./config');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];

const asyncHandler = (handler) => (req, res, next) => handler(req, res, next).catch(next);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Order Processing service!' });
});

app.get('/orders', asyncHandler(async (req, res) => {
  const orders = await db.Order.findAll({
    attributes: ['id', 'customerId', 'placedOn', 'status', 'totalAmount'],
    order: [['placedOn', 'DESC']],
  });
  res.json({ orders });
}));

app.get('/orders/:customerId(\\d+)', asyncHandler(async (req, res) => {
  const customerId = parseInt(req.params.customerId, 10);
  const orders = await db.Order.findAll({
    attributes: ['id', 'customerId', 'placedOn', 'status', 'totalAmount'],
    where: { customerId },
    order: [['placedOn', 'DESC']],
  });
  res.json({ orders });
}));

app.get('/orders/by-id/:orderId(\\d+)', asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const order = await db.Order.findByPk(orderId, {
    attributes: ['id', 'customerId', 'placedOn', 'status', 'totalAmount'],
  });

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const items = await db.OrderItem.findAll({
    where: { orderId },
    attributes: ['id', 'productId', 'productName', 'unitPrice', 'quantity', 'lineTotal'],
    order: [['id', 'ASC']],
  });

  res.json({ order, items });
}));

app.post('/checkout', asyncHandler(async (req, res) => {
  const { customerId, items } = req.body;

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ message: 'customerId must be a positive integer' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items must be a non-empty array' });
  }

  const normalizedItems = items.map((item) => {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.price);
    const productName = item.name ? String(item.name) : null;
    return {
      productId,
      quantity,
      unitPrice,
      productName,
      lineTotal: unitPrice * quantity,
    };
  });

  const hasInvalidItem = normalizedItems.some((item) => (
    !Number.isFinite(item.productId)
    || !Number.isFinite(item.quantity)
    || !Number.isFinite(item.unitPrice)
    || item.quantity <= 0
    || item.unitPrice < 0
    || !item.productName
  ));

  if (hasInvalidItem) {
    return res.status(400).json({ message: 'Each item must include valid productId, name, price, and quantity' });
  }

  const totalAmount = normalizedItems.reduce((acc, item) => acc + item.lineTotal, 0);

  const result = await db.sequelize.transaction(async (transaction) => {
    const order = await db.Order.create({
      customerId,
      placedOn: new Date(),
      status: 'pending',
      totalAmount,
    }, { transaction });

    await db.OrderItem.bulkCreate(normalizedItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })), { transaction });

    await db.OrderStatusHistory.create({
      orderId: order.id,
      previousStatus: null,
      newStatus: 'pending',
      changedAt: new Date(),
    }, { transaction });

    return order;
  });

  const createdOrder = await db.Order.findByPk(result.id, {
    attributes: ['id', 'customerId', 'placedOn', 'status', 'totalAmount'],
  });

  res.status(201).json({ order: createdOrder });
}));

app.patch('/orders/:orderId(\\d+)/status', asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { status } = req.body;

  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${ORDER_STATUSES.join(', ')}` });
  }

  const order = await db.Order.findByPk(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const previousStatus = order.status;
  if (previousStatus === status) {
    return res.json({ order });
  }

  await db.sequelize.transaction(async (transaction) => {
    await order.update({ status }, { transaction });
    await db.OrderStatusHistory.create({
      orderId: order.id,
      previousStatus,
      newStatus: status,
      changedAt: new Date(),
    }, { transaction });
  });

  const updatedOrder = await db.Order.findByPk(orderId, {
    attributes: ['id', 'customerId', 'placedOn', 'status', 'totalAmount'],
  });

  res.json({ order: updatedOrder });
}));

app.get('/orders/:orderId(\\d+)/status-history', asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const order = await db.Order.findByPk(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const history = await db.OrderStatusHistory.findAll({
    where: { orderId },
    attributes: ['id', 'previousStatus', 'newStatus', 'changedAt'],
    order: [['changedAt', 'ASC']],
  });

  res.json({ history });
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
