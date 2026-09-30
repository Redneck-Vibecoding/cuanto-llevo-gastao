import type { ParsedReceipt, ParsedReceiptItem } from '~/utils/ocr'
import { EXPENSE_CATEGORIES, SUPERMARKET_CATEGORIES, type ExpenseCategory } from '~/utils/expenseCategories'

interface OpenAiResponse {
  output_text?: string
  output?: Array<{
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
}

const getOutputText = (response: OpenAiResponse): string | undefined => {
  if (response.output_text?.trim()) return response.output_text

  const text = response.output
    ?.flatMap(item => item.content ?? [])
    .filter(content => content.type === 'output_text')
    .map(content => content.text ?? '')
    .join('')
    .trim()

  return text || undefined
}

const parseResponse = (value: string): ParsedReceipt => {
  const json = value.replace(/^```json\s*|\s*```$/g, '').trim()
  const data = JSON.parse(json) as Record<string, unknown>
  const date = typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date)
    ? data.date
    : undefined
  const time = typeof data.time === 'string' && /^\d{2}:\d{2}$/.test(data.time)
    ? data.time
    : undefined
  const category = typeof data.category === 'string' && EXPENSE_CATEGORIES.includes(data.category as ExpenseCategory)
    ? data.category as ExpenseCategory
    : undefined

  const rawItems = Array.isArray(data.items) ? data.items : []
  const items: ParsedReceiptItem[] = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item, index): ParsedReceiptItem => {
      const name = typeof item.name === 'string' ? item.name.trim() : `Producto ${index + 1}`
      const price = typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0
      const quantity = typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 1
      const unitPrice = typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice)
        ? item.unitPrice
        : (quantity > 1 ? Number((price / quantity).toFixed(2)) : price)

      let itemCategory: ExpenseCategory = 'alimentacion'
      if (typeof item.category === 'string' && EXPENSE_CATEGORIES.includes(item.category as ExpenseCategory)) {
        itemCategory = item.category as ExpenseCategory
      }

      return {
        id: `openai-item-${Date.now()}-${index}`,
        name,
        quantity,
        unitPrice,
        price,
        category: itemCategory
      }
    })
    .filter(item => item.price > 0 || item.name.length > 0)

  const establishment = typeof data.establishment === 'string' ? data.establishment.trim() : undefined
  const description = establishment || (typeof data.description === 'string' ? data.description.trim() || undefined : undefined)

  return {
    amount: typeof data.amount === 'number' && Number.isFinite(data.amount) ? data.amount : undefined,
    date,
    dateTime: date && time ? `${date}T${time}` : undefined,
    description,
    location: typeof data.location === 'string' ? data.location.trim() || undefined : undefined,
    category,
    items: items.length > 0 ? items : undefined
  }
}

/** Sends receipt images to OpenAI for structured supermarket field extraction. */
export async function analyzeReceiptWithOpenAi(images: string[], apiKey: string): Promise<ParsedReceipt> {
  if (!apiKey.trim()) throw new Error('missing_api_key')
  if (images.length === 0) throw new Error('no_images')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `Extract this supermarket/store receipt as JSON only with keys: establishment (merchant or supermarket name, e.g. Mercadona, Carrefour, Lidl, Dia, Alcampo, Consum, Eroski), amount (total number or null), date (local YYYY-MM-DD or null), time (local HH:mm or null), location (address or place, or null), category, and items (array of purchased products where each item has: name, quantity, unitPrice, price, category). Return time as null unless a purchase or transaction time is explicitly printed on the receipt; never invent 00:00 and never infer a time from the filename or PDF metadata. Category must be one of: ${SUPERMARKET_CATEGORIES.join(', ')}, diet, parking, gas, tolls, other, or null when it cannot be determined. Do not guess unreadable values. Return valid JSON only.`
          },
          ...images.map(imageUrl => ({ type: 'input_image', image_url: imageUrl }))
        ]
      }]
    })
  })

  if (!response.ok) throw new Error(`openai_${response.status}`)
  const result = await response.json() as OpenAiResponse
  const outputText = getOutputText(result)
  if (!outputText) throw new Error('empty_openai_response')
  return parseResponse(outputText)
}
