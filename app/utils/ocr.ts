// Client-side OCR for receipts/tickets. Runs entirely in the browser with
// tesseract.js (no backend, keeps the app's privacy model) and extracts the
// fields the expense form needs: supermarket/establishment, amount, date, time,
// and product breakdown with categories.

import type { ExpenseCategory } from '~/utils/expenseCategories'

const OCR_LANGS = 'spa+eng'

export interface ParsedReceiptItem {
  id?: string
  name: string
  quantity?: number
  unitPrice?: number
  price: number
  category?: ExpenseCategory
}

export interface ParsedReceipt {
  amount?: number
  date?: string
  dateTime?: string
  description?: string
  location?: string
  category?: ExpenseCategory
  items?: ParsedReceiptItem[]
}

const KNOWN_SUPERMARKETS = [
  { name: 'Mercadona', pattern: /\bmercadona\b/i },
  { name: 'Carrefour', pattern: /\bcarrefour\b/i },
  { name: 'Lidl', pattern: /\blidl\b/i },
  { name: 'Dia', pattern: /\b(supermercados?\s+dia|supermercado\s+dia|dia\s+retail|tiendas?\s+dia|^dia$)\b/i },
  { name: 'Alcampo', pattern: /\balcampo\b/i },
  { name: 'Consum', pattern: /\bconsum\b/i },
  { name: 'Eroski', pattern: /\beroski\b/i },
  { name: 'Aldi', pattern: /\baldi\b/i },
  { name: 'Ahorramas', pattern: /\bahorramas\b/i },
  { name: 'Bonpreu', pattern: /\b(bonpreu|esclat)\b/i },
  { name: 'Hipercor', pattern: /\bhipercor\b/i },
  { name: 'El Corte Inglés', pattern: /\bel corte ingl[eé]s\b/i },
  { name: 'Condis', pattern: /\bcondis\b/i },
  { name: 'Spar', pattern: /\bspar\b/i },
  { name: 'Caprabo', pattern: /\bcaprabo\b/i },
  { name: 'Costco', pattern: /\bcostco\b/i },
  { name: 'Makro', pattern: /\bmakro\b/i },
  { name: 'Farmacia', pattern: /\bfarmacia\b/i }
]

export const stripAccents = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export function inferCategoryFromItemName(name: string): ExpenseCategory {
  const norm = stripAccents(name.toLowerCase())

  if (/\b(limpieza|lejia|detergente|lavavajillas|fregasuelos|bayeta|estropajo|suavizante|fregona|limpiacristales|insecticida|antical|pastillas lavavajillas|bolsas basura)\b/.test(norm)) {
    return 'limpieza'
  }
  if (/\b(farmacia|paracetamol|ibuprofeno|gasas|alcohol|jarabe|aposito|tirita|medicamento|venda|termometro|aspirina|prospecto|suero)\b/.test(norm)) {
    return 'farmacia'
  }
  if (/\b(champu|gel|desodorante|dentifrico|pasta dental|cepillo|colonia|afeitado|higiene|toallitas|tampon|compresa|jabon|crema hidratante|cuidado)\b/.test(norm)) {
    return 'cuidado_personal'
  }
  if (/\b(cerveza|vino|agua|refresco|coca cola|fanta|zumo|tonica|ginebra|ron|whisky|aquarius|monster|red bull|sidra|bebida|licor)\b/.test(norm)) {
    return 'bebidas'
  }
  if (/\b(perro|gato|pienso|mascota|snack perro|comida gato|arena gato|canino|felino)\b/.test(norm)) {
    return 'mascotas'
  }
  if (/\b(papel cocina|papel higienico|bombilla|pila|cubo|menaje|vela|papel aluminio|film|bateria|sarten|plato)\b/.test(norm)) {
    return 'hogar'
  }
  if (/\b(fruta|platano|manzana|naranja|fresa|tomate|lechuga|carne|pollo|ternera|cerdo|pescado|salmon|merluza|pescaderia|carniceria|verdura|zanahoria|cebolla|patata|pepino|aguacate|solomillo|pechuga)\b/.test(norm)) {
    return 'frescos'
  }
  return 'alimentacion'
}

// Recognise the combined text of one or more images, reusing a single worker.
export async function recognizeImages(
  images: (string | Blob)[],
  onProgress?: (progress: number) => void
): Promise<string> {
  if (images.length === 0) return ''
  const { createWorker } = await import('tesseract.js')
  let pageIndex = 0
  const worker = await createWorker(OCR_LANGS, 1, {
    logger: onProgress
      ? (m: { status: string, progress: number }) => {
          if (m.status === 'recognizing text') {
            onProgress((pageIndex + m.progress) / images.length)
          }
        }
      : undefined
  })
  try {
    const texts: string[] = []
    for (let i = 0; i < images.length; i++) {
      pageIndex = i
      const { data } = await worker.recognize(images[i]!)
      texts.push(data.text || '')
    }
    return texts.join('\n')
  } finally {
    await worker.terminate()
  }
}

