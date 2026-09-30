import { defineStore } from 'pinia'
import { setSettings as persistSettings } from '~/utils/appDatabase'

export interface CalendarConfig {
  day: number
  time: string
  isRecurring: boolean
}

export interface SettingsState {
  monthlyBudget: number
  googleMapsApiKey: string
  openAiApiKey: string
  reminder: CalendarConfig
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    monthlyBudget: 400,
    googleMapsApiKey: '',
    openAiApiKey: '',
    reminder: {
      day: 1,
      time: '09:00',
      isRecurring: true
    }
  }),
  actions: {
    async updateMonthlyBudget(budget: number) {
      this.monthlyBudget = budget
      await persistSettings(this.$state)
    },
    async loadSettings(settings: Partial<SettingsState> & Record<string, unknown>) {
      if (typeof settings.monthlyBudget === 'number') this.monthlyBudget = settings.monthlyBudget
      if (typeof settings.googleMapsApiKey === 'string') this.googleMapsApiKey = settings.googleMapsApiKey
      if (typeof settings.openAiApiKey === 'string') this.openAiApiKey = settings.openAiApiKey
      if (settings.reminder) {
        this.reminder = settings.reminder as CalendarConfig
      }
      await persistSettings(this.$state)
    }
  }
})
