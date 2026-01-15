import express from "express"
import cors from "cors"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import mongoose from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryStorage } from "multer-storage-cloudinary"
import dotenv from "dotenv"
import { defaultMaxListeners } from "events"

// Load environment variables
dotenv.config()

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 5000

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "invoice-builder",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 500, height: 500, crop: "limit" }],
  },
})

// Configure multer for file uploads
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (extname && mimetype) {
      return cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"))
    }
  },
})

// Middleware - Configure CORS properly
app.use(cors({
  origin: [
    "https://invoice-builder-madina-shop.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
app.use(express.json())

// Handle preflight requests
app.options("*", cors({
  origin: [
    "https://invoice-builder-madina-shop.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI 

// MongoDB connection with retry logic
async function connectDatabase() {
  try {
    if (MONGODB_URI) {
      await mongoose.connect(MONGODB_URI)
      console.log("Connected to MongoDB database")
    } else {
      console.warn("MONGODB_URI not set, running without database")
    }
  } catch (error) {
    console.error("Database connection error:", error.message)
  }
}
// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
})

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
})

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  barcode: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  cost_price: { type: Number, required: true },
  selling_price: { type: Number, required: true },
  stock_quantity: { type: Number, default: 0 },
  stock_status: { type: String, enum: ["In Stock", "Out of Stock"], default: "In Stock" },
  description: { type: String },
  image: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
})

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  type: { type: String, enum: ["IN", "OUT", "RETURN"], required: true },
  quantity: { type: Number, required: true },
  cost_price: { type: Number }, // For IN movements
  selling_price: { type: Number }, // For OUT movements
  notes: { type: String },
  date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
})

const saleSchema = new mongoose.Schema({
  sale_id: { type: String, required: true, unique: true },
  customer_name: { type: String },
  customer_phone: { type: String },
  customer_address: { type: String },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      barcode: String,
      quantity: Number,
      cost_price: Number,
      selling_price: Number,
      profit: Number,
    },
  ],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  total_profit: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
})

const invoiceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String },
  customer_address: { type: String },
  date: { type: Date, required: true },
  items: { type: Array, required: true },
  subtotal: { type: Number },
  tax: { type: Number },
  total: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
})

// Create models
const User = mongoose.model("User", userSchema)
const Category = mongoose.model("Category", categorySchema)
const Product = mongoose.model("Product", productSchema)
const StockMovement = mongoose.model("StockMovement", stockMovementSchema)
const Sale = mongoose.model("Sale", saleSchema)
const Invoice = mongoose.model("Invoice", invoiceSchema)

// Generate unique barcode
const generateUniqueBarcode = async () => {
  let barcode
  let exists = true
  
  while (exists) {
    // Generate 7-digit barcode
    barcode = Math.floor(1000000 + Math.random() * 9000000).toString()
    
    // Check if barcode already exists
    const product = await Product.findOne({ barcode })
    exists = product !== null
  }
  
  return barcode
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Initialize database
async function initializeDatabase() {
  try {
    if (!MONGODB_URI) {
      console.warn("MONGODB_URI not set, skipping database initialization")
      return
    }

    await mongoose.connect(MONGODB_URI)
    console.log("Connected to MongoDB database")

    // Check if admin user exists, if not create one
    const adminUser = await User.findOne({ email: "shahidsharif520@gmail.com" })

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("admin@520", 10)
      await User.create({
        email: "shahidsharif520@gmail.com",
        password: hashedPassword,
      })
      console.log("Admin user created")
    }
  } catch (error) {
    console.error("Database initialization error:", error)
    // Don't throw, just log the error so server still starts
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Authentication required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" })
    }

    req.user = user
    next()
  })
}

