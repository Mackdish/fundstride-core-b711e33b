import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

// Function middleware runs outside auth event callbacks. Read the current session
// here instead of maintaining a second onAuthStateChange subscriber. This avoids
// duplicate auth initialization and prevents a stale in-memory token.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.warn('[Supabase] Could not read session for server function:', error.message)
      return next({ headers: {} })
    }

    return next({
      headers: data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {},
    })
  },
)
