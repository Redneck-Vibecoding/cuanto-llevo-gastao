import { describe, it, expect } from 'vitest'
import { generateExpensesPdf } from '~/utils/expensePdf'
import type { ExpenseRecord } from '~/stores/expenses'
import type { ExpenseCategory } from '~/utils/expenseCategories'

describe('generateExpensesPdf', () => {
  const sampleExpenses: ExpenseRecord[] = [
    {
      id: '1',
      description: 'Mercadona semanal',
      amount: 45.2,
      category: 'alimentacion',
      timestamp: '2026-03-10T11:30:00.000Z'
    },
    {
      id: '2',
      description: 'Farmacia',
      amount: 14.5,
      category: 'salud',
      timestamp: '2026-03-12T17:00:00.000Z'
    },
    {
      id: '3',
      description: 'Limpieza hogar',
      amount: 8.9,
      category: 'limpieza',
      timestamp: '2026-03-15T09:15:00.000Z'
    }
  ]

  it('generates a non-empty Uint8Array PDF document', () => {
    const bytes = generateExpensesPdf(sampleExpenses, {
      locale: 'es-ES',
      title: 'Informe de Gastos',
      periodLabel: 'Marzo 2026',
      dateRangeText: '01/03/2026 - 31/03/2026',
      categoryLabel: (cat: string) => `Cat: ${cat}`
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)

    // PDF files start with %PDF-
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('handles empty expense list without crashing', () => {
    const bytes = generateExpensesPdf([], {
      locale: 'es-ES',
      periodLabel: 'Sin datos'
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)
    const header = String.fromCharCode(...bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('handles multi-page pagination for many expenses', () => {
    const manyExpenses: ExpenseRecord[] = Array.from({ length: 60 }, (_, i) => ({
      id: `exp-${i}`,
      description: `Compra en supermercado #${i + 1}`,
      amount: 10 + (i % 20),
      category: 'alimentacion',
      timestamp: new Date(2026, 2, 1 + (i % 28)).toISOString()
    }))

    const bytes = generateExpensesPdf(manyExpenses, {
      locale: 'es-ES',
      periodLabel: 'Marzo 2026'
    })

    expect(bytes.length).toBeGreaterThan(500)
  })

  it('excludes zero-amount categories and handles item breakdown with independent categories (carnes, pescados, frutas) without grouping into frescos', () => {
    const expensesWithItems: ExpenseRecord[] = [
      {
        id: 'exp-items-1',
        description: 'Mercadona',
        amount: 35.5,
        category: 'alimentacion',
        timestamp: '2026-03-10T11:00:00.000Z',
        items: [
          { id: 'item-1', name: 'Plátanos de Canarias', price: 3.5, category: 'frutas' },
          { id: 'item-2', name: 'Filetes de ternera', price: 12.0, category: 'carnes' },
          { id: 'item-3', name: 'Merluza fresca', price: 8.0, category: 'pescados' },
          { id: 'item-4', name: 'Leche entera', price: 4.0, category: 'bebidas' },
          { id: 'item-5', name: 'Detergente ropa', price: 8.0, category: 'limpieza' }
        ]
      }
    ]

    const recordedCategories: string[] = []
    const bytes = generateExpensesPdf(expensesWithItems, {
      locale: 'es-ES',
      periodLabel: 'Marzo 2026',
      categoryLabel: (c: string) => {
        recordedCategories.push(c)
        return `Categoría: ${c}`
      }
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(500)
    expect(recordedCategories).toContain('carnes')
    expect(recordedCategories).toContain('pescados')
    expect(recordedCategories).toContain('frutas')
    expect(recordedCategories).toContain('bebidas')
    expect(recordedCategories).toContain('limpieza')
    expect(recordedCategories).not.toContain('frescos')
  })

  it('normalizes singular aliases (carne, pescado, fruta, verdura) to independent plural categories and not frescos', () => {
    const expensesWithAliases: ExpenseRecord[] = [
      {
        id: 'exp-items-2',
        description: 'Consum',
        amount: 25.0,
        category: 'alimentacion',
        timestamp: '2026-03-11T12:00:00.000Z',
        items: [
          { id: 'item-a', name: 'Carne picada', price: 10.0, category: 'carne' as unknown as ExpenseCategory },
          { id: 'item-b', name: 'Pescado blanco', price: 10.0, category: 'pescado' as unknown as ExpenseCategory },
          { id: 'item-c', name: 'Fruta variada', price: 5.0, category: 'fruta' as unknown as ExpenseCategory }
        ]
      }
    ]

    const recordedCategories: string[] = []
    const bytes = generateExpensesPdf(expensesWithAliases, {
      locale: 'es-ES',
      categoryLabel: (c: string) => {
        recordedCategories.push(c)
        return `Cat: ${c}`
      }
    })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(recordedCategories).toContain('carnes')
    expect(recordedCategories).toContain('pescados')
    expect(recordedCategories).toContain('frutas')
    expect(recordedCategories).not.toContain('frescos')
  })
})

