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
