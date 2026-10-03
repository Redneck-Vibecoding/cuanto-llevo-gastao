import {
    getExpenses,
    getSettings,
    migrateLocalStorageToIndexedDb,
    setExpenses,
    setSettings
} from '~/utils/appDatabase'

export default defineNuxtPlugin(async () => {
    try {
        await migrateLocalStorageToIndexedDb()

        const expenseStore = useExpenseStore()
        const settingsStore = useSettingsStore()

        const [expenses, settings] = await Promise.all([
            getExpenses(),
            getSettings()
        ])

        if (expenses) expenseStore.expenses = expenses
        if (settings) settingsStore.$patch(settings)
        if (expenses) {
            void expenseStore.hydrateTicketAttachments().catch((error) => {
                console.error('Error hydrating expense attachments', error)
            })
        }

        // Development-only seed loader triggered via `npm run seed`
        if (import.meta.dev) {
            try {
                const res = await fetch('/dev-seed.json', { cache: 'no-cache' })
                if (res.ok) {
                    const seedData = await res.json()
                    const lastSeedKey = '__dev_seed_applied__'
                    const lastApplied = localStorage.getItem(lastSeedKey)
                    if (seedData?.seededAt && lastApplied !== seedData.seededAt) {
                        if (seedData.clear) {
                            console.info('[dev-seed] Clearing data as requested by npm run seed --clear')
                            await expenseStore.setExpenses([])
                        } else if (seedData.reset) {
                            console.info(`[dev-seed] Resetting and applying ${seedData.expenses.length} seed expenses...`)
                            await expenseStore.setExpenses(seedData.expenses)
                        } else if (Array.isArray(seedData.expenses) && seedData.expenses.length > 0) {
                            console.info(`[dev-seed] Loading ${seedData.expenses.length} seed expenses from npm run seed...`)
                            const existingIds = new Set(expenseStore.expenses.map(e => e.id))
                            const newExpenses = seedData.expenses.filter((e: { id: string }) => !existingIds.has(e.id))
                            if (newExpenses.length > 0 || expenseStore.expenses.length === 0) {
                                await expenseStore.setExpenses([...expenseStore.expenses, ...newExpenses])
                            }
                        }
                        localStorage.setItem(lastSeedKey, seedData.seededAt)
                    }
                }
            } catch {
                // Silently ignore if /dev-seed.json is absent
            }
        }

        watch(() => expenseStore.expenses, expenses => {
            void setExpenses(expenses.map(({ ticket: _ticket, ...expense }) => expense))
        }, { deep: true })

        watch(() => settingsStore.$state, state => {
            void setSettings(state)
        }, { deep: true })
    } catch (error) {
        console.error('Error initialising IndexedDB persistence', error)
    }
})
