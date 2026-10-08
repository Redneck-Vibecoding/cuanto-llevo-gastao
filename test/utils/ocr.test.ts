import { describe, it, expect } from 'vitest'
import { parseReceiptText, inferCategoryFromItemName } from '~/utils/ocr'

describe('parseReceiptText', () => {
  it('extracts the total amount, date and merchant from a Spanish receipt', () => {
    const text = [
      'RESTAURANTE EL RINCON',
      'C/ Mayor 12, Madrid',
      'Fecha: 14/03/2026 21:35',
      'Menu del dia       12,50',
      'Cafe                1,20',
      'TOTAL A PAGAR      13,70'
    ].join('\n')

    const parsed = parseReceiptText(text)
    expect(parsed.amount).toBe(13.7)
    expect(parsed.dateTime).toBe('2026-03-14T21:35')
    expect(parsed.description).toBe('RESTAURANTE EL RINCON')
    expect(parsed.location).toBe('C/ Mayor 12, Madrid')
  })

  it('prefers a "total" line over larger non-total numbers', () => {
    const text = [
      'GASOLINERA',
      'Litros 45,00',
      'Precio/L 1,659',
      'TOTAL 74,66'
    ].join('\n')

    const parsed = parseReceiptText(text)
    expect(parsed.amount).toBe(74.66)
  })

  it('handles thousands separators and dot decimals', () => {
    const text = 'Importe total: 1.234,56'
    expect(parseReceiptText(text).amount).toBe(1234.56)

    const english = 'TOTAL 1,234.56'
    expect(parseReceiptText(english).amount).toBe(1234.56)
  })

  it('parses ISO and two-digit-year dates and defaults the time to midday', () => {
    expect(parseReceiptText('Date 2026-01-09').dateTime).toBe('2026-01-09T12:00')
    expect(parseReceiptText('05/02/26').dateTime).toBe('2026-02-05T12:00')
  })

  it('uses the time nearest to the receipt date instead of unrelated opening hours', () => {
    const text = [
      'HORARIO 08:00-23:00',
      'CAFETERIA',
      'Fecha: 07/04/2026',
      'Hora: 14:25',
      'TOTAL 9,50'
    ].join('\n')

    expect(parseReceiptText(text).dateTime).toBe('2026-04-07T14:25')
  })

  it('extracts a likely location from address-like receipt lines', () => {
    const text = [
      'PARKING CENTRO',
      'Avenida Diagonal 640',
      '08017 Barcelona',
      'TOTAL 4,80'
    ].join('\n')

    expect(parseReceiptText(text).location).toBe('Avenida Diagonal 640')
  })

  it('returns no fields when nothing is recognisable', () => {
    const parsed = parseReceiptText('!!!  ???  ---')
    expect(parsed.amount).toBeUndefined()
    expect(parsed.dateTime).toBeUndefined()
    expect(parsed.description).toBeUndefined()
  })

  it('falls back to the largest value when no total keyword is present', () => {
    const text = ['Producto A 3,00', 'Producto B 9,90', 'Producto C 1,10'].join('\n')
    expect(parseReceiptText(text).amount).toBe(9.9)
  })

  it('selects IMPORTE A ABONAR over pre-discount total in Consum and Charter receipts', () => {
    const text = [
      'CONSUM S. COOP.',
      'C/ Colon 15, Valencia',
      'Fecha: 08/10/2026 10:15',
      'Leche entera     1,20',
      'Aceite oliva     8,50',
      'TOTAL COMPRA    35,40',
      'DTO. CHEQUE-CRECE -5,00',
      'IMPORTE A ABONAR 30,40',
      'TARJETA          30,40'
    ].join('\n')

    const parsed = parseReceiptText(text)
    expect(parsed.description).toBe('Consum')
    expect(parsed.amount).toBe(30.40)
  })

  it('recognizes Charter supermarket and extracts net amount to abonar', () => {
    const text = [
      'CHARTER SUPERMERCADOS',
      'Av. del Port 45, Valencia',
      '08/10/2026 12:45',
      'Pan barra        0,75',
      'Queso tierno     3,25',
      'TOTAL ARTICULOS  4,00',
      'TOTAL A ABONAR   3,50'
    ].join('\n')

    const parsed = parseReceiptText(text)
    expect(parsed.description).toBe('Charter')
    expect(parsed.amount).toBe(3.50)
  })
})