export async function recognizeText(
  image: string | Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  return recognizeImages([image], onProgress)
}

const AMOUNT_RE = /\d{1,3}(?:[.,\s]\d{3})*[.,]\d{2}(?!\d)|\d+[.,]\d{2}(?!\d)/g

const TOTAL_KEYWORDS = [
  'total a pagar', 'importe total', 'import total', 'total importe',
  'a pagar', 'total euro', 'total eur', 'total factura', 'total', 'import', 'importe', 'suma'
]

const parseAmountToken = (token: string): number | undefined => {
  const cleaned = token.replace(/\s/g, '')
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  const decimalSep = lastDot > lastComma ? '.' : ','
  const thousandSep = decimalSep === '.' ? ',' : '.'
  const normalized = cleaned
    .split(thousandSep).join('')
    .replace(decimalSep, '.')
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : undefined
}

const extractAmount = (lines: string[]): number | undefined => {
  const candidates: { value: number, keyword: boolean }[] = []
  for (const line of lines) {
    const normalized = stripAccents(line.toLowerCase())
    const hasKeyword = TOTAL_KEYWORDS.some(k => normalized.includes(k))
    const matches = line.match(AMOUNT_RE)
    if (!matches) continue
    for (const token of matches) {
      const value = parseAmountToken(token)
      if (value !== undefined && value > 0) candidates.push({ value, keyword: hasKeyword })
    }
  }
  if (candidates.length === 0) return undefined
  const keyworded = candidates.filter(c => c.keyword)
  const pool = keyworded.length ? keyworded : candidates
  return pool.reduce((max, c) => (c.value > max ? c.value : max), 0)
}

const hasAmount = (line: string) => Boolean(line.match(AMOUNT_RE))

const pad2 = (n: number) => String(n).padStart(2, '0')

const parseDateParts = (year: number, month: number, day: number) => {
  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  return { year, month, day }
}

const findNearestTime = (text: string, dateIndex: number, dateLength: number): RegExpMatchArray | null => {
  const lineStart = text.lastIndexOf('\n', dateIndex) + 1
  const nextBreak = text.indexOf('\n', dateIndex + dateLength)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  const sameLine = text.slice(lineStart, lineEnd).match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/)
  if (sameLine) return sameLine

  const windowStart = Math.max(0, dateIndex - 80)
  const windowEnd = Math.min(text.length, dateIndex + dateLength + 80)
  const windowText = text.slice(windowStart, windowEnd)
  const matches = Array.from(windowText.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/g))
  const afterDate = matches.find(match => match.index != null && windowStart + match.index >= dateIndex + dateLength)
  if (afterDate) return afterDate
  return matches.reduce<RegExpMatchArray | null>((nearest, current) => {
    if (current.index == null) return nearest
    if (!nearest || nearest.index == null) return current
    const absoluteCurrent = windowStart + current.index
    const absoluteNearest = windowStart + nearest.index
    const currentDistance = Math.min(
      Math.abs(absoluteCurrent - dateIndex),
      Math.abs(absoluteCurrent - (dateIndex + dateLength))
    )
    const nearestDistance = Math.min(
      Math.abs(absoluteNearest - dateIndex),
      Math.abs(absoluteNearest - (dateIndex + dateLength))
    )
    return currentDistance < nearestDistance ? current : nearest
  }, null)
}

