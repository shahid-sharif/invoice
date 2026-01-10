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
//hello
// MongoDB Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
})

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String },
  image: { type: String, required: true },
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
const Product = mongoose.model("Product", productSchema)
const Invoice = mongoose.model("Invoice", invoiceSchema)

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// Initialize database
async function initializeDatabase() {
  try {
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
    throw error
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

// Product routes
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 })
    res.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/products", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body

    if (!name || !price || !req.file) {
      return res.status(400).json({ message: "Name, price, and image are required" })
    }

    const newProduct = await Product.create({
      name,
      price,
      description: description || "",
      image: req.file.path,
    })

    res.status(201).json(newProduct)
  } catch (error) {
    console.error("Error creating product:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/products/:id", authenticateToken, upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body
    const productId = req.params.id

    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" })
    }

    const existingProduct = await Product.findById(productId)

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" })
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
        price,
        description: description || "",
        image: imagePath,
      },
      { new: true },
    )

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
    const totalInvoices = await Invoice.countDocuments()
    const totalRevenueResult = await Invoice.aggregate([{ $group: { _id: null, sum: { $sum: "$total" } } }])
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].sum : 0

    res.json({
      totalProducts,
      totalInvoices,
      totalRevenue,
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
    console.error("Failed to initialize database:", err)
    console.error("Error stack:", err.stack)
    process.exit(1)
  })


  export default app;