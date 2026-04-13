import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, login, logout, register } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function checkAuth() {
    try {
      const data = await getCurrentUser()
      setUser(data.user)
    } catch (err) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(username, password) {
    setError('')
    try {
      const data = await login(username, password)
      setUser(data)
      return data
    } catch (err) {
      setError(err.message || 'Login failed')
      throw err
    }
  }

  async function handleRegister(username, password) {
    setError('')
    try {
      const data = await register(username, password)
      return data
    } catch (err) {
      setError(err.message || 'Registration failed')
      throw err
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      setUser(null)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value = {
    user,
    loading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
