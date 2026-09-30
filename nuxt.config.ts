// https://nuxt.com/docs/api/configuration/nuxt-config

const baseURL = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  runtimeConfig: {
    public: {
      appVersion: process.env.NUXT_PUBLIC_APP_VERSION || '1.0.0',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || ''
    }
  },
  devtools: { enabled: true },
  ssr: false,

  app: {
    baseURL: baseURL,
    head: {
      title: 'Cuánto llevo gastao',
      link: [
        { rel: 'icon', type: 'image/png', sizes: '196x196', href: baseURL + 'favicon-196.png' },
        { rel: 'icon', type: 'image/x-icon', href: baseURL + 'favicon.ico' },
        { rel: 'apple-touch-icon', href: baseURL + 'apple-icon-180.png' },
        { rel: 'manifest', href: baseURL + 'manifest.webmanifest' }
      ],
      meta: [
        { name: 'theme-color', content: '#10b981' },
        { name: 'msapplication-square70x70logo', content: baseURL + 'mstile-icon-128.png' },
        { name: 'msapplication-square150x150logo', content: baseURL + 'mstile-icon-270.png' },
        { name: 'msapplication-square310x310logo', content: baseURL + 'mstile-icon-558.png' },
        { name: 'msapplication-wide310x150logo', content: baseURL + 'mstile-icon-558-270.png' },
        { name: 'robots', content: 'noindex, nofollow' }
      ]
    }
  },

  css: ['./app/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@nuxt/eslint',
    '@nuxtjs/i18n'
  ],

  nitro: {
    preset: 'github-pages',
    debug: process.env.NUXT_DEBUG === '1'
  },

  i18n: {
    langDir: 'locales',
    locales: [
      { code: 'es', language: 'es-ES', file: 'es.json' },
      { code: 'ca', language: 'ca-ES', file: 'ca.json' }
    ],
    defaultLocale: 'es',
    strategy: 'no_prefix',
    compilation: {
      strictMessage: false
    }
  },

  icon: {
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
      sizeLimitKb: 256,
      icons: [
        'heroicons:chevron-left-20-solid',
        'heroicons:chevron-right-20-solid',
        'heroicons:chevron-up-20-solid',
        'heroicons:chevron-down-20-solid',
        'heroicons:chevron-left',
        'heroicons:chevron-right',
        'heroicons:chevron-up',
        'heroicons:chevron-down',
        'heroicons:archive-box-arrow-down',
        'heroicons:chart-bar',
        'heroicons:shopping-cart',
        'heroicons:shopping-bag',
        'heroicons:banknotes',
        'heroicons:calendar',
        'heroicons:cog-6-tooth',
        'heroicons:home',
        'heroicons:plus',
        'heroicons:camera',
        'heroicons:sparkles',
        'heroicons:trash',
        'heroicons:pencil-square',
        'heroicons:arrow-trending-up',
        'heroicons:check-circle',
        'heroicons:exclamation-triangle',
        'lucide:chevron-left',
        'lucide:chevron-right',
        'lucide:chevron-up',
        'lucide:chevron-down',
        'lucide:chevrons-right',
        'lucide:chevrons-left',
        'lucide:refresh-cw',
        'logos:google-icon',
        'logos:github-icon'
      ]
    },
  },

  pwa: {
    registerType: 'prompt',
    manifest: {
      scope: baseURL,
      start_url: baseURL,
      name: 'Cuánto llevo gastao',
      short_name: 'CuántoGasto',
      description: 'Control inteligente de gastos de supermercado y compras',
      background_color: '#ffffff',
      theme_color: '#10b981',
      display: 'standalone',
      icons: [
        {
          src: 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'manifest-icon-192.maskable.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        },
        {
          src: 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any'
        },
        {
          src: 'manifest-icon-512.maskable.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: 'pwa-screenshots/mobile.png',
          sizes: '375x667',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Mobile'
        },
        {
          src: 'pwa-screenshots/desktop.png',
          sizes: '1152x648',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Desktop'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
      suppressWarnings: true,
      navigateFallback: '/',
      type: 'module',
    },
  }
})