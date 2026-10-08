import { jsPDF } from 'jspdf'
import type { ExpenseRecord } from '~/stores/expenses'
import { calculateCategoryPercentages, resolveExpenseCategory } from '~/utils/expenseCategories'

export interface GeneratePdfOptions {
  locale?: string
  title?: string
  periodLabel?: string
  dateRangeText?: string
  categoryLabel?: (category: string) => string
  appName?: string
}

const safeText = (text: string, maxLength = 45): string => {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed
}

export function generateExpensesPdf(
  expenses: ExpenseRecord[],
  options: GeneratePdfOptions = {}
): Uint8Array {
  const locale = options.locale || 'es-ES'
  const appName = options.appName || 'Cuánto Llevo Gastao'
  const docTitle = options.title || 'Informe de Gastos'
  const periodLabel = options.periodLabel || 'Todos'
  const dateRangeText = options.dateRangeText || ''
  const getCatLabel = options.categoryLabel || ((c: string) => c)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const pageHeight = 297
  const marginLeft = 14
  const marginRight = 14
  const usableWidth = pageWidth - marginLeft - marginRight // 182mm
  const marginBottom = 22

  // Sort expenses chronologically
  const sorted = expenses.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const totalAmount = sorted.reduce((sum, e) => sum + (e.amount || 0), 0)
  const averageAmount = sorted.length > 0 ? totalAmount / sorted.length : 0

  const formatCurrency = (val: number) => `${val.toFixed(2)} €`
  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  let currentY = 16

  // 1. Header Banner
  doc.setFillColor(5, 150, 105) // Emerald #059669
  doc.rect(marginLeft, currentY, 4, 18, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(17, 24, 39) // #111827
  doc.text(appName.toUpperCase(), marginLeft + 7, currentY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128) // #6B7280
  doc.text(docTitle, marginLeft + 7, currentY + 12)

  // Right Header: Period & Export Date
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(5, 150, 105)
  doc.text(periodLabel, pageWidth - marginRight, currentY + 6, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  if (dateRangeText) {
    doc.text(dateRangeText, pageWidth - marginRight, currentY + 11, { align: 'right' })
  }
  const now = new Date()
  const generatedLabel = `Emitido: ${now.toLocaleDateString(locale)} ${now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
  doc.text(generatedLabel, pageWidth - marginRight, currentY + (dateRangeText ? 15 : 11), { align: 'right' })

  currentY += 24

  // Subtle separator line
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.4)
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY)
  currentY += 6

  // 2. Summary KPI Cards
  const cardWidth = (usableWidth - 8) / 3
  const cardHeight = 18

  // Card 1: Total Spent
  doc.setFillColor(240, 253, 244) // Emerald 50
  doc.setDrawColor(167, 243, 208) // Emerald 200
  doc.roundedRect(marginLeft, currentY, cardWidth, cardHeight, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(4, 120, 87)
  doc.text('TOTAL GASTADO', marginLeft + 4, currentY + 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(6, 95, 70)
  doc.text(formatCurrency(totalAmount), marginLeft + 4, currentY + 13)

  // Card 2: Purchase Count
  const card2X = marginLeft + cardWidth + 4
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)
  doc.text('Nº DE COMPRAS', card2X + 4, currentY + 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(17, 24, 39)
  doc.text(`${sorted.length} compras`, card2X + 4, currentY + 13)

  // Card 3: Average Ticket
  const card3X = card2X + cardWidth + 4
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 2, 2, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(107, 114, 128)
  doc.text('GASTO MEDIO', card3X + 4, currentY + 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(17, 24, 39)
  doc.text(formatCurrency(averageAmount), card3X + 4, currentY + 13)

  currentY += cardHeight + 8

  // 3. Category Breakdown Section
  // Categories are mutually exclusive ("Las categorias de gasto son excluyentes").
  const categoryTotals: Record<string, { total: number, count: number }> = {}

  // Normalize subcategories or OCR aliases to canonical categories
  const normalizeCat = (c: string): string => {
    const norm = c.toLowerCase().trim()
    if (norm === 'fruta' || norm === 'verdura' || norm === 'carne' || norm === 'carnes' || norm === 'pescado') {
      return 'frescos'
    }
    return norm
  }

  sorted.forEach(expense => {
    if (expense.items && expense.items.length > 0) {
      let itemsSum = 0
      expense.items.forEach(item => {
        const cat = normalizeCat(item.category || resolveExpenseCategory(expense))
        if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, count: 0 }
        categoryTotals[cat].total += (item.price || 0)
        categoryTotals[cat].count += 1
        itemsSum += (item.price || 0)
      })
      const remainder = (expense.amount || 0) - itemsSum
      if (remainder > 0.01) {
        const mainCat = normalizeCat(resolveExpenseCategory(expense))
        if (!categoryTotals[mainCat]) categoryTotals[mainCat] = { total: 0, count: 0 }
        categoryTotals[mainCat].total += remainder
      }
    } else {
      const cat = normalizeCat(resolveExpenseCategory(expense))
      if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, count: 0 }
      categoryTotals[cat].total += (expense.amount || 0)
      categoryTotals[cat].count += 1
    }
  })

  // Do not include categories that are at zero ("Las que esten a cero no las incluyas en las exportaciones")
  const activeCategories = Object.entries(categoryTotals)
    .filter(([, data]) => data.total > 0.001)
    .sort(([, a], [, b]) => {
      if (b.total !== a.total) {
        return b.total - a.total
      }
      return b.count - a.count
    })

  // Calculate percentages that strictly sum to 100.0% ("y el procentaje ha de sumar 100, lógicamente")
  const percentages = calculateCategoryPercentages(activeCategories, totalAmount, 1)

  if (activeCategories.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(31, 41, 55)
    doc.text('Resumen por Categorías', marginLeft, currentY)
    currentY += 4

    // Table header for categories
    doc.setFillColor(243, 244, 246)
    doc.rect(marginLeft, currentY, usableWidth, 6, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(75, 85, 99)
    doc.text('Categoría', marginLeft + 3, currentY + 4.2)
    doc.text('Compras', marginLeft + 85, currentY + 4.2)
    doc.text('% Total', marginLeft + 120, currentY + 4.2)
    doc.text('Importe', pageWidth - marginRight - 3, currentY + 4.2, { align: 'right' })
    currentY += 6

    activeCategories.forEach(([category, data], idx) => {
      const pct = percentages.get(category) ?? 0
      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251)
        doc.rect(marginLeft, currentY, usableWidth, 5.2, 'F')
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(55, 65, 81)
      doc.text(safeText(getCatLabel(category), 40), marginLeft + 3, currentY + 3.6)
      doc.text(`${data.count}`, marginLeft + 85, currentY + 3.6)
      doc.text(`${pct.toFixed(1)}%`, marginLeft + 120, currentY + 3.6)
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(data.total), pageWidth - marginRight - 3, currentY + 3.6, { align: 'right' })
      currentY += 5.2
    })

    // Category summary total row
    doc.setFillColor(243, 244, 246)
    doc.rect(marginLeft, currentY, usableWidth, 5.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(31, 41, 55)
    doc.text('TOTAL', marginLeft + 3, currentY + 3.8)
    const totalCatCount = activeCategories.reduce((sum, [, d]) => sum + d.count, 0)
    doc.text(`${totalCatCount}`, marginLeft + 85, currentY + 3.8)
    doc.text('100.0%', marginLeft + 120, currentY + 3.8)
    doc.text(formatCurrency(totalAmount), pageWidth - marginRight - 3, currentY + 3.8, { align: 'right' })
    currentY += 5.5 + 4
  }

  // 4. Detailed Expenses Table
  const drawTableHeader = (y: number) => {
    doc.setFillColor(5, 150, 105) // Emerald
    doc.rect(marginLeft, y, usableWidth, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('Fecha', marginLeft + 3, y + 4.8)
    doc.text('Concepto', marginLeft + 32, y + 4.8)
    doc.text('Categoría', marginLeft + 115, y + 4.8)
    doc.text('Importe', pageWidth - marginRight - 3, y + 4.8, { align: 'right' })
    return y + 7
  }

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom) {
      doc.addPage()
      currentY = 16
      currentY = drawTableHeader(currentY)
    }
  }

  checkPageBreak(20)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(31, 41, 55)
  doc.text('Detalle de Compras', marginLeft, currentY)
  currentY += 4

  currentY = drawTableHeader(currentY)

  sorted.forEach((expense, index) => {
    checkPageBreak(6.5)

    const isEven = index % 2 === 0
    if (!isEven) {
      doc.setFillColor(249, 250, 251)
      doc.rect(marginLeft, currentY, usableWidth, 6.5, 'F')
    }

    // Border line under each row
    doc.setDrawColor(243, 244, 246)
    doc.setLineWidth(0.2)
    doc.line(marginLeft, currentY + 6.5, pageWidth - marginRight, currentY + 6.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(75, 85, 99)
    doc.text(formatDate(expense.timestamp), marginLeft + 3, currentY + 4.3)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(31, 41, 55)
    doc.text(safeText(expense.description, 40), marginLeft + 32, currentY + 4.3)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    const cat = resolveExpenseCategory(expense)
    doc.text(safeText(getCatLabel(cat), 25), marginLeft + 115, currentY + 4.3)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text(formatCurrency(expense.amount || 0), pageWidth - marginRight - 3, currentY + 4.3, { align: 'right' })

    currentY += 6.5
  })

  // Total summary row
  checkPageBreak(10)
  doc.setFillColor(240, 253, 244)
  doc.rect(marginLeft, currentY, usableWidth, 8, 'F')
  doc.setDrawColor(5, 150, 105)
  doc.setLineWidth(0.4)
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(4, 120, 87)
  doc.text('TOTAL:', marginLeft + 115, currentY + 5.3)
  doc.setFontSize(9.5)
  doc.text(formatCurrency(totalAmount), pageWidth - marginRight - 3, currentY + 5.3, { align: 'right' })
  currentY += 10

  // 5. Page Number Footers
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, pageHeight - 12, pageWidth - marginRight, pageHeight - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(156, 163, 175)
    doc.text(appName, marginLeft, pageHeight - 7)

    const pageStr = `Página ${p} de ${totalPages}`
    doc.text(pageStr, pageWidth - marginRight, pageHeight - 7, { align: 'right' })
  }

  return new Uint8Array(doc.output('arraybuffer'))
}
