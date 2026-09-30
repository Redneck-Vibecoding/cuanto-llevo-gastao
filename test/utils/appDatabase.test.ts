// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  getExpenses,
  getSettings,
  migrateLocalStorageToIndexedDb
} from '../../app/utils/appDatabase'

describe('appDatabase migration', () => {
  it('moves legacy localStorage data into IndexedDB and removes the old copy', async () => {
    const expense = {
      id: 'expense-1',
      description: 'Mercadona',
      timestamp: '2026-01-01T12:00:00.000Z',
      amount: 45.2,
      category: 'groceries'
    }
    const settings = {
      monthlyBudget: 350,
      googleMapsApiKey: 'AIzaTest'
    }

    localStorage.setItem('expenses', JSON.stringify({ state: { expenses: [expense] } }))
    localStorage.setItem('settings', JSON.stringify(settings))

    await migrateLocalStorageToIndexedDb()

    await expect(getExpenses()).resolves.toEqual([expense])
    await expect(getSettings()).resolves.toMatchObject(settings)
    expect(localStorage.getItem('expenses')).toBeNull()
    expect(localStorage.getItem('settings')).toBeNull()
  })
})
