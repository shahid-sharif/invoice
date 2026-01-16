import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { AuthProvider } from "./contexts/AuthContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Login from "./pages/Login"
import SalesPage from "./pages/SalesPage"
import InvoicePreview from "./pages/InvoicePreview"
import AdminDashboard from "./pages/AdminDashboard"
import ProductManagement from "./pages/ProductManagement"
import CategoryManagement from "./pages/CategoryManagement"
import StockManagement from "./pages/StockManagement"
import ReportsDashboard from "./pages/ReportsDashboard"
import InvoiceManagement from "./pages/InvoiceManagement"
import Navbar from "./components/Navbar"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Toaster position="top-right" />
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <div className="container mx-auto px-4 py-8 pt-24">
              <Routes>
                <Route path="/" element={<Navigate to="/sales" replace />} />
                <Route path="/sales" element={<SalesPage />} />
                <Route path="/invoice-preview" element={<InvoicePreview />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/products"
                  element={
                    <ProtectedRoute>
                      <ProductManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/categories"
                  element={
                    <ProtectedRoute>
                      <CategoryManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/stock"
                  element={
                    <ProtectedRoute>
                      <StockManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute>
                      <ReportsDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/invoices"
                  element={
                    <ProtectedRoute>
                      <InvoiceManagement />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/sales" replace />} />
              </Routes>
            </div>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App

