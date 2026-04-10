import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Products({ onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', description: '' });

  const baseUrl = process.env.REACT_APP_PRODUCTS_BASE_URL || 'http://localhost:8081';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/products`);
      setProducts(response.data.products || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return '0.00';
    }
    return num.toFixed(2);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: '', price: '', description: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        price: Number(form.price),
        description: form.description || null,
      };

      if (editingId) {
        await axios.put(`${baseUrl}/products/${editingId}`, payload);
      } else {
        await axios.post(`${baseUrl}/products`, payload);
      }
      resetForm();
      await fetchProducts();
    } catch (err) {
      console.error('Failed to save product', err);
      setError('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${baseUrl}/products/${id}`);
      await fetchProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
      setError('Failed to delete product');
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      price: product.price || '',
      description: product.description || '',
    });
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
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editingId ? `Edit Product #${editingId}` : 'Create Product'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            min="0"
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : (editingId ? 'Update Product' : 'Add Product')}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 col-span-full">No products found</p>
      ) : (
        products.map(product => (
          <div
            key={product.id}
            className="bg-white dark:bg-gray-700 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 dark:border-gray-600"
          >
            {/* Product Card */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">
                  {product.name}
                </h3>
                <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium">
                  #{product.id}
                </span>
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {product.description}
                </p>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <span className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${formatPrice(product.price)}
                </span>
                <button
                  onClick={() => onAddToCart(product)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Add to Cart
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleEdit(product)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      </div>
    </div>
  );
}

export default Products;
