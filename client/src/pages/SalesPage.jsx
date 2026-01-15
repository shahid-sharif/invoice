"use client"

import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Search, ShoppingCart, Download, Trash2, Plus, Minus, Scan, RefreshCw } from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL

const SalesPage = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerAddress, setCustomerAddress] = useState("")

  useEffect(() => {
    fetchProducts()
    fetchCategories()

    const savedCart = localStorage.getItem("sales_cart")
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("sales_cart", JSON.stringify(cart))
  }, [cart])

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

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch categories")
      }

      setCategories(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const addToCart = (product) => {
    if (product.stock_quantity === 0 || product.stock_status === "Out of Stock") {
      toast.error(`${product.name} is out of stock!`)
      return
    }

    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item._id === product._id)

      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          toast.error(`Only ${product.stock_quantity} units available in stock!`)
          return prevCart
        }
        return prevCart.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        )
      } else {
        return [...prevCart, { ...product, quantity: 1 }]
      }
    })

    toast.success(`Added ${product.name} to cart`)
  }

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId)
      return
    }

    const product = products.find((p) => p._id === productId)
    if (product && newQuantity > product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} units available!`)
      return
    }

    setCart((prevCart) =>
      prevCart.map((item) => (item._id === productId ? { ...item, quantity: newQuantity } : item))
    )
  }

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== productId))
    toast.success("Item removed from cart")
  }

  const clearCart = () => {
    setCart([])
    setCustomerName("")
    setCustomerPhone("")
    setCustomerAddress("")
    toast.success("Cart cleared")
  }

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + item.selling_price * item.quantity, 0)
  }

  const calculateProfit = () => {
    return cart.reduce((profit, item) => profit + (item.selling_price - item.cost_price) * item.quantity, 0)
  }

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!")
      return
    }

    const saleId = `SALE-${Date.now()}`
    const subtotal = calculateSubtotal()
    const total = subtotal

    const saleData = {
      sale_id: saleId,
      customerName: customerName || "Walk-in Customer",
      customerPhone,
      customerAddress,
      items: cart.map((item) => ({
        product: item._id,
        name: item.name,
        barcode: item.barcode,
        quantity: item.quantity,
        selling_price: item.selling_price,
      })),
      subtotal,
      tax: 0,
      total,
    }

    try {
      const response = await fetch(`${API_URL}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saleData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to complete sale")
      }

      toast.success(`Sale completed! Profit: Rs ${(data.total_profit || 0).toFixed(2)}`)
      
      // Generate and download invoice PDF
      generateInvoicePDF(saleId, saleData, data.total_profit)
      
      // Clear cart and customer info
      clearCart()
      
      // Refresh products to get updated stock
      fetchProducts()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const generateInvoicePDF = (saleId, saleData, profit) => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("SALES INVOICE", 105, 20, { align: "center" })

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Invoice #: ${saleId}`, 20, 35)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 40)
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 45)

    // Customer Details
    doc.setFont("helvetica", "bold")
    doc.text("Customer Details:", 20, 55)
    doc.setFont("helvetica", "normal")
    doc.text(`Name: ${saleData.customerName}`, 20, 60)
    if (saleData.customerPhone) {
      doc.text(`Phone: ${saleData.customerPhone}`, 20, 65)
    }
    if (saleData.customerAddress) {
      doc.text(`Address: ${saleData.customerAddress}`, 20, 70)
    }

    // Items Table
    const tableData = cart.map((item) => [
      item.name,
      item.barcode,
      item.quantity,
      `Rs ${(item.selling_price || 0).toFixed(2)}`,
      `Rs ${((item.selling_price || 0) * item.quantity).toFixed(2)}`,
    ])

    doc.autoTable({
      startY: 80,
      head: [["Product", "Barcode", "Qty", "Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    })

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text(`Subtotal: Rs ${(saleData.subtotal || 0).toFixed(2)}`, 140, finalY)
    doc.text(`Total: Rs ${(saleData.total || 0).toFixed(2)}`, 140, finalY + 7)

    // Footer
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(9)
    doc.text("Thank you for your business!", 105, finalY + 20, { align: "center" })

    doc.save(`Invoice_${saleId}.pdf`)
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = !selectedCategory || product.category?._id === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales / Point of Sale</h1>
        <button
          onClick={() => { fetchProducts(); fetchCategories(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2">
          {/* Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or barcode..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow ${
                    product.stock_quantity === 0 || product.stock_status === "Out of Stock" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.barcode}</p>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Rs {(product.selling_price || 0).toFixed(2)}</span>
                    <div className="text-right space-y-1">
                      <div
                        className={`text-xs font-semibold ${
                          product.stock_status === "Out of Stock" || product.stock_quantity === 0
                            ? "text-red-600 dark:text-red-400"
                            : product.stock_quantity < 10
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                      >
                        Stock: {product.stock_quantity}
                      </div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          product.stock_status === "Out of Stock" 
                            ? "bg-red-500 text-white" 
                            : "bg-green-500 text-white"
                        }`}>
                          {product.stock_status || "In Stock"}
                        </span>
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-500 text-white">
                          {product.category?.name || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                Cart ({cart.length})
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Customer Info */}
            <div className="mb-4 space-y-2">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name (Optional)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (Optional)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Address (Optional)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Cart Items */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item._id} className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Rs {(item.selling_price || 0).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity - 1)}
                        className="p-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item._id, item.quantity + 1)}
                        className="p-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-2 mb-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Rs {calculateSubtotal().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-blue-600">Rs {calculateSubtotal().toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              onClick={completeSale}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5" />
              Complete Sale & Print Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesPage
