import { describe, it, expect } from 'vitest'
import {
  calculatePeriodDateRange,
  filterExpensesByPeriod,
  formatPeriodDateLabel,
  formatPeriodSlug,
  getExportFilename
} from '~/utils/expensePeriods'
import type { ExpenseRecord } from '~/stores/expenses'

describe('expensePeriods utility', () => {
  const refDate = new Date(2026, 2, 15) // 15 March 2026 (Month 2 in JS = March, Q1, S1)

  it('calculates current_month correctly', () => {
    const range = calculatePeriodDateRange('current_month', undefined, refDate)
    expect(range.start?.getFullYear()).toBe(2026)
    expect(range.start?.getMonth()).toBe(2) // March
    expect(range.start?.getDate()).toBe(1)
    expect(range.end?.getMonth()).toBe(2)
    expect(range.end?.getDate()).toBe(31)
    expect(range.filenameDateRange).toBe('2026-03-01_2026-03-31')
  })

  it('calculates previous_month correctly', () => {
    const range = calculatePeriodDateRange('previous_month', undefined, refDate)
    expect(range.start?.getMonth()).toBe(1) // February
    expect(range.start?.getDate()).toBe(1)
    expect(range.end?.getMonth()).toBe(1)
    expect(range.end?.getDate()).toBe(28) // 2026 is not a leap year
  })

  it('calculates current_quarter correctly', () => {
    const range = calculatePeriodDateRange('current_quarter', undefined, refDate)
    expect(range.start?.getMonth()).toBe(0) // January
    expect(range.start?.getDate()).toBe(1)
    expect(range.end?.getMonth()).toBe(2) // March
    expect(range.end?.getDate()).toBe(31)
  })

  it('calculates current_semester correctly', () => {
    const range = calculatePeriodDateRange('current_semester', undefined, refDate)
    expect(range.start?.getMonth()).toBe(0) // January
    expect(range.start?.getDate()).toBe(1)
    expect(range.end?.getMonth()).toBe(5) // June
    expect(range.end?.getDate()).toBe(30)
    expect(range.filenameDateRange).toBe('2026-01-01_2026-06-30')
  })

  it('calculates previous_semester correctly for S1', () => {
    const range = calculatePeriodDateRange('previous_semester', undefined, refDate)
    // For March 2026 (S1), previous semester was 2025 S2 (Jul - Dec)
    expect(range.start?.getFullYear()).toBe(2025)
    expect(range.start?.getMonth()).toBe(6) // July
    expect(range.end?.getFullYear()).toBe(2025)
    expect(range.end?.getMonth()).toBe(11) // December
    expect(range.end?.getDate()).toBe(31)
  })

  it('calculates current_year correctly', () => {
    const range = calculatePeriodDateRange('current_year', undefined, refDate)
    expect(range.start?.getFullYear()).toBe(2026)
    expect(range.start?.getMonth()).toBe(0)
    expect(range.start?.getDate()).toBe(1)
    expect(range.end?.getFullYear()).toBe(2026)
    expect(range.end?.getMonth()).toBe(11)
    expect(range.end?.getDate()).toBe(31)
    expect(range.filenameDateRange).toBe('2026-01-01_2026-12-31')
  })

  it('calculates previous_year correctly', () => {
    const range = calculatePeriodDateRange('previous_year', undefined, refDate)
    expect(range.start?.getFullYear()).toBe(2025)
    expect(range.filenameDateRange).toBe('2025-01-01_2025-12-31')
  })

  it('calculates all period correctly', () => {
    const range = calculatePeriodDateRange('all', undefined, refDate)
    expect(range.start).toBeNull()
    expect(range.end).toBeNull()
    expect(range.filenameDateRange).toBe('historico')
  })

  it('calculates custom range correctly', () => {
    const range = calculatePeriodDateRange('custom', { start: '2026-02-10', end: '2026-03-05' }, refDate)
    expect(range.start?.getFullYear()).toBe(2026)
    expect(range.start?.getMonth()).toBe(1)
    expect(range.start?.getDate()).toBe(10)
    expect(range.end?.getFullYear()).toBe(2026)
    expect(range.end?.getMonth()).toBe(2)
    expect(range.end?.getDate()).toBe(5)
    expect(range.filenameDateRange).toBe('2026-02-10_2026-03-05')
  })

  it('filters expenses correctly by period', () => {
    const expenses: ExpenseRecord[] = [
      { id: '1', description: 'Feb expense', amount: 10, timestamp: '2026-02-15T12:00:00.000Z' },
      { id: '2', description: 'Mar expense', amount: 20, timestamp: '2026-03-10T12:00:00.000Z' },
      { id: '3', description: 'Apr expense', amount: 30, timestamp: '2026-04-05T12:00:00.000Z' }
    ]

    const result = filterExpensesByPeriod(expenses, 'current_month', undefined, refDate)
    expect(result.filtered).toHaveLength(1)
    expect(result.filtered[0]!.id).toBe('2')

    const semesterResult = filterExpensesByPeriod(expenses, 'current_semester', undefined, refDate)
    expect(semesterResult.filtered).toHaveLength(3) // Feb, Mar, Apr all in S1 (Jan-Jun)
  })

  it('formats period date label', () => {
    const range = calculatePeriodDateRange('current_month', undefined, refDate)
    const label = formatPeriodDateLabel(range, 'es-ES')
    expect(label).toContain('2026')
  })

  it('formats period slug and export filename with period name', () => {
    const monthRange = calculatePeriodDateRange('current_month', undefined, refDate)
    const slug = formatPeriodSlug('current_month', monthRange, 'es')
    expect(slug).toBe('marzo-2026')

    const pdfName = getExportFilename('current_month', monthRange, 'pdf', 'es')
    expect(pdfName).toBe('informe-gastos-marzo-2026.pdf')

    const csvName = getExportFilename('current_month', monthRange, 'csv', 'es')
    expect(csvName).toBe('informe-gastos-marzo-2026.csv')

    const zipName = getExportFilename('current_month', monthRange, 'zip', 'es')
    expect(zipName).toBe('informe-gastos-marzo-2026.zip')

    const caName = getExportFilename('current_month', monthRange, 'pdf', 'ca')
    expect(caName).toContain('informe-despeses-')
    expect(caName).toContain('2026.pdf')

    const yearRange = calculatePeriodDateRange('current_year', undefined, refDate)
    expect(getExportFilename('current_year', yearRange, 'pdf', 'es')).toBe('informe-gastos-ano-2026.pdf')

    const customRange = calculatePeriodDateRange('custom', { start: '2026-02-10', end: '2026-03-05' }, refDate)
    expect(getExportFilename('custom', customRange, 'csv', 'es')).toBe('informe-gastos-2026-02-10_a_2026-03-05.csv')
  })
})

