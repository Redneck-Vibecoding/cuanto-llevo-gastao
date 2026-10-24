import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Language configuration and locales', () => {
  it('includes ca, es, en, and hi options in Settings Language.vue', () => {
    const filePath = path.resolve('app/components/settings/Language.vue')
    const content = fs.readFileSync(filePath, 'utf8')

    expect(content).toContain("{ label: 'ca', value: 'ca' }")
    expect(content).toContain("{ label: 'es', value: 'es' }")
    expect(content).toContain("{ label: 'en', value: 'en' }")
    expect(content).toContain("{ label: 'hi', value: 'hi' }")
  })

  it('configures es, ca, en, and hi in nuxt.config.ts i18n locales', () => {
    const nuxtConfigPath = path.resolve('nuxt.config.ts')
    const content = fs.readFileSync(nuxtConfigPath, 'utf8')

    expect(content).toContain("{ code: 'es', language: 'es-ES', file: 'es.json' }")
    expect(content).toContain("{ code: 'ca', language: 'ca-ES', file: 'ca.json' }")
    expect(content).toContain("{ code: 'en', language: 'en-US', file: 'en.json' }")
    expect(content).toContain("{ code: 'hi', language: 'hi-IN', file: 'hi.json' }")
  })

  it('contains matching keys between es.json, en.json, and hi.json', () => {
    const es = JSON.parse(fs.readFileSync(path.resolve('i18n/locales/es.json'), 'utf8'))
    const en = JSON.parse(fs.readFileSync(path.resolve('i18n/locales/en.json'), 'utf8'))
    const hi = JSON.parse(fs.readFileSync(path.resolve('i18n/locales/hi.json'), 'utf8'))

    const getKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
      const keys: string[] = []
      for (const k of Object.keys(obj)) {
        const full = prefix ? `${prefix}.${k}` : k
        const val = obj[k]
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          keys.push(...getKeys(val as Record<string, unknown>, full))
        } else {
          keys.push(full)
        }
      }
      return keys
    }

    const esKeys = getKeys(es)
    const enKeys = getKeys(en)
    const hiKeys = getKeys(hi)

    expect(enKeys).toEqual(esKeys)
    expect(hiKeys).toEqual(esKeys)
  })
})
