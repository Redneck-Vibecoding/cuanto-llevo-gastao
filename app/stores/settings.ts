import { defineStore } from 'pinia'
import { setSettings as persistSettings } from '~/utils/appDatabase'

export interface SettingsState {
  monthlyBudget: number
  openAiApiKey: string
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    monthlyBudget: 400,
    openAiApiKey: ''
  }),
  actions: {
    async updateMonthlyBudget(budget: number) {
      this.monthlyBudget = budget
      await persistSettings(this.$state)
    },
    async loadSettings(settings: Partial<SettingsState> & Record<string, unknown>) {
      if (typeof settings.monthlyBudget === 'number') this.monthlyBudget = settings.monthlyBudget
      if (typeof settings.openAiApiKey === 'string') this.openAiApiKey = settings.openAiApiKey
      await persistSettings(this.$state)
    }
  }
})
