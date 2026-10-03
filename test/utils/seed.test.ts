import { describe, it, expect } from 'vitest'
import { generateExpenses } from '../../scripts/seed.js'

describe('generateExpenses seed utility', () => {
  const refDate = new Date(2026, 9, 3) // 3 Oct 2026

  it('generates a rich list of mock expenses', () => {
    const expenses = generateExpenses(refDate)
    expect(expenses.length).toBeGreaterThanOrEqual(10)

    // Check that expenses have id, description, amount, timestamp
    expenses.forEach(e => {
      expect(e.id).toBeDefined()
      expect(e.description).toBeTruthy()
      expect(e.amount).toBeGreaterThan(0)
      expect(new Date(e.timestamp).getTime()).not.toBeNaN()
    })
  })

  it('covers multiple periods: current month, previous month, earlier months and last year', () => {
    const expenses = generateExpenses(refDate)

    const thisMonthExpenses = expenses.filter(e => {
      const d = new Date(e.timestamp)
      return d.getFullYear() === 2026 && d.getMonth() === 9 // Oct
    })
    expect(thisMonthExpenses.length).toBeGreaterThanOrEqual(3)

    const prevMonthExpenses = expenses.filter(e => {
      const d = new Date(e.timestamp)
      return d.getFullYear() === 2026 && d.getMonth() === 8 // Sep
    })
    expect(prevMonthExpenses.length).toBeGreaterThanOrEqual(2)

    const lastYearExpenses = expenses.filter(e => {
      const d = new Date(e.timestamp)
      return d.getFullYear() === 2025
    })
    expect(lastYearExpenses.length).toBeGreaterThanOrEqual(2)
  })

  it('includes item breakdowns and ticket attachments on some expenses', () => {
    const expenses = generateExpenses(refDate)

    const withItems = expenses.filter(e => e.items && e.items.length > 0)
    expect(withItems.length).toBeGreaterThanOrEqual(5)

    const withTickets = expenses.filter(e => Boolean(e.ticket))
    expect(withTickets.length).toBeGreaterThanOrEqual(2)
  })
})