// Routes
app.get("/", async (req, res) => {
  res.send("Hello World")
})

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "24h" })

    res.json({
      id: user._id,
      email: user.email,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Category routes
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    res.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/categories/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)

    if (!category) {
      return res.status(404).json({ message: "Category not found" })
    }

    res.json(category)
  } catch (error) {
    console.error("Error fetching category:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/categories", authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ message: "Category name is required" })
    }

    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" })
    }

    const newCategory = await Category.create({
      name,
      description: description || "",
    })

    res.status(201).json(newCategory)
  } catch (error) {
    console.error("Error creating category:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/categories/:id", authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body
    const categoryId = req.params.id

    if (!name) {
      return res.status(400).json({ message: "Category name is required" })
    }

    const existingCategory = await Category.findById(categoryId)

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Check if another category has this name
    const duplicateCategory = await Category.findOne({ name, _id: { $ne: categoryId } })
    if (duplicateCategory) {
      return res.status(400).json({ message: "Category name already exists" })
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      {
        name,
        description: description || "",
      },
      { new: true },
    )

    res.json(updatedCategory)
  } catch (error) {
    console.error("Error updating category:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/categories/:id", authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id

    const existingCategory = await Category.findById(categoryId)

    if (!existingCategory) {
      return res.status(404).json({ message: "Category not found" })
    }

    // Check if any products use this category
    const productsCount = await Product.countDocuments({ category: categoryId })
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. ${productsCount} product(s) are using this category.` 
      })
    }

    await Category.findByIdAndDelete(categoryId)

    res.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("Error deleting category:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Product routes
app.get("/api/products", async (req, res) => {
  try {
    const { category, barcode, search } = req.query
    
    let query = {}
    
    if (category) {
      query.category = category
    }
    
    if (barcode) {
      query.barcode = barcode
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ]
    }
    
    const products = await Product.find(query).populate("category").sort({ created_at: -1 })
    res.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Generate barcode endpoint
app.get("/api/generate-barcode", authenticateToken, async (req, res) => {
  try {
    const barcode = await generateUniqueBarcode()
    res.json({ barcode })
  } catch (error) {
    console.error("Error generating barcode:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/products", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    let { name, barcode, category, cost_price, selling_price, stock_quantity, stock_status, description } = req.body

    if (!name || !category || !cost_price || !selling_price || !req.file) {
      return res.status(400).json({ message: "Name, category, cost price, selling price, and image are required" })
    }

    // Auto-generate barcode if not provided
    if (!barcode || barcode.trim() === "") {
      barcode = await generateUniqueBarcode()
    } else {
      // Check if barcode already exists
      const existingProduct = await Product.findOne({ barcode })
      if (existingProduct) {
        return res.status(400).json({ message: "Barcode already exists" })
      }
    }

    // Verify category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" })
    }

    const newProduct = await Product.create({
      name,
      barcode,
      category,
      cost_price: parseFloat(cost_price),
      selling_price: parseFloat(selling_price),
      stock_quantity: parseInt(stock_quantity) || 0,
      stock_status: stock_status || "In Stock",
      description: description || "",
      image: req.file.path,
    })

    // If initial stock > 0, create a stock IN movement
    if (parseInt(stock_quantity) > 0) {
      await StockMovement.create({
        product: newProduct._id,
        type: "IN",
        quantity: parseInt(stock_quantity),
        cost_price: parseFloat(cost_price),
        notes: "Initial stock",
      })
    }

    const populatedProduct = await Product.findById(newProduct._id).populate("category")
    res.status(201).json(populatedProduct)
  } catch (error) {
    console.error("Error creating product:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/products/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { name, barcode, category, cost_price, selling_price, stock_status, description } = req.body
    const productId = req.params.id

    if (!name || !barcode || !category || !cost_price || !selling_price) {
      return res.status(400).json({ message: "Name, barcode, category, cost price, and selling price are required" })
    }

    const existingProduct = await Product.findById(productId)

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Check if barcode is being changed and if new barcode already exists
    if (barcode !== existingProduct.barcode) {
      const duplicateBarcode = await Product.findOne({ barcode, _id: { $ne: productId } })
      if (duplicateBarcode) {
        return res.status(400).json({ message: "Barcode already exists" })
      }
    }

    // Verify category exists
    const categoryExists = await Category.findById(category)
    if (!categoryExists) {
      return res.status(400).json({ message: "Category not found" })
    }

    let imagePath = existingProduct.image

    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (existingProduct.image) {
        const publicId = existingProduct.image.split("/").pop().split(".")[0]
        await cloudinary.uploader.destroy(`invoice-builder/${publicId}`)
      }

      imagePath = req.file.path
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      {
        name,
        barcode,
        category,
        cost_price: parseFloat(cost_price),
        selling_price: parseFloat(selling_price),
        stock_status: stock_status || "In Stock",
        description: description || "",
        image: imagePath,
      },
      { new: true },
    ).populate("category")

    res.json(updatedProduct)
  } catch (error) {
    console.error("Error updating product:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    const productId = req.params.id

    const existingProduct = await Product.findById(productId)

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Delete image from Cloudinary
    if (existingProduct.image) {
      const publicId = existingProduct.image.split("/").pop().split(".")[0]
      await cloudinary.uploader.destroy(`invoice-builder/${publicId}`)
    }

    await Product.findByIdAndDelete(productId)

    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Stock Movement routes
app.get("/api/stock-movements", authenticateToken, async (req, res) => {
  try {
    const { product, type, startDate, endDate } = req.query
    
    let query = {}
    
    if (product) {
      query.product = product
    }
    
    if (type) {
      query.type = type
    }
    
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        query.date.$lte = new Date(endDate)
      }
    }
    
    const movements = await StockMovement.find(query)
      .populate("product")
      .sort({ date: -1 })
    res.json(movements)
  } catch (error) {
    console.error("Error fetching stock movements:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/stock-movements", authenticateToken, async (req, res) => {
  try {
    const { product, type, quantity, cost_price, selling_price, notes } = req.body

    if (!product || !type || !quantity) {
      return res.status(400).json({ message: "Product, type, and quantity are required" })
    }

    const productData = await Product.findById(product)
    if (!productData) {
      return res.status(404).json({ message: "Product not found" })
    }

    // Create stock movement
    const movement = await StockMovement.create({
      product,
      type,
      quantity: parseInt(quantity),
      cost_price: cost_price ? parseFloat(cost_price) : undefined,
      selling_price: selling_price ? parseFloat(selling_price) : undefined,
      notes: notes || "",
    })

    // Update product stock quantity
    if (type === "IN") {
      productData.stock_quantity += parseInt(quantity)
    } else if (type === "OUT") {
      productData.stock_quantity -= parseInt(quantity)
    } else if (type === "RETURN") {
      productData.stock_quantity += parseInt(quantity)
    }

    await productData.save()

    const populatedMovement = await StockMovement.findById(movement._id).populate("product")
    res.status(201).json(populatedMovement)
  } catch (error) {
    console.error("Error creating stock movement:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Sales routes
app.get("/api/sales", async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    let query = {}
    
    if (startDate || endDate) {
      query.date = {}
      if (startDate) {
        query.date.$gte = new Date(startDate)
      }
      if (endDate) {
        query.date.$lte = new Date(endDate)
      }
    }
    
    const sales = await Sale.find(query).sort({ date: -1 })
    res.json(sales)
  } catch (error) {
    console.error("Error fetching sales:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/sales/:id", async (req, res) => {
  try {
    const sale = await Sale.findOne({ sale_id: req.params.id })

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }

    res.json(sale)
  } catch (error) {
    console.error("Error fetching sale:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/sales", async (req, res) => {
  try {
    const { sale_id, customerName, customerPhone, customerAddress, items, subtotal, tax, total } = req.body

    if (!sale_id || !items || !items.length || !total) {
      return res.status(400).json({ message: "Sale ID, items, and total are required" })
    }

    let total_profit = 0
    const processedItems = []

    // Process each item and update stock
    for (const item of items) {
      const product = await Product.findById(item.product)
      
      if (!product) {
        return res.status(404).json({ message: `Product ${item.name} not found` })
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}` 
        })
      }

      const itemProfit = (item.selling_price - product.cost_price) * item.quantity
      total_profit += itemProfit

      processedItems.push({
        product: product._id,
        name: product.name,
        barcode: product.barcode,
        quantity: item.quantity,
        cost_price: product.cost_price,
        selling_price: item.selling_price,
        profit: itemProfit,
      })

      // Update stock quantity
      product.stock_quantity -= item.quantity
      await product.save()

      // Create stock OUT movement
      await StockMovement.create({
        product: product._id,
        type: "OUT",
        quantity: item.quantity,
        selling_price: item.selling_price,
        notes: `Sale ${sale_id}`,
      })
    }

    await Sale.create({
      sale_id,
      customer_name: customerName || "",
      customer_phone: customerPhone || "",
      customer_address: customerAddress || "",
      items: processedItems,
      subtotal: subtotal || 0,
      tax: tax || 0,
      total,
      total_profit,
    })

    res.status(201).json({ message: "Sale created successfully", total_profit })
  } catch (error) {
    console.error("Error creating sale:", error)
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    })
  }
})

