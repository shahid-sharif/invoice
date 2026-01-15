"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { Plus, Package, TrendingUp, TrendingDown, RotateCcw, Search, Calendar, RefreshCw } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

const API_URL = import.meta.env.VITE_API_URL

const StockManagement = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("")
  const [movementData, setMovementData] = useState({
    product: "",
    type: "IN",
    quantity: "",
    cost_price: "",
    selling_price: "",
    notes: "",
  })

  useEffect(() => {
    fetchProducts()
    fetchMovements()
  }, [])

  useEffect(() => {
    if (filterType || selectedProduct) {
      filterMovements()
    } else {
      fetchMovements()
    }
  }, [filterType, selectedProduct])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/products`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch products")
      }

      setProducts(data)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMovements = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stock-movements`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch stock movements")
      }

      setMovements(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const filterMovements = async () => {
    try {
      let url = `${API_URL}/api/stock-movements?`
      if (selectedProduct) {
        url += `product=${selectedProduct}&`
      }
      if (filterType) {
        url += `type=${filterType}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch stock movements")
      }

      setMovements(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const openModal = () => {
    setMovementData({
      product: "",
      type: "IN",
      quantity: "",
      cost_price: "",
      selling_price: "",
      notes: "",
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setMovementData({
      product: "",
      type: "IN",
      quantity: "",
      cost_price: "",
      selling_price: "",
      notes: "",
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setMovementData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!movementData.product || !movementData.quantity) {
      toast.error("Product and quantity are required")
      return
    }

    if (movementData.type === "IN" && !movementData.cost_price) {
      toast.error("Cost price is required for stock IN")
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/stock-movements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify(movementData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create stock movement")
      }

      toast.success("Stock movement recorded successfully")
      fetchMovements()
      fetchProducts() // Refresh products to get updated stock
      closeModal()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getMovementIcon = (type) => {
    switch (type) {
      case "IN":
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case "OUT":
        return <TrendingDown className="w-5 h-5 text-red-600" />
      case "RETURN":
        return <RotateCcw className="w-5 h-5 text-blue-600" />
      default:
        return null
    }
  }

  const getMovementColor = (type) => {
    switch (type) {
      case "IN":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
      case "OUT":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
      case "RETURN":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
      default:
        return ""
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchProducts(); fetchMovements(); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Stock Movement
          </button>
        </div>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">
                {products.filter((p) => p.stock_quantity > 0 && p.stock_quantity < 10).length}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{products.filter((p) => p.stock_quantity === 0).length}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Stock Value</p>
              <p className="text-2xl font-bold text-green-600">
                Rs {products.reduce((sum, p) => sum + p.cost_price * p.stock_quantity, 0).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Products</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} ({product.barcode})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Movement Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="IN">Stock IN</option>
              <option value="OUT">Stock OUT</option>
              <option value="RETURN">Returns</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Movements History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stock Movement History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No stock movements recorded yet
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(movement.date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(movement.date).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {movement.product?.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{movement.product?.barcode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs font-medium rounded-full ${getMovementColor(movement.type)}`}>
                        {getMovementIcon(movement.type)}
                        {movement.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{movement.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {movement.cost_price && `Rs ${movement.cost_price.toFixed(2)}`}
                        {movement.selling_price && `Rs ${movement.selling_price.toFixed(2)}`}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {movement.notes || "-"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Movement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Stock Movement</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search Product *
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or barcode..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-1.5"
                  />
                  <select
                    name="product"
                    value={movementData.product}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select Product</option>
                    {filteredProducts.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.name} ({product.barcode}) - Stock: {product.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Movement Type *
                  </label>
                  <select
                    name="type"
                    value={movementData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="IN">Stock IN (Received)</option>
                    <option value="OUT">Stock OUT (Manual)</option>
                    <option value="RETURN">Return (Customer Return)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={movementData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                {movementData.type === "IN" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cost Price (Rs) *
                    </label>
                    <input
                      type="number"
                      name="cost_price"
                      value={movementData.cost_price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter cost price"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={movementData.notes}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Movement
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockManagement
