"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { 
  Package, 
  FileText, 
  BarChart2, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  AlertTriangle,
  FolderOpen,
  Activity,
  RefreshCw
} from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    lowStock: 0,
    outOfStock: 0,
    totalStockValue: 0,
    todayRevenue: 0,
    todayProfit: 0,
    todaySalesCount: 0,
  })
  const [loading, setLoading] = useState(true)
  
  const formatNumber = (value) => {
    return (value || 0).toFixed(2)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/stats`)
      const data = await response.json()

      if (response.ok) {
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stock Management Dashboard</h1>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
              <Link to="/admin/products" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                Manage Products →
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                  <FolderOpen className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalCategories}</p>
              <Link to="/admin/categories" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                Manage Categories →
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalSales}</p>
              <Link to="/admin/reports" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                View Reports →
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock Value</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">Rs {(stats.totalStockValue || 0).toFixed(0)}</p>
              <Link to="/admin/stock" className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                Manage Stock →
              </Link>
            </div>
          </div>

          {/* Revenue & Profit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90">Total Revenue</p>
              <p className="text-3xl font-bold">Rs {formatNumber(stats.totalRevenue)}</p>
              <p className="text-xs opacity-75 mt-1">All time sales</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <BarChart2 className="h-8 w-8 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90">Total Profit</p>
              <p className="text-3xl font-bold">Rs {formatNumber(stats.totalProfit)}</p>
              <p className="text-xs opacity-75 mt-1">Net profit earned</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Activity className="h-8 w-8 opacity-80" />
              </div>
              <p className="text-sm font-medium opacity-90">Today's Sales</p>
              <p className="text-3xl font-bold">{stats.todaySalesCount || 0}</p>
              <p className="text-xs opacity-75 mt-1">Rs {formatNumber(stats.todayRevenue)} revenue</p>
            </div>
          </div>

          {/* Alerts and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Alerts */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                Stock Alerts
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-300">Out of Stock</p>
                    <p className="text-sm text-red-600 dark:text-red-400">{stats.outOfStock} products</p>
                  </div>
                  <div className="text-3xl font-bold text-red-600">{stats.outOfStock}</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <p className="font-medium text-yellow-900 dark:text-yellow-300">Low Stock</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Less than 10 units</p>
                  </div>
                  <div className="text-3xl font-bold text-yellow-600">{stats.lowStock}</div>
                </div>

                <Link
                  to="/admin/stock"
                  className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage Stock →
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/sales"
                  className="block p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <div className="flex items-center">
                    <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">New Sale</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Process a new sale transaction</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/admin/products"
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Add Product</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Add new product to inventory</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/admin/categories"
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Manage Categories</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Organize product categories</p>
                    </div>
                  </div>
                </Link>

                <Link
                  to="/admin/reports"
                  className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">View Reports</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sales and profit analysis</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Today's Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Today's Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Sales Count</p>
                <p className="text-3xl font-bold text-blue-600">{stats.todaySalesCount || 0}</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Revenue</p>
                <p className="text-3xl font-bold text-green-600">Rs {formatNumber(stats.todayRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Profit</p>
                <p className="text-3xl font-bold text-purple-600">Rs {formatNumber(stats.todayProfit)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard

