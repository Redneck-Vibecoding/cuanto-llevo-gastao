import { describe, expect, it } from 'vitest'
import {
  DOMESTIC_CATEGORIES,
  calculateCategoryPercentages,
  categoryCountsTowardBalance,
  resolveExpenseCategory
} from '../../app/utils/expenseCategories'

describe('expense categories', () => {
  it('only diet counts toward the balance', () => {
    expect(categoryCountsTowardBalance('diet')).toBe(true)
    expect(categoryCountsTowardBalance('parking')).toBe(false)
    expect(categoryCountsTowardBalance('gas')).toBe(false)
    expect(categoryCountsTowardBalance('tolls')).toBe(false)
    expect(categoryCountsTowardBalance('other')).toBe(false)
  })

  it('uses the explicit category when present', () => {
    expect(resolveExpenseCategory({ category: 'parking' })).toBe('parking')
    expect(resolveExpenseCategory({ category: 'diet', excludeFromBalance: true })).toBe('diet')
  })

  it('migrates legacy records without a category', () => {
    // No flags → defaults to diet (previous behaviour: everything counted).
    expect(resolveExpenseCategory({})).toBe('diet')
    // Legacy excludeFromBalance → mapped to "other" (still excluded from balance).
    expect(resolveExpenseCategory({ excludeFromBalance: true })).toBe('other')
    expect(resolveExpenseCategory({ excludeFromBalance: false })).toBe('diet')
  })

  it('provides an exhaustive list of typical domestic expense categories', () => {
    const expected = [
      'vivienda',
      'suministros',
      'alimentacion',
      'transporte',
      'telecomunicaciones',
      'hogar',
      'limpieza',
      'salud',
      'cuidado_personal',
      'ropa_calzado',
      'ocio_restauracion',
      'suscripciones',
      'educacion',
      'mascotas',
      'seguros',
      'impuestos',
      'viajes',
      'otros'
    ]
    expect(Array.from(DOMESTIC_CATEGORIES)).toEqual(expected)
    // Categories are mutually exclusive: no duplicates
    const unique = new Set(DOMESTIC_CATEGORIES)
    expect(unique.size).toBe(DOMESTIC_CATEGORIES.length)
  })

  describe('calculateCategoryPercentages', () => {
    it('guarantees percentages sum to exactly 100.0% even with periodic decimals', () => {
      // 3 items of 10.00 € each (each is 33.333...%)
      const entries: [string, { total: number }][] = [
        ['catA', { total: 10 }],
        ['catB', { total: 10 }],
        ['catC', { total: 10 }]
      ]
      const percentages = calculateCategoryPercentages(entries, 30, 1)
      const values = Array.from(percentages.values())
      const sum = Number(values.reduce((acc, v) => acc + v, 0).toFixed(1))

      expect(sum).toBe(100.0)
      expect(values).toEqual([33.4, 33.3, 33.3])
    })

    it('guarantees percentages sum to 100.0% for unequal non-trivial amounts', () => {
      const entries: [string, { total: number }][] = [
        ['alimentacion', { total: 45.2 }],
        ['salud', { total: 14.5 }],
        ['limpieza', { total: 8.9 }]
      ]
      const total = 45.2 + 14.5 + 8.9 // 68.6
      const percentages = calculateCategoryPercentages(entries, total, 1)
      const values = Array.from(percentages.values())
      const sum = Number(values.reduce((acc, v) => acc + v, 0).toFixed(1))

      expect(sum).toBe(100.0)
      expect(percentages.get('alimentacion')).toBe(65.9)
      expect(percentages.get('salud')).toBe(21.1)
      expect(percentages.get('limpieza')).toBe(13.0)
    })

    it('returns 100.0% for a single category', () => {
      const entries: [string, { total: number }][] = [
        ['vivienda', { total: 850 }]
      ]
      const percentages = calculateCategoryPercentages(entries, 850, 1)
      expect(percentages.get('vivienda')).toBe(100.0)
    })

    it('handles empty list and zero amounts gracefully', () => {
      expect(calculateCategoryPercentages([], 0).size).toBe(0)

      const zeroEntries: [string, { total: number }][] = [
        ['vivienda', { total: 0 }],
        ['suministros', { total: 0 }]
      ]
      const result = calculateCategoryPercentages(zeroEntries, 0)
      expect(result.get('vivienda')).toBe(0)
      expect(result.get('suministros')).toBe(0)
    })
  })
})
