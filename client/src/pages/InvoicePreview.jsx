"use client"

import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "react-hot-toast"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Printer, ArrowLeft } from "lucide-react"

const InvoicePreview = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [invoiceData, setInvoiceData] = useState(null)

  useEffect(() => {
    if (!location.state || !location.state.invoiceData) {
      toast.error("No invoice data found")
      navigate("/sales")
      return
    }
    setInvoiceData(location.state.invoiceData)
  }, [location, navigate])

  const printInvoice = () => {
    if (!invoiceData) return

    const doc = new jsPDF()

    // Shop Name Header
    doc.setFontSize(24)
    doc.setFont("helvetica", "bold")
    doc.text("Al Madina Solar Shop", 105, 15, { align: "center" })

    // Invoice Title
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("SALES INVOICE", 105, 28, { align: "center" })

    // Invoice Details
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Invoice #: ${invoiceData.saleId}`, 20, 40)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45)
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 20, 50)

    // Customer Details
    doc.setFont("helvetica", "bold")
    doc.text("Customer Details:", 20, 60)
    doc.setFont("helvetica", "normal")
    doc.text(`Name: ${invoiceData.customerName}`, 20, 65)
    if (invoiceData.customerPhone) {
      doc.text(`Phone: ${invoiceData.customerPhone}`, 20, 70)
    }
    if (invoiceData.customerAddress) {
      doc.text(`Address: ${invoiceData.customerAddress}`, 20, 75)
    }

    // Items Table
    const tableData = invoiceData.items.map((item) => [
      item.name,
      item.barcode,
      item.quantity,
      `Rs ${(item.selling_price || 0).toFixed(2)}`,
      `Rs ${((item.selling_price || 0) * item.quantity).toFixed(2)}`,
    ])

    doc.autoTable({
      startY: 85,
      head: [["Product", "Barcode", "Qty", "Price", "Total"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    })

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text(`Subtotal: Rs ${(invoiceData.subtotal || 0).toFixed(2)}`, 140, finalY)
    doc.text(`Total: Rs ${(invoiceData.total || 0).toFixed(2)}`, 140, finalY + 7)

    // Footer
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(9)
    doc.text("Thank you for your business!", 105, finalY + 20, { align: "center" })

    // Auto-print the PDF
    doc.autoPrint()
    window.open(doc.output('bloburl'), '_blank')
  }

  if (!invoiceData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <button
          onClick={() => navigate("/sales")}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Sales
        </button>
        <button
          onClick={printInvoice}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Printer className="w-5 h-5" />
          Print Invoice
        </button>
      </div>

      {/* Invoice Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 print:shadow-none">
        {/* Shop Name */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 dark:print:text-black">
            Al Madina Solar Shop
          </h1>
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-300 dark:print:text-gray-700">
            SALES INVOICE
          </h2>
        </div>

        {/* Invoice Details */}
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Invoice #:</span> {invoiceData.saleId}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold">Time:</span> {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Customer Details</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">Name:</span> {invoiceData.customerName}
          </p>
          {invoiceData.customerPhone && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Phone:</span> {invoiceData.customerPhone}
            </p>
          )}
          {invoiceData.customerAddress && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Address:</span> {invoiceData.customerAddress}
            </p>
          )}
        </div>

        {/* Product Table */}
        <div className="mb-6">
          <table className="w-full">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Barcode</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoiceData.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.barcode}</td>
                  <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                    Rs {(item.selling_price || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                    Rs {((item.selling_price || 0) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-4">
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  Rs {(invoiceData.subtotal || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 dark:border-gray-600 pt-2">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-blue-600">Rs {(invoiceData.total || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm italic text-gray-500 dark:text-gray-400">
            Thank you for your business!
          </p>
        </div>
      </div>
    </div>
  )
}

export default InvoicePreview
