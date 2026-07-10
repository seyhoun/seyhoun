import { create } from 'zustand'
import type { User } from '../types/diagram'

interface AuthStore {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

const TOKEN_KEY = 'seyhoun_token'

export const useAuthStore = create<AuthStore>((set) => ({
  // Initialise from localStorage so auth survives page reload
  token: localStorage.getItem(TOKEN_KEY),
  user: null,

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    set({ token, user })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    set({ token: null, user: null })
  },
}))

// On startup, if a token exists, re-hydrate the user object from the API.
// Import lazily to avoid a circular dependency (api → auth → api).
const token = localStorage.getItem(TOKEN_KEY)
if (token) {
  import('../lib/api').then(({ api }) => {
    api.auth
      .me()
      .then((user) => useAuthStore.getState().setUser(user))
      .catch(() => {
        // Token is invalid / expired — clear it so the user is sent to login.
        useAuthStore.getState().logout()
      })
  })
}
