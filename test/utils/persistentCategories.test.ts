import { describe, it, expect, beforeEach } from 'vitest'
import {
  normalizeSupermarketKey,
  normalizeProductKey,
  getPersistentCategory,
  setPersistentCategory,
  removePersistentCategory,
  applyPersistentCategoriesToItems
} from '~/utils/persistentCategories'
import { resetAppDatabaseConnection } from '~/utils/appDatabase'

describe('persistentCategories', () => {
  beforeEach(() => {
    resetAppDatabaseConnection()
  })

  describe('normalizeSupermarketKey', () => {
    it('maps known supermarket chains to standard keys regardless of casing or suffixes', () => {
      expect(normalizeSupermarketKey('Consum S. Coop. V.')).toBe('consum')
      expect(normalizeSupermarketKey('CONSUM')).toBe('consum')
      expect(normalizeSupermarketKey('Charter Supermercados')).toBe('charter')
      expect(normalizeSupermarketKey('Mercadona, S.A.')).toBe('mercadona')
      expect(normalizeSupermarketKey('Lidl Supermercados')).toBe('lidl')
      expect(normalizeSupermarketKey('Carrefour Express')).toBe('carrefour')
    })

    it('falls back to cleaned slug or general for unknown stores', () => {
      expect(normalizeSupermarketKey('Mi Tienda Local')).toBe('mi_tienda_local')
      expect(normalizeSupermarketKey(undefined)).toBe('general')
      expect(normalizeSupermarketKey('')).toBe('general')
    })
  })

  describe('normalizeProductKey', () => {
    it('strips accents, lowercases and normalizes whitespace and punctuation', () => {
      expect(normalizeProductKey('Calabacín')).toBe('calabacin')
      expect(normalizeProductKey('CALABACÍN')).toBe('calabacin')
      expect(normalizeProductKey('  Q.MEZCLA   SEMI  ')).toBe('q mezcla semi')
      expect(normalizeProductKey('')).toBe('')
    })
  })

  describe('setPersistentCategory and getPersistentCategory', () => {
    it('saves a category for a product in a specific supermarket', async () => {
      await setPersistentCategory('Consum', 'Calabacín', 'verduras')

      // Should match for Consum regardless of casing or accents
      const consumCategory = await getPersistentCategory('Consum S. Coop.', 'calabacin')
      expect(consumCategory).toBe('verduras')

      // Should NOT affect another supermarket (isolated per establishment)
      const mercadonaCategory = await getPersistentCategory('Mercadona', 'calabacin')
      expect(mercadonaCategory).toBeNull()
    })

    it('updates an existing persistent category mapping', async () => {
      await setPersistentCategory('Consum', 'Pepino', 'frutas')
      expect(await getPersistentCategory('Consum', 'pepino')).toBe('frutas')

      await setPersistentCategory('Consum', 'Pepino', 'verduras')
      expect(await getPersistentCategory('Consum', 'pepino')).toBe('verduras')
    })

    it('removes a persistent category when requested', async () => {
      await setPersistentCategory('Consum', 'Limon', 'frutas')
      expect(await getPersistentCategory('Consum', 'limon')).toBe('frutas')

      await removePersistentCategory('Consum', 'Limon')
      expect(await getPersistentCategory('Consum', 'limon')).toBeNull()
    })
  })

  describe('applyPersistentCategoriesToItems', () => {
    it('applies persistent categories and flags persistentCategory: true on matching items', async () => {
      await setPersistentCategory('Consum', 'Calabacín', 'verduras')
      await setPersistentCategory('Consum', 'Filete de pollo', 'carnes')

      const rawItems = [
        { name: 'CALABACÍN', price: 1.5, category: 'otros' as const },
        { name: 'Leche entera', price: 0.95, category: 'lacteos_huevos' as const },
        { name: 'Filete de pollo', price: 4.5, category: 'otros' as const }
      ]

      const mapped = await applyPersistentCategoriesToItems(rawItems, 'Consum')

      expect(mapped[0]).toEqual({
        name: 'CALABACÍN',
        price: 1.5,
        category: 'verduras',
        persistentCategory: true
      })

      expect(mapped[1]).toEqual({
        name: 'Leche entera',
        price: 0.95,
        category: 'lacteos_huevos'
      })

      expect(mapped[2]).toEqual({
        name: 'Filete de pollo',
        price: 4.5,
        category: 'carnes',
        persistentCategory: true
      })
    })

    it('does not alter items if no persistent rules exist for that supermarket', async () => {
      await setPersistentCategory('Mercadona', 'Calabacín', 'verduras')

      const items: Array<{ name: string, price: number, category: 'otros', persistentCategory?: boolean }> = [
        { name: 'Calabacín', price: 1.2, category: 'otros' }
      ]
      const mapped = await applyPersistentCategoriesToItems(items, 'Consum')

      expect(mapped[0]?.category).toBe('otros')
      expect(mapped[0]?.persistentCategory).toBeUndefined()
    })
  })
})
