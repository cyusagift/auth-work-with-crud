import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [busy, setBusy] = useState(false)
  
  const { login, register, error } = useAuth()

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    
    try {
      if (isLogin) {
        await login(formData.username, formData.password)
      } else {
        await register(formData.username, formData.password)
        // After successful registration, switch to login mode
        setIsLogin(true)
        setFormData({ username: '', password: '' })
      }
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setBusy(false)
    }
  }

  function toggleMode() {
    setIsLogin(!isLogin)
    setFormData({ username: '', password: '' })
  }

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: '400px', margin: '2rem auto' }}>
        <div className="cardTitle">
          {isLogin ? 'Login' : 'Register'}
        </div>
        
        {error && <div className="alert">{error}</div>}
        
        <form className="simpleForm" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
              disabled={busy}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min 8 characters)"
              minLength="8"
              required
              disabled={busy}
            />
          </label>

          <div className="row">
            <button 
              className="btn primary" 
              type="submit" 
              disabled={busy}
            >
              {busy ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </button>
          </div>
        </form>

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button 
            className="btn" 
            type="button" 
            onClick={toggleMode}
            disabled={busy}
          >
            {isLogin ? "Need an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  )
}