const extractDateTime = (text: string): string | undefined => {
  const patterns = [
    { re: /\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/, order: 'ymd' },
    { re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/, order: 'dmy' }
  ] as const

  for (const pattern of patterns) {
    const match = text.match(pattern.re)
    if (!match || match.index == null) continue

    const parts = pattern.order === 'ymd'
      ? parseDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
      : parseDateParts(Number(match[3]), Number(match[2]), Number(match[1]))
    if (!parts) continue

    const time = findNearestTime(text, match.index, match[0].length)
    const hh = time ? pad2(Number(time[1])) : '12'
    const mm = time ? pad2(Number(time[2])) : '00'

    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${hh}:${mm}`
  }

  return undefined
}

// A receipt header line is usually the merchant/supermarket name.
const extractDescription = (lines: string[], _rawText: string): string | undefined => {
  // First check top 4 lines for known supermarket chains
  for (const line of lines.slice(0, 4)) {
    for (const market of KNOWN_SUPERMARKETS) {
      if (market.pattern.test(line)) {
        return market.name
      }
    }
  }

  // Fallback to top text line
  for (const line of lines.slice(0, 8)) {
    const letters = line.replace(/[^a-zA-ZÀ-ſ]/g, '')
    if (letters.length < 3) continue
    if (/\d{1,2}[/.-]\d{1,2}/.test(line)) continue
    if (hasAmount(line)) continue
    const trimmed = line.trim()
    if (trimmed.length >= 3 && trimmed.length <= 60) return trimmed
  }
  return undefined
}

const LOCATION_KEYWORDS = [
  'c/', 'calle', 'carrer', 'avenida', 'avinguda', 'avda', 'av.', 'plaza', 'plaça',
  'paseo', 'passeig', 'ronda', 'carretera', 'ctra', 'poligono', 'polígono', 'local'
]

const looksLikeReceiptMetadata = (line: string) => {
  const normalized = stripAccents(line.toLowerCase())
  return normalized.includes('fecha')
    || normalized.includes('date')
    || normalized.includes('hora')
    || normalized.includes('time')
    || normalized.includes('cif')
    || normalized.includes('nif')
    || normalized.includes('factura')
    || normalized.includes('ticket')
    || TOTAL_KEYWORDS.some(keyword => normalized.includes(keyword))
}

const extractLocation = (lines: string[]): string | undefined => {
  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim()
    if (trimmed.length < 4 || trimmed.length > 90) continue
    if (looksLikeReceiptMetadata(trimmed)) continue
    if (hasAmount(trimmed)) continue

    const normalized = stripAccents(trimmed.toLowerCase())
    const hasAddressKeyword = LOCATION_KEYWORDS.some(keyword => normalized.includes(stripAccents(keyword)))
    const hasPostalCode = /\b\d{5}\b/.test(trimmed)
    const hasAddressNumber = /\b\d{1,4}\b/.test(trimmed) && /[a-zA-ZÀ-ſ]/.test(trimmed)
    if (hasAddressKeyword || hasPostalCode || hasAddressNumber) return trimmed
  }
  return undefined
}

const IGNORE_ITEM_KEYWORDS = [
  'total', 'subtotal', 'iva', 'base', 'cif', 'nif', 'tarjeta', 'visa', 'mastercard',
  'cambio', 'entregado', 'importe', 'factura', 'simplificada', 'ticket', 'fecha',
  'hora', 'telefono', 'tel.', 'gracias', 'atendido', 'caja', 'operador', 'articulos',
  'descuento', 'promocion', 'puntos', 'tarifa', 'su cambio', 'efectivo'
]

export function extractItemsFromReceiptLines(lines: string[]): ParsedReceiptItem[] {
  const items: ParsedReceiptItem[] = []

  let totalLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    if (!rawLine) continue
    const norm = stripAccents(rawLine.toLowerCase())
    if (TOTAL_KEYWORDS.some(k => norm.includes(k))) {
      totalLineIndex = i
      break
    }
  }

  const candidateLines = totalLineIndex > 0 ? lines.slice(0, totalLineIndex) : lines

  for (let i = 0; i < candidateLines.length; i++) {
    const rawLine = candidateLines[i]
    if (!rawLine) continue
    const line = rawLine.trim()
    if (line.length < 3) continue
    const norm = stripAccents(line.toLowerCase())
    if (IGNORE_ITEM_KEYWORDS.some(k => norm.includes(k))) continue
    if (looksLikeReceiptMetadata(line)) continue
    if (LOCATION_KEYWORDS.some(k => norm.includes(stripAccents(k)))) continue

    const amounts = Array.from(line.matchAll(AMOUNT_RE))
    if (amounts.length > 0) {
      const lastAmountMatch = amounts[amounts.length - 1]
      if (!lastAmountMatch || lastAmountMatch.index === undefined) continue
      const priceStr = lastAmountMatch[0]
      const price = parseAmountToken(priceStr)
      if (price !== undefined && price > 0 && price < 400) {
        const namePart = line.slice(0, lastAmountMatch.index).trim()
        const cleanName = namePart.replace(/^[\d\s*x.-]+/, '').trim()
        if (cleanName.length >= 2 && !/^\d+$/.test(cleanName)) {
          let qty = 1
          const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)\s*(?:x|\*)\s*/i)
          if (qtyMatch && qtyMatch[1]) {
            qty = parseFloat(qtyMatch[1].replace(',', '.')) || 1
          }

          items.push({
            id: `item-${Date.now()}-${items.length}`,
            name: cleanName,
            quantity: qty,
            price: price,
            unitPrice: qty > 1 ? Number((price / qty).toFixed(2)) : price,
            category: inferCategoryFromItemName(cleanName)
          })
        }
      }
    }
  }

  return items
}

// Parse OCR text into the fields the expense form can prefill.
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  const items = extractItemsFromReceiptLines(lines)
  const amount = extractAmount(lines)

  return {
    amount: amount || (items.length > 0 ? Number(items.reduce((s, it) => s + it.price, 0).toFixed(2)) : undefined),
    dateTime: extractDateTime(text),
    description: extractDescription(lines, text),
    location: extractLocation(lines),
    items: items.length > 0 ? items : undefined
  }
}
