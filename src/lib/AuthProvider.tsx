import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

type User = {
  id: string
  email: string | null
  admin?: boolean
}

type AuthContextValue = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper to enrich user with profile data (admin flag)
  const fetchUserProfile = async (u: User): Promise<User> => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('admin')
        .eq('email', u.email ?? '')
        .maybeSingle()

      if (profile) {
        return { ...u, admin: profile.admin }
      }
    } catch (e) {
      console.warn('Profile fetch error', e)
    }
    return u
  }

  // initialize from supabase session if present
  useEffect(() => {
    let mounted = true

    const init = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('getSession error', error)
        }

        const session = data.session
        if (session?.user && mounted) {
          const u: User = { id: session.user.id, email: session.user.email ?? null }
          const enrichedUser = await fetchUserProfile(u)
          if (mounted) setUser(enrichedUser)
        }
      } catch (err) {
        console.error('init auth', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u: User = { id: session.user.id, email: session.user.email ?? null }
        fetchUserProfile(u).then(enriched => {
          if (mounted) setUser(enriched)
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      // unsubscribe listener
      if (listener?.subscription) listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.error('Sign-in error', error)
        return { success: false, message: error.message }
      }

      const sUser = data.user
      if (!sUser) return { success: false, message: 'No user returned' }

      const u: User = { id: sUser.id, email: sUser.email ?? null }
      const enrichedUser = await fetchUserProfile(u)

      setUser(enrichedUser)
      return { success: true }
    } catch (err) {
      console.error(err)
      return { success: false, message: 'Unknown error' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
