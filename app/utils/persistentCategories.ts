import { getPersistentCategoryMappings, setPersistentCategoryMappings } from '~/utils/appDatabase'
import type { ExpenseCategory } from '~/utils/expenseCategories'
import { stripAccents } from '~/utils/ocr'

export type PersistentCategoryStore = Record<string, Record<string, ExpenseCategory>>

/**
 * Normalizes a supermarket or establishment name into a canonical key.
 * Normalizes known supermarket chains (Mercadona, Consum, Charter, Carrefour, Lidl, Dia, Alcampo, Aldi, Eroski, etc.)
 */
export function normalizeSupermarketKey(establishment?: string): string {
  if (!establishment) return 'general'
  const norm = stripAccents(establishment.toLowerCase().trim())

  if (/\bmercadona\b/.test(norm)) return 'mercadona'
  if (/\bconsum\b/.test(norm)) return 'consum'
  if (/\bcharter\b/.test(norm)) return 'charter'
  if (/\bcarrefour\b/.test(norm)) return 'carrefour'
  if (/\blidl\b/.test(norm)) return 'lidl'
  if (/\b(supermercados?\s+dia|dia\s+retail|^dia$)\b/.test(norm)) return 'dia'
  if (/\balcampo\b/.test(norm)) return 'alcampo'
  if (/\baldi\b/.test(norm)) return 'aldi'
  if (/\beroski\b/.test(norm)) return 'eroski'
  if (/\bahorramas\b/.test(norm)) return 'ahorramas'
  if (/\b(bonpreu|esclat)\b/.test(norm)) return 'bonpreu'
  if (/\bhipercor\b/.test(norm)) return 'hipercor'
  if (/\bel corte ingles\b/.test(norm)) return 'el_corte_ingles'
  if (/\bcondis\b/.test(norm)) return 'condis'
  if (/\bspar\b/.test(norm)) return 'spar'
  if (/\bcaprabo\b/.test(norm)) return 'caprabo'
  if (/\bcostco\b/.test(norm)) return 'costco'
  if (/\bmakro\b/.test(norm)) return 'makro'

  const clean = norm.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return clean || 'general'
}

/**
 * Normalizes a product name into a canonical key for matching.
 */
export function normalizeProductKey(productName?: string): string {
  if (!productName) return ''
  return stripAccents(productName.toLowerCase())
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retrieves the persistent category for a product in a given supermarket.
 */
export async function getPersistentCategory(
  establishment: string | undefined,
  productName: string
): Promise<ExpenseCategory | null> {
  const storeKey = normalizeSupermarketKey(establishment)
  const productKey = normalizeProductKey(productName)
  if (!productKey) return null

  try {
    const mappings = (await getPersistentCategoryMappings()) || {}
    const storeMappings = mappings[storeKey]
    if (storeMappings && storeMappings[productKey]) {
      return storeMappings[productKey]
    }
  } catch (error) {
    console.error('Failed to get persistent category', error)
  }

  return null
}

/**
 * Sets or updates a persistent category for a product in a given supermarket.
 */
export async function setPersistentCategory(
  establishment: string | undefined,
  productName: string,
  category: ExpenseCategory
): Promise<void> {
  const storeKey = normalizeSupermarketKey(establishment)
  const productKey = normalizeProductKey(productName)
  if (!productKey) return

  try {
    const mappings = (await getPersistentCategoryMappings()) || {}
    if (!mappings[storeKey]) {
      mappings[storeKey] = {}
    }
    mappings[storeKey][productKey] = category
    await setPersistentCategoryMappings(mappings)
  } catch (error) {
    console.error('Failed to set persistent category', error)
  }
}

/**
 * Removes a persistent category for a product in a given supermarket.
 */
export async function removePersistentCategory(
  establishment: string | undefined,
  productName: string
): Promise<void> {
  const storeKey = normalizeSupermarketKey(establishment)
  const productKey = normalizeProductKey(productName)
  if (!productKey) return

  try {
    const mappings = (await getPersistentCategoryMappings()) || {}
    if (mappings[storeKey] && productKey in mappings[storeKey]) {
      const { [productKey]: _removedProduct, ...restProducts } = mappings[storeKey]
      if (Object.keys(restProducts).length === 0) {
        const { [storeKey]: _removedStore, ...restStores } = mappings
        await setPersistentCategoryMappings(restStores)
      } else {
        mappings[storeKey] = restProducts
        await setPersistentCategoryMappings(mappings)
      }
    }
  } catch (error) {
    console.error('Failed to remove persistent category', error)
  }
}

/**
 * Returns all persistent category mappings for a given supermarket.
 */
export async function getPersistentCategoryMappingsForStore(
  establishment: string | undefined
): Promise<Record<string, ExpenseCategory>> {
  const storeKey = normalizeSupermarketKey(establishment)
  try {
    const mappings = (await getPersistentCategoryMappings()) || {}
    return mappings[storeKey] || {}
  } catch (error) {
    console.error('Failed to get persistent category mappings for store', error)
    return {}
  }
}

/**
 * Applies persistent category overrides to a list of items for the given establishment.
 * Any item with a stored persistent category is assigned that category and has `persistentCategory: true`.
 */
export async function applyPersistentCategoriesToItems<T extends { name: string, category?: ExpenseCategory, persistentCategory?: boolean }>(
  items: T[],
  establishment?: string
): Promise<T[]> {
  if (!items || items.length === 0) return items

  const storeMappings = await getPersistentCategoryMappingsForStore(establishment)
  if (Object.keys(storeMappings).length === 0) return items

  return items.map(item => {
    const productKey = normalizeProductKey(item.name)
    if (productKey && storeMappings[productKey]) {
      return {
        ...item,
        category: storeMappings[productKey],
        persistentCategory: true
      }
    }
    return item
  })
}
