import type { ExpenseRecord } from '~/stores/expenses'

const createSampleTicket = (storeName: string, total: number, dateStr: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 320 420">
  <rect width="320" height="420" fill="#fbfbfe" stroke="#cbd5e1" stroke-width="2" rx="10"/>
  <rect x="0" y="0" width="320" height="12" fill="#059669" rx="4"/>
  <text x="160" y="45" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">${storeName.toUpperCase()}</text>
  <text x="160" y="65" font-family="monospace" font-size="11" text-anchor="middle" fill="#64748b">COMPROBANTE DE COMPRA</text>
  <text x="160" y="82" font-family="monospace" font-size="10" text-anchor="middle" fill="#94a3b8">${dateStr}</text>
  <line x1="20" y1="95" x2="300" y2="95" stroke="#94a3b8" stroke-dasharray="4"/>
  <text x="25" y="125" font-family="monospace" font-size="11" fill="#334155">PRODUCTOS VARIOS</text>
  <text x="295" y="125" font-family="monospace" font-size="11" text-anchor="end" fill="#334155">${total.toFixed(2)} €</text>
  <text x="25" y="145" font-family="monospace" font-size="10" fill="#64748b">Base Imponible (IVA incl.)</text>
  <line x1="20" y1="180" x2="300" y2="180" stroke="#94a3b8" stroke-dasharray="4"/>
  <text x="25" y="210" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">TOTAL PAGADO</text>
  <text x="295" y="210" font-family="system-ui, sans-serif" font-size="16" font-weight="bold" text-anchor="end" fill="#059669">${total.toFixed(2)} €</text>
  <text x="25" y="240" font-family="monospace" font-size="10" fill="#64748b">Forma de pago: TARJETA DEBITO</text>
  <text x="25" y="255" font-family="monospace" font-size="10" fill="#64748b">Operación: AUTORIZADA</text>
  <rect x="35" y="290" width="250" height="50" fill="#f1f5f9" rx="6"/>
  <text x="160" y="320" font-family="monospace" font-size="11" text-anchor="middle" fill="#475569">*** GRACIAS POR SU VISITA ***</text>
</svg>`

  if (typeof btoa !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function generateSampleExpenses(referenceDate = new Date()): ExpenseRecord[] {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth() // 0-indexed
  const day = referenceDate.getDate()

  // Helper to create UTC ISO timestamp for given relative day and hour
  const makeDate = (targetYear: number, targetMonth: number, targetDay: number, hour = 11, minute = 30) => {
    const d = new Date(targetYear, targetMonth, targetDay, hour, minute)
    return d.toISOString()
  }

  const list: ExpenseRecord[] = [
    // -------------------------------------------------------------
    // THIS CURRENT MONTH
    // -------------------------------------------------------------
    {
      id: 'mock-curr-1',
      description: 'Compra semanal Mercadona',
      amount: 68.45,
      category: 'alimentacion',
      timestamp: makeDate(year, month, Math.max(1, day - 1), 18, 45),
      location: { label: 'Mercadona - Gran Vía', city: 'Madrid' },
      ticket: createSampleTicket('Mercadona', 68.45, '2026-10-02 18:45'),
      ticketName: 'ticket-mercadona.svg',
      ticketType: 'image/svg+xml',
      items: [
        { id: 'i-1', name: 'Leche entera fresca x6', price: 6.30, quantity: 6, category: 'bebidas' },
        { id: 'i-2', name: 'Plátano de Canarias 1kg', price: 2.15, quantity: 1, category: 'frescos' },
        { id: 'i-3', name: 'Pechuga de pollo fileteada', price: 7.80, quantity: 1, category: 'frescos' },
        { id: 'i-4', name: 'Huevos camperos L docena', price: 2.95, quantity: 1, category: 'frescos' },
        { id: 'i-5', name: 'Aceite de oliva virgen extra 1L', price: 8.50, quantity: 1, category: 'alimentacion' },
        { id: 'i-6', name: 'Arroz redondo 1kg', price: 1.45, quantity: 1, category: 'alimentacion' },
        { id: 'i-7', name: 'Detergente ropa líquido', price: 9.80, quantity: 1, category: 'limpieza' },
        { id: 'i-8', name: 'Papel higiénico 12 rollos', price: 4.50, quantity: 1, category: 'cuidado_personal' },
        { id: 'i-9', name: 'Comida húmeda gato 12 sobres', price: 8.20, quantity: 1, category: 'mascotas' },
        { id: 'i-10', name: 'Café molido natural 250g x2', price: 6.80, quantity: 2, category: 'bebidas' }
      ]
    },
    {
      id: 'mock-curr-2',
      description: 'Frutería y verdura ecológica',
      amount: 19.30,
      category: 'frescos',
      timestamp: makeDate(year, month, Math.max(1, day - 3), 11, 15),
      location: { label: 'Frutería del Barrio' },
      items: [
        { id: 'i-11', name: 'Manzanas Golden 1.5kg', price: 3.45, quantity: 1, category: 'frescos' },
        { id: 'i-12', name: 'Tomate de ensalada 1kg', price: 2.80, quantity: 1, category: 'frescos' },
        { id: 'i-13', name: 'Aguacates bolsa 500g', price: 3.90, quantity: 1, category: 'frescos' },
        { id: 'i-14', name: 'Naranjas de zumo 3kg', price: 4.50, quantity: 1, category: 'frescos' },
        { id: 'i-15', name: 'Espinacas frescas bolsa', price: 1.65, quantity: 1, category: 'frescos' },
        { id: 'i-16', name: 'Zanahorias 1kg', price: 1.00, quantity: 1, category: 'frescos' }
      ]
    },
    {
      id: 'mock-curr-3',
      description: 'Lidl - Ofertas fin de semana',
      amount: 42.10,
      category: 'alimentacion',
      timestamp: makeDate(year, month, Math.max(1, day - 6), 12, 30),
      location: { label: 'Lidl Supermercados' },
      ticket: createSampleTicket('Lidl', 42.10, '2026-09-28 12:30'),
      ticketName: 'recibo-lidl.svg',
      ticketType: 'image/svg+xml',
      items: [
        { id: 'i-17', name: 'Queso Gouda lonchas', price: 2.89, quantity: 1, category: 'alimentacion' },
        { id: 'i-18', name: 'Yogures naturales pack 8', price: 1.95, quantity: 1, category: 'frescos' },
        { id: 'i-19', name: 'Pan integral multicereales', price: 1.79, quantity: 1, category: 'alimentacion' },
        { id: 'i-20', name: 'Salmón fresco 2 lomos', price: 9.90, quantity: 1, category: 'frescos' },
        { id: 'i-21', name: 'Cerveza artesana pack 4', price: 5.60, quantity: 1, category: 'bebidas' },
        { id: 'i-22', name: 'Bolsas de basura 30L', price: 1.85, quantity: 1, category: 'hogar' }
      ]
    },
    {
      id: 'mock-curr-4',
      description: 'Farmacia - Medicinas y vitaminas',
      amount: 24.60,
      category: 'farmacia',
      timestamp: makeDate(year, month, Math.max(1, day - 8), 17, 10),
      location: { label: 'Farmacia Central' },
      items: [
        { id: 'i-23', name: 'Paracetamol 1g', price: 3.20, quantity: 1, category: 'farmacia' },
        { id: 'i-24', name: 'Complejo Vitamina C', price: 9.50, quantity: 1, category: 'farmacia' },
        { id: 'i-25', name: 'Crema hidratante piel seca', price: 11.90, quantity: 1, category: 'cuidado_personal' }
      ]
    },
    {
      id: 'mock-curr-5',
      description: 'Carrefour Express compras urgentes',
      amount: 15.80,
      category: 'alimentacion',
      timestamp: makeDate(year, month, Math.max(1, day - 10), 20, 15),
      location: { label: 'Carrefour Express' },
      items: [
        { id: 'i-26', name: 'Pasta spaghetti 500g', price: 1.35, quantity: 1, category: 'alimentacion' },
        { id: 'i-27', name: 'Salsa pesto genovés', price: 2.65, quantity: 1, category: 'alimentacion' },
        { id: 'i-28', name: 'Queso parmesano rallado', price: 2.80, quantity: 1, category: 'alimentacion' },
        { id: 'i-29', name: 'Tableta chocolate negro 85%', price: 2.10, quantity: 1, category: 'alimentacion' }
      ]
    },

    // -------------------------------------------------------------
    // PREVIOUS MONTH
    // -------------------------------------------------------------
    {
      id: 'mock-prev-1',
      description: 'Mercadona compra mensual despensa',
      amount: 94.20,
      category: 'alimentacion',
      timestamp: makeDate(year, month - 1, 15, 19, 0),
      location: { label: 'Mercadona - Centro' },
      ticket: createSampleTicket('Mercadona', 94.20, '2026-09-15 19:00'),
      ticketName: 'mercadona-septiembre.svg',
      ticketType: 'image/svg+xml',
      items: [
        { id: 'i-30', name: 'Lote legumbres (lentejas, garbanzos)', price: 6.40, category: 'alimentacion' },
        { id: 'i-31', name: 'Pack conservas atún claro x6', price: 7.90, category: 'alimentacion' },
        { id: 'i-32', name: 'Lavavajillas pastillas x40', price: 8.50, category: 'limpieza' },
        { id: 'i-33', name: 'Pienso para perro 10kg', price: 22.00, category: 'mascotas' },
        { id: 'i-34', name: 'Carne picada mixta 1kg', price: 8.90, category: 'frescos' },
        { id: 'i-35', name: 'Agua mineral garrafa 5L x3', price: 4.20, category: 'bebidas' }
      ]
    },
    {
      id: 'mock-prev-2',
      description: 'Día Supermercados productos hogar',
      amount: 31.75,
      category: 'limpieza',
      timestamp: makeDate(year, month - 1, 22, 10, 40),
      location: { label: 'Dia Market' },
      items: [
        { id: 'i-36', name: 'Suavizante concentrado', price: 3.80, category: 'limpieza' },
        { id: 'i-37', name: 'Bayetas microfibra pack 4', price: 2.40, category: 'limpieza' },
        { id: 'i-38', name: 'Limpiacristales con pistola', price: 1.95, category: 'limpieza' },
        { id: 'i-39', name: 'Champú anticaspa', price: 4.60, category: 'cuidado_personal' }
      ]
    },
    {
      id: 'mock-prev-3',
      description: 'Consum - Pescadería y charcutería',
      amount: 52.60,
      category: 'frescos',
      timestamp: makeDate(year, month - 1, 28, 13, 10),
      location: { label: 'Consum Cooperativa' },
      items: [
        { id: 'i-40', name: 'Dorada fresca pieza grande', price: 12.80, category: 'frescos' },
        { id: 'i-41', name: 'Jamón ibérico cebo 150g', price: 9.90, category: 'frescos' },
        { id: 'i-42', name: 'Queso curado oveja cuña', price: 7.50, category: 'frescos' }
      ]
    },

    // -------------------------------------------------------------
    // THIS YEAR - EARLIER MONTHS (Q1 / Q2 / S1)
    // -------------------------------------------------------------
    {
      id: 'mock-s1-1',
      description: 'Alcampo - Compra grande primavera',
      amount: 112.40,
      category: 'alimentacion',
      timestamp: makeDate(year, 4, 18, 17, 30), // May
      location: { label: 'Alcampo Hipermercado' },
      items: [
        { id: 'i-43', name: 'Pack aceite girasol 5L', price: 12.50, category: 'alimentacion' },
        { id: 'i-44', name: 'Lote bebidas refrescantes', price: 14.80, category: 'bebidas' },
        { id: 'i-45', name: 'Surtido helados verano', price: 8.90, category: 'alimentacion' },
        { id: 'i-46', name: 'Arena aglomerante gato 15kg', price: 14.20, category: 'mascotas' }
      ]
    },
    {
      id: 'mock-s1-2',
      description: 'Bonpreu - Productos de proximidad',
      amount: 47.90,
      category: 'frescos',
      timestamp: makeDate(year, 2, 14, 12, 0), // March (Q1, S1)
      location: { label: 'Bonpreu Supermercats' },
      items: [
        { id: 'i-47', name: 'Formatge artesà Garrotxa', price: 8.90, category: 'frescos' },
        { id: 'i-48', name: 'Fruita de temporada', price: 6.50, category: 'frescos' },
        { id: 'i-49', name: 'Embotit tradicional català', price: 7.20, category: 'frescos' }
      ]
    },
    {
      id: 'mock-s1-3',
      description: 'Aldi - Repostería y frutos secos',
      amount: 28.30,
      category: 'alimentacion',
      timestamp: makeDate(year, 1, 25, 16, 20), // February (Q1, S1)
      location: { label: 'Aldi' },
      items: [
        { id: 'i-50', name: 'Nueces peladas bolsa 500g', price: 5.90, category: 'alimentacion' },
        { id: 'i-51', name: 'Almendras tostadas 300g', price: 4.20, category: 'alimentacion' },
        { id: 'i-52', name: 'Harina de trigo fuerza x2', price: 2.40, category: 'alimentacion' }
      ]
    },

    // -------------------------------------------------------------
    // PREVIOUS YEAR (LAST YEAR)
    // -------------------------------------------------------------
    {
      id: 'mock-lastyear-1',
      description: 'Compra especial fin de año Mercadona',
      amount: 145.80,
      category: 'alimentacion',
      timestamp: makeDate(year - 1, 11, 29, 18, 0), // Dec last year
      location: { label: 'Mercadona' },
      ticket: createSampleTicket('Mercadona', 145.80, `${year - 1}-12-29 18:00`),
      ticketName: 'navidad-mercadona.svg',
      ticketType: 'image/svg+xml',
      items: [
        { id: 'i-53', name: 'Langostinos cocidos 1kg', price: 16.50, category: 'frescos' },
        { id: 'i-54', name: 'Cava brut nature reserva x2', price: 14.00, category: 'bebidas' },
        { id: 'i-55', name: 'Turrones surtidos artesanos', price: 18.20, category: 'alimentacion' },
        { id: 'i-56', name: 'Solomillo ibérico pieza', price: 22.90, category: 'frescos' }
      ]
    },
    {
      id: 'mock-lastyear-2',
      description: 'Carrefour - Compra otoño',
      amount: 63.40,
      category: 'alimentacion',
      timestamp: makeDate(year - 1, 9, 12, 11, 30), // Oct last year
      location: { label: 'Carrefour' }
    }
  ]

  return list
}
