import mongoose from "mongoose"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/invoice-builder"

async function resetDatabase() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}`)
    await mongoose.connect(MONGODB_URI)

    console.log("Connected to MongoDB. Dropping collections...")

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray()

    // Drop each collection
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name)
      console.log(`Dropped collection: ${collection.name}`)
    }

    console.log("Database reset successfully.")
    console.log("The database collections have been dropped. They will be recreated when you restart the server.")

    // Close the connection
    await mongoose.connection.close()
    console.log("Database connection closed.")
  } catch (error) {
    console.error("Error resetting database:", error)
  } finally {
    process.exit(0)
  }
}

resetDatabase()