describe('inferCategoryFromItemName supermarket segmentation', () => {
  it('correctly classifies items into mutually exclusive supermarket categories', () => {
    // Frescos distinctions
    expect(inferCategoryFromItemName('Pechuga de pollo 500g')).toBe('carnes')
    expect(inferCategoryFromItemName('Filetes de ternera')).toBe('carnes')
    expect(inferCategoryFromItemName('Salmon fresco lomos')).toBe('pescados')
    expect(inferCategoryFromItemName('Merluza fresca')).toBe('pescados')
    expect(inferCategoryFromItemName('Jamon serrano lonchas')).toBe('charcuteria')
    expect(inferCategoryFromItemName('Chorizo iberico bellota')).toBe('charcuteria')
    expect(inferCategoryFromItemName('Salchichas frankfurt')).toBe('charcuteria')
    expect(inferCategoryFromItemName('Tomate ensalada 1kg')).toBe('verduras')
    expect(inferCategoryFromItemName('Lechuga iceberg')).toBe('verduras')
    expect(inferCategoryFromItemName('Platanos de Canarias')).toBe('frutas')
    expect(inferCategoryFromItemName('Manzanas golden')).toBe('frutas')
    expect(inferCategoryFromItemName('Queso curado oveja')).toBe('quesos')
    expect(inferCategoryFromItemName('Mozzarella fresca')).toBe('quesos')

    // Dairy & bakery & breakfast
    expect(inferCategoryFromItemName('Leche entera 1L')).toBe('lacteos_huevos')
    expect(inferCategoryFromItemName('Docena huevos camperos')).toBe('lacteos_huevos')
    expect(inferCategoryFromItemName('Barra de pan rustica')).toBe('panes_tostadas')
    expect(inferCategoryFromItemName('Pan de molde integral')).toBe('panes_tostadas')
    expect(inferCategoryFromItemName('Cafe molido natural')).toBe('desayuno_dulces_cafe')
    expect(inferCategoryFromItemName('Galletas maria dorada')).toBe('desayuno_dulces_cafe')
    expect(inferCategoryFromItemName('Cacao soluble colacao')).toBe('desayuno_dulces_cafe')

    // Dry pantry & snacks
    expect(inferCategoryFromItemName('Arroz redondo 1kg')).toBe('arroz_pastas_legumbres')
    expect(inferCategoryFromItemName('Espaguetis trigo')).toBe('arroz_pastas_legumbres')
    expect(inferCategoryFromItemName('Garbanzos cocidos tarro')).toBe('arroz_pastas_legumbres')
    expect(inferCategoryFromItemName('Caldo pollo brik 1L')).toBe('caldos_sopas_pures')
    expect(inferCategoryFromItemName('Pure patata copos')).toBe('caldos_sopas_pures')
    expect(inferCategoryFromItemName('Patatas fritas onduladas')).toBe('aperitivos_frutos_secos')
    expect(inferCategoryFromItemName('Nueces peladas 200g')).toBe('aperitivos_frutos_secos')

    // Frozen vs ice cream
    expect(inferCategoryFromItemName('Guisantes ultracongelados')).toBe('congelados')
    expect(inferCategoryFromItemName('Pizza congelada cuatro quesos')).toBe('congelados')
    expect(inferCategoryFromItemName('Helado tarrina vainilla')).toBe('helados')
    expect(inferCategoryFromItemName('Polos de limon 6 uds')).toBe('helados')

    // Household & personal care
    expect(inferCategoryFromItemName('Detergente liquido lavadora')).toBe('limpieza')
    expect(inferCategoryFromItemName('Lejia con detergente')).toBe('limpieza')
    expect(inferCategoryFromItemName('Champu suave anticaspa')).toBe('cuidado_personal')
    expect(inferCategoryFromItemName('Dentifrico proteccion total')).toBe('cuidado_personal')
  })
})