app.delete("/api/sales/:id", authenticateToken, async (req, res) => {
  try {
    const saleId = req.params.id

    const existingSale = await Sale.findOne({ sale_id: saleId })

    if (!existingSale) {
      return res.status(404).json({ message: "Sale not found" })
    }

    await Sale.deleteOne({ sale_id: saleId })

    res.json({ message: "Sale deleted successfully" })
  } catch (error) {
    console.error("Error deleting sale:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Reports routes
app.get("/api/reports/sales", async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query
    
    let dateQuery = {}
    const now = new Date()
    
    if (period === "daily") {
      dateQuery = {
        $gte: new Date(now.setHours(0, 0, 0, 0)),
        $lte: new Date(now.setHours(23, 59, 59, 999)),
      }
    } else if (period === "weekly") {
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
      weekStart.setHours(0, 0, 0, 0)
      dateQuery = {
        $gte: weekStart,
        $lte: new Date(),
      }
    } else if (period === "monthly") {
      dateQuery = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(),
      }
    } else if (period === "yearly") {
      dateQuery = {
        $gte: new Date(now.getFullYear(), 0, 1),
        $lte: new Date(),
      }
    } else if (startDate && endDate) {
      dateQuery = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }
    
    const sales = await Sale.find({ date: dateQuery }).sort({ date: -1 })
    
    const totalSales = sales.length
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
    const totalProfit = sales.reduce((sum, sale) => sum + sale.total_profit, 0)
    
    res.json({
      period,
      totalSales,
      totalRevenue,
      totalProfit,
      sales,
    })
  } catch (error) {
    console.error("Error fetching sales report:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/reports/stock", authenticateToken, async (req, res) => {
  try {
    const products = await Product.find().populate("category")
    
    const lowStock = products.filter(p => p.stock_quantity < 10)
    const outOfStock = products.filter(p => p.stock_quantity === 0)
    const totalValue = products.reduce((sum, p) => sum + (p.cost_price * p.stock_quantity), 0)
    
    res.json({
      totalProducts: products.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      totalStockValue: totalValue,
      lowStock,
      outOfStock,
    })
  } catch (error) {
    console.error("Error fetching stock report:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Invoice routes
app.get("/api/invoices", async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ date: -1 })
    res.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/invoices/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ id: req.params.id })

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" })
    }

    res.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/invoices", async (req, res) => {
  try {
    const { id, customerName, customerPhone, customerAddress, date, items, subtotal, tax, total } = req.body

    // Log the entire request body for debugging
    console.log("Invoice request body:", JSON.stringify(req.body, null, 2))

    if (!id || !customerName || !date || !items || !total) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    // Log the values being inserted into the database
    console.log("Inserting invoice with values:", {
      id,
      customerName,
      customerPhone: customerPhone || "",
      customerAddress: customerAddress || "",
      date,
      itemsCount: items.length,
      subtotal: subtotal || 0,
      tax: tax || 0,
      total,
    })

    try {
      await Invoice.create({
        id,
        customer_name: customerName,
        customer_phone: customerPhone || "",
        customer_address: customerAddress || "",
        date,
        items,
        subtotal: subtotal || 0,
        tax: tax || 0,
        total,
      })

      console.log("Invoice inserted successfully")
      res.status(201).json({ message: "Invoice created successfully" })
    } catch (dbError) {
      console.error("Database error:", dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }
  } catch (error) {
    console.error("Error creating invoice:", error)
    console.error("Error stack:", error.stack)
    res.status(500).json({
      message: "Server error",
      error: error.message,
      stack: error.stack,
    })
  }
})

app.delete("/api/invoices/:id", async (req, res) => {
  try {
    const invoiceId = req.params.id

    const existingInvoice = await Invoice.findOne({ id: invoiceId })

    if (!existingInvoice) {
      return res.status(404).json({ message: "Invoice not found" })
    }

    await Invoice.deleteOne({ id: invoiceId })

    res.json({ message: "Invoice deleted successfully" })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Stats route
app.get("/api/stats", async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments()
    const totalCategories = await Category.countDocuments()
    const totalSales = await Sale.countDocuments()
    
    const totalRevenueResult = await Sale.aggregate([{ $group: { _id: null, sum: { $sum: "$total" } } }])
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].sum : 0
    
    const totalProfitResult = await Sale.aggregate([{ $group: { _id: null, sum: { $sum: "$total_profit" } } }])
    const totalProfit = totalProfitResult.length > 0 ? totalProfitResult[0].sum : 0
    
    const products = await Product.find()
    const lowStock = products.filter(p => p.stock_quantity < 10).length
    const outOfStock = products.filter(p => p.stock_quantity === 0).length
    const totalStockValue = products.reduce((sum, p) => sum + (p.cost_price * p.stock_quantity), 0)
    
    // Today's sales
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaySales = await Sale.find({ date: { $gte: today } })
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)
    const todayProfit = todaySales.reduce((sum, sale) => sum + sale.total_profit, 0)

    res.json({
      totalProducts,
      totalCategories,
      totalSales,
      totalRevenue,
      totalProfit,
      lowStock,
      outOfStock,
      totalStockValue,
      todayRevenue,
      todayProfit,
      todaySalesCount: todaySales.length,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Test endpoint to verify database connection
app.get("/api/test", async (req, res) => {
  try {
    // Try a simple query
    const collections = await mongoose.connection.db.listCollections().toArray()
    res.json({
      message: "Database connection successful",
      result: { test: 1 },
      collections: collections.map((c) => c.name),
    })
  } catch (error) {
    console.error("Test endpoint error:", error)
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    })
  }
})

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err)
  console.error("Error stack:", err.stack)
  res.status(500).json({
    message: "An unexpected error occurred",
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  })
})

// Start server with better error handling
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  })
  .catch((err) => {
    console.error("Database initialization failed, but starting server anyway:", err)
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (without database)`)
    })
  })


  export default app;