import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('admin_token') || '')
  const adminInfo = ref(JSON.parse(localStorage.getItem('admin_info') || '{}'))

  const isAuthenticated = computed(() => !!token.value)

  function setAuth(authData) {
    token.value = authData.token
    adminInfo.value = authData
    localStorage.setItem('admin_token', authData.token)
    localStorage.setItem('admin_info', JSON.stringify(authData))
  }

  function clearAuth() {
    token.value = ''
    adminInfo.value = {}
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
  }

  return {
    token,
    adminInfo,
    isAuthenticated,
    setAuth,
    clearAuth
  }
})
