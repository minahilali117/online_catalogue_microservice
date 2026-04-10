import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Customers from './components/Customers';
import Products from './components/Products';

const nextStatusByCurrent = {
  pending: 'processing',
  processing: 'shipped',
  shipped: 'completed',
  completed: 'completed',
  cancelled: 'cancelled',
};

function StatusChart({ orders }) {
  const counts = orders.reduce((acc, order) => {
    const key = order.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const entries = Object.entries(counts);
  const maxValue = Math.max(1, ...entries.map(([, value]) => value));

  if (entries.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">No order data available yet.</p>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([status, value]) => {
        const widthPercent = Math.round((value / maxValue) * 100);
        return (
          <div key={status}>
            <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1">
              <span className="capitalize">{status}</span>
              <span>{value}</span>
            </div>
            <div className="h-3 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-3 bg-blue-600"
                style={{ width: `${widthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('1');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [historyOrderId, setHistoryOrderId] = useState('');
  const [statusOrderId, setStatusOrderId] = useState('');
  const [nextStatus, setNextStatus] = useState('processing');
  const [statusHistory, setStatusHistory] = useState([]);
  const [detailsOrderId, setDetailsOrderId] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const orderBaseUrl = process.env.REACT_APP_ORDER_BASE_URL || 'http://localhost:8083';

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await axios.get(`${orderBaseUrl}/orders`);
      setOrders(response.data.orders || []);
    } catch (error) {
      setCheckoutMessage('Failed to load orders list.');
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const savedCart = localStorage.getItem('catalog_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (error) {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('catalog_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAddToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) => (
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      }];
    });
  };

  const updateCartItemQty = (productId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }
    setCart((prev) => prev.map((item) => (
      item.productId === productId ? { ...item, quantity } : item
    )));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);

  const handleCheckout = async () => {
    setCheckoutMessage('');
    if (!cart.length) {
      setCheckoutMessage('Cart is empty.');
      return;
    }

    try {
      const payload = {
        customerId: Number(customerId),
        items: cart,
      };
      const response = await axios.post(`${orderBaseUrl}/checkout`, payload);
      setCheckoutMessage(`Order #${response.data.order.id} created successfully.`);
      setCart([]);
      fetchOrders();
      setActivePage('orders');
    } catch (error) {
      setCheckoutMessage('Checkout failed. Please verify customer id and service status.');
    }
  };

  const loadHistory = async (orderIdArg) => {
    const targetOrderId = orderIdArg || historyOrderId;
    if (!targetOrderId) {
      return;
    }
    try {
      if (orderIdArg) {
        setHistoryOrderId(String(orderIdArg));
      }
      const response = await axios.get(`${orderBaseUrl}/orders/${targetOrderId}/status-history`);
      setStatusHistory(response.data.history || []);
      setActivePage('orders');
    } catch (error) {
      setStatusHistory([]);
      setCheckoutMessage('Failed to load status history for this order id.');
    }
  };

  const updateStatus = async (orderIdArg, statusArg) => {
    const targetOrderId = orderIdArg || statusOrderId;
    const targetStatus = statusArg || nextStatus;
    if (!targetOrderId) {
      return;
    }
    try {
      if (orderIdArg) {
        setStatusOrderId(String(orderIdArg));
      }
      await axios.patch(`${orderBaseUrl}/orders/${targetOrderId}/status`, { status: targetStatus });
      setCheckoutMessage(`Order #${targetOrderId} moved to ${targetStatus}.`);
      fetchOrders();
      if (historyOrderId && historyOrderId === String(targetOrderId)) {
        loadHistory(String(targetOrderId));
      }
    } catch (error) {
      setCheckoutMessage('Failed to update order status.');
    }
  };

  const loadOrderDetails = async (orderIdArg) => {
    const targetOrderId = orderIdArg || detailsOrderId;
    if (!targetOrderId) {
      return;
    }

    try {
      setDetailsLoading(true);
      if (orderIdArg) {
        setDetailsOrderId(String(orderIdArg));
      }
      const response = await axios.get(`${orderBaseUrl}/orders/by-id/${targetOrderId}`);
      setOrderDetails(response.data.order || null);
      setOrderItems(response.data.items || []);
      setActivePage('orders');
    } catch (error) {
      setOrderDetails(null);
      setOrderItems([]);
      setCheckoutMessage('Failed to load order details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const advanceStatusQuick = async (order) => {
    const next = nextStatusByCurrent[order.status] || 'processing';
    if (next === order.status) {
      setCheckoutMessage(`Order #${order.id} is already in terminal status ${order.status}.`);
      return;
    }
    await updateStatus(order.id, next);
  };

  const totalRevenue = orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
  const totalCustomersInOrders = new Set(orders.map((o) => o.customerId)).size;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'products', label: 'Products' },
    { id: 'customers', label: 'Customers' },
    { id: 'checkout', label: 'Cart and Checkout' },
    { id: 'orders', label: 'Orders' },
  ];

  const renderMainContent = () => {
    if (activePage === 'dashboard') {
      return (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{orders.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalRevenue.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCustomersInOrders}</p>
            </div>
          </div>
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Status Distribution</h3>
            <StatusChart orders={orders} />
          </div>
        </section>
      );
    }

    if (activePage === 'products') {
      return (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            Products Catalog
          </h2>
          <Products onAddToCart={handleAddToCart} />
        </section>
      );
    }

    if (activePage === 'customers') {
      return (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            Customers
          </h2>
          <Customers />
        </section>
      );
    }

    if (activePage === 'checkout') {
      return (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            Cart and Checkout
          </h2>
          {cart.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No items in cart.</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">${Number(item.price).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded"
                      onClick={() => updateCartItemQty(item.productId, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="text-gray-900 dark:text-white min-w-[24px] text-center">{item.quantity}</span>
                    <button
                      className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded"
                      onClick={() => updateCartItemQty(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Customer ID</label>
              <input
                type="number"
                min="1"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              Total: ${cartTotal.toFixed(2)}
            </div>
            <button
              onClick={handleCheckout}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              Checkout
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          Orders
        </h2>

        <div className="mb-6 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Total</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr>
                  <td className="px-3 py-3 text-gray-600 dark:text-gray-300" colSpan={5}>Loading orders...</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
                    <td className="px-3 py-2">#{order.id}</td>
                    <td className="px-3 py-2">{order.customerId}</td>
                    <td className="px-3 py-2 capitalize">{order.status}</td>
                    <td className="px-3 py-2">${Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => loadOrderDetails(order.id)}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs"
                      >
                        Open Details
                      </button>
                      <button
                        onClick={() => advanceStatusQuick(order)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs"
                      >
                        Advance Status
                      </button>
                      <button
                        onClick={() => loadHistory(order.id)}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Update Status</p>
            <input
              type="number"
              min="1"
              placeholder="Order ID"
              value={statusOrderId}
              onChange={(e) => setStatusOrderId(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="shipped">shipped</option>
              <option value="completed">completed</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button onClick={() => updateStatus()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
              Apply Status
            </button>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">View History</p>
            <input
              type="number"
              min="1"
              placeholder="Order ID"
              value={historyOrderId}
              onChange={(e) => setHistoryOrderId(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button onClick={() => loadHistory()} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg">
              Load History
            </button>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Order Details</p>
            <input
              type="number"
              min="1"
              placeholder="Order ID"
              value={detailsOrderId}
              onChange={(e) => setDetailsOrderId(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button onClick={() => loadOrderDetails()} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg">
              {detailsLoading ? 'Loading...' : 'Load Order'}
            </button>
          </div>
        </div>

        {orderDetails ? (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-800 dark:text-gray-100">
              Order #{orderDetails.id} | Customer #{orderDetails.customerId} | Status: {orderDetails.status} | Total: ${Number(orderDetails.totalAmount || 0).toFixed(2)}
            </p>
            <div className="mt-3 space-y-2">
              {orderItems.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-300">No line items found.</p>
              ) : (
                orderItems.map((item) => (
                  <div key={item.id} className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-sm text-gray-800 dark:text-gray-100">
                    {item.productName} | Product #{item.productId} | Qty: {item.quantity} | Unit: ${Number(item.unitPrice).toFixed(2)} | Line: ${Number(item.lineTotal).toFixed(2)}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {statusHistory.length > 0 ? (
          <div className="mt-4 space-y-2">
            {statusHistory.map((entry) => (
              <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-100">
                {entry.previousStatus || 'none'} -> {entry.newStatus} at {new Date(entry.changedAt).toLocaleString()}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Online Catalog
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage your products, customers, and orders
                </p>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
              >
                {darkMode ? 'Light' : 'Dark'}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-3 xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 h-fit sticky top-6">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Navigation</p>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activePage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>

            <div className="lg:col-span-9 xl:col-span-10 space-y-6">
              {renderMainContent()}
              {checkoutMessage ? (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900 text-sm text-blue-700 dark:text-blue-200">
                  {checkoutMessage}
                </div>
              ) : null}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 shadow mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <p className="text-center text-gray-600 dark:text-gray-400">
              © 2024 Online Catalog. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
