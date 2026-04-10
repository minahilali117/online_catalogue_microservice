import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [summaryByCustomer, setSummaryByCustomer] = useState({});
  const [summaryLoadingId, setSummaryLoadingId] = useState(null);

  const baseUrl = process.env.REACT_APP_CUSTOMERS_BASE_URL || 'http://localhost:8082';

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/customers`);
      setCustomers(response.data.customers || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const createCustomer = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      return;
    }
    try {
      await axios.post(`${baseUrl}/customers`, { name: customerName.trim() });
      setCustomerName('');
      fetchCustomers();
    } catch (err) {
      console.error('Failed to create customer', err);
      setError('Failed to create customer');
    }
  };

  const loadCustomerSummary = async (customerId) => {
    try {
      setSummaryLoadingId(customerId);
      const response = await axios.get(`${baseUrl}/customers/${customerId}/order-summary`);
      setSummaryByCustomer((prev) => ({
        ...prev,
        [customerId]: response.data.summary,
      }));
    } catch (err) {
      console.error('Failed to load customer summary', err);
      setError('Failed to load customer summary');
    } finally {
      setSummaryLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createCustomer} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Add Customer</h3>
        <div className="flex gap-2">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name"
            className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            Create
          </button>
        </div>
      </form>

      {customers.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No customers found</p>
      ) : (
        customers.map(customer => (
          <div
            key={customer.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Customer Header */}
            <button
              onClick={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
              className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex justify-between items-center"
            >
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {customer.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer ID: {customer.id}</p>
                {customer.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email: {customer.email}</p>
                )}
                {customer.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {customer.phone}</p>
                )}
              </div>
              <span className="text-gray-400 dark:text-gray-500">
                {expandedCustomer === customer.id ? '▼' : '▶'}
              </span>
            </button>

            {/* Orders Section */}
            {expandedCustomer === customer.id && (
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Orders:</h4>
                <div className="mb-3">
                  <button
                    onClick={() => loadCustomerSummary(customer.id)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs"
                  >
                    {summaryLoadingId === customer.id ? 'Loading...' : 'Load Order Summary'}
                  </button>
                </div>
                {summaryByCustomer[customer.id] ? (
                  <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-sm text-gray-700 dark:text-gray-200">
                    <p>Total Orders: {summaryByCustomer[customer.id].totalOrders}</p>
                    <p>Total Amount: ${Number(summaryByCustomer[customer.id].totalAmount || 0).toFixed(2)}</p>
                    <p>
                      By Status: {Object.entries(summaryByCustomer[customer.id].byStatus || {})
                        .map(([status, count]) => `${status}: ${count}`)
                        .join(', ')}
                    </p>
                  </div>
                ) : null}
                {!customer.orders || customer.orders.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 italic">No orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {customer.orders.map(order => (
                      <div
                        key={order.id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Order #{order.id}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Date: {new Date(order.placedOn).toLocaleString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : order.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default Customers;
