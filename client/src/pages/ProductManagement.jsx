"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "react-hot-toast"
import { Plus, Edit, Trash2, X, Save, Image as ImageIcon, Scan, RefreshCw } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

const API_URL = import.meta.env.VITE_API_URL

const ProductManagement = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentProduct, setCurrentProduct] = useState({
    _id: null,
    name: "",
    barcode: "",
    category: "",
    cost_price: "",
    selling_price: "",
    stock_quantity: "",
    stock_status: "In Stock",
    description: "",
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory || searchTerm) {
      filterProducts()
    } else {
      fetchProducts()
    }
  }, [selectedCategory, searchTerm])

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

  const filterProducts = async () => {
    try {
      let url = `${API_URL}/api/products?`
      if (selectedCategory) {
        url += `category=${selectedCategory}&`
      }
      if (searchTerm) {
        url += `search=${searchTerm}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch products")
      }

      setProducts(data)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const openModal = (product = null) => {
    if (product) {
      setCurrentProduct({
        _id: product._id,
        name: product.name,
        barcode: product.barcode,
        category: product.category?._id || "",
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status || "In Stock",
        description: product.description || "",
      })
      setImagePreview(product.image)
      setIsEditing(true)
    } else {
      setCurrentProduct({
        _id: null,
        name: "",
        barcode: "",
        category: "",
        cost_price: "",
        selling_price: "",
        stock_quantity: "0",
        stock_status: "In Stock",
        description: "",
      })
      setImagePreview("")
      setImageFile(null)
      setIsEditing(false)
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setCurrentProduct({
      _id: null,
      name: "",
      barcode: "",
      category: "",
      cost_price: "",
      selling_price: "",
      stock_quantity: "",
      stock_status: "In Stock",
      description: "",
    })
    setImagePreview("")
    setImageFile(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCurrentProduct((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current.click()
  }

  const validateForm = () => {
    if (!currentProduct.name.trim()) {
      toast.error("Product name is required")
      return false
    }

    if (!currentProduct.barcode.trim()) {
      toast.error("Barcode is required")
      return false
    }

    if (!currentProduct.category) {
      toast.error("Category is required")
      return false
    }

    if (!currentProduct.cost_price || parseFloat(currentProduct.cost_price) <= 0) {
      toast.error("Valid cost price is required")
      return false
    }

    if (!currentProduct.selling_price || parseFloat(currentProduct.selling_price) <= 0) {
      toast.error("Valid selling price is required")
      return false
    }

    if (!isEditing && !imageFile) {
      toast.error("Product image is required")
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    const formData = new FormData()
    formData.append("name", currentProduct.name)
    formData.append("barcode", currentProduct.barcode)
    formData.append("category", currentProduct.category)
    formData.append("cost_price", currentProduct.cost_price)
    formData.append("selling_price", currentProduct.selling_price)
    formData.append("stock_quantity", currentProduct.stock_quantity || "0")
    formData.append("stock_status", currentProduct.stock_status)
    formData.append("description", currentProduct.description)

    if (imageFile) {
      formData.append("image", imageFile)
    }

    try {
      const url = isEditing ? `${API_URL}/api/products/${currentProduct._id}` : `${API_URL}/api/products`

      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        body: formData,
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to save product")
      }

      toast.success(isEditing ? "Product updated successfully" : "Product added successfully")
      fetchProducts()
      closeModal()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to delete product")
      }

      toast.success("Product deleted successfully")
      fetchProducts()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const toggleStockStatus = async (product) => {
    const newStatus = product.stock_status === "In Stock" ? "Out of Stock" : "In Stock"
    
    try {
      const formData = new FormData()
      formData.append("name", product.name)
      formData.append("barcode", product.barcode)
      formData.append("category", product.category._id)
      formData.append("cost_price", product.cost_price)
      formData.append("selling_price", product.selling_price)
      formData.append("stock_quantity", product.stock_quantity)
      formData.append("stock_status", newStatus)
      formData.append("description", product.description || "")

      const response = await fetch(`${API_URL}/api/products/${product._id}`, {
        method: "PUT",
        body: formData,
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to update stock status")
      }

      toast.success(`Stock status updated to ${newStatus}`)
      fetchProducts()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const generateBarcode = async () => {
    try {
      const response = await fetch(`${API_URL}/api/generate-barcode`, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate barcode")
      }

      setCurrentProduct((prev) => ({
        ...prev,
        barcode: data.barcode,
      }))

      toast.success("Barcode generated successfully")
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getStockStatusColor = (quantity) => {
    if (quantity === 0) return "text-red-600 dark:text-red-400"
    if (quantity < 10) return "text-yellow-600 dark:text-yellow-400"
    return "text-green-600 dark:text-green-400"
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Management</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search by Name or Barcode
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Category
            </label>
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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No products found</p>
          <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Selling Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {products.map((product) => (
                  <tr key={product._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img
                          src={product.image || "/placeholder.svg"}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Scan className="w-4 h-4 mr-1" />
                        {product.barcode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {product.category?.name || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">Rs {product.cost_price?.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">Rs {product.selling_price?.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-semibold ${getStockStatusColor(product.stock_quantity)}`}>
                        {product.stock_quantity}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStockStatus(product)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                          product.stock_status === "In Stock" 
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800" 
                            : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800"
                        }`}
                        title="Click to toggle status"
                      >
                        {product.stock_status || "In Stock"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(product)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={currentProduct.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Barcode
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="barcode"
                      value={currentProduct.barcode}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter or generate barcode"
                    />
                    <button
                      type="button"
                      onClick={generateBarcode}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                      title="Generate Barcode"
                    >
                      
                      <span className="hidden sm:inline">Generate</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={currentProduct.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cost Price (Rs) *
                  </label>
                  <input
                    type="number"
                    name="cost_price"
                    value={currentProduct.cost_price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter cost price"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selling Price (Rs) *
                  </label>
                  <input
                    type="number"
                    name="selling_price"
                    value={currentProduct.selling_price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter selling price"
                    required
                  />
                </div>

                {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Initial Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="stock_quantity"
                      value={currentProduct.stock_quantity}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter initial stock"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stock Status *
                  </label>
                  <select
                    name="stock_status"
                    value={currentProduct.stock_status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="In Stock">In Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={currentProduct.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter product description"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Image *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />

                <div
                  onClick={triggerFileInput}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="mx-auto h-40 object-contain" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Click to change image</p>
                    </div>
                  ) : (
                    <div className="py-4">
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Click to upload product image</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update Product" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductManagement
