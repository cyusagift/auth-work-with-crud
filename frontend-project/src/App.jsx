import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  createService,
  deleteService,
  getHealth,
  listServices,
  updateService,
} from './api'
import { AuthProvider, useAuth } from './AuthContext'
import LoginPage from './LoginPage'
import ProtectedRoute from './ProtectedRoute'

function formatMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  return number.toFixed(2)
}

function AuthenticatedApp() {
  const { user, logout } = useAuth()
  const [health, setHealth] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [selectedCode, setSelectedCode] = useState(null)
  const [form, setForm] = useState({
    serviceCode: '',
    serviceName: '',
    servicePrice: '',
  })
  const [busy, setBusy] = useState(false)

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) =>
      String(a.serviceName || '').localeCompare(String(b.serviceName || '')),
    )
  }, [services])

  const selectedService = useMemo(() => {
    if (!selectedCode) return null
    return services.find((s) => s.serviceCode === selectedCode) || null
  }, [selectedCode, services])

  async function refresh() {
    setError('')
    setLoading(true)
    try {
      const [healthData, rows] = await Promise.all([getHealth(), listServices()])
      setHealth(healthData)
      setServices(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setError(e?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetForm() {
    setSelectedCode(null)
    setForm({ serviceCode: '', serviceName: '', servicePrice: '' })
  }

  function selectService(service) {
    setSelectedCode(service.serviceCode)
    setForm({
      serviceCode: service.serviceCode ?? '',
      serviceName: service.serviceName ?? '',
      servicePrice: service.servicePrice ?? '',
    })
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const payload = {
        serviceCode: String(form.serviceCode).trim(),
        serviceName: String(form.serviceName).trim(),
        servicePrice: Number(form.servicePrice),
      }

      if (selectedCode) {
        await updateService(selectedCode, {
          serviceName: payload.serviceName,
          servicePrice: payload.servicePrice,
        })
      } else {
        await createService(payload)
      }

      resetForm()
      await refresh()
    } catch (e2) {
      setError(e2?.message || 'Failed to save service')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(serviceCode) {
    const ok = window.confirm(`Delete service "${serviceCode}"?`)
    if (!ok) return
    setError('')
    try {
      await deleteService(serviceCode)
      if (selectedCode === serviceCode) resetForm()
      await refresh()
    } catch (e2) {
      setError(e2?.message || 'Failed to delete service')
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>CRPMS</h1>
          <p className="muted">
            Backend status:{' '}
            <strong>{health?.ok ? 'OK' : health ? 'DOWN' : '...'}</strong>
          </p>
          <p className="muted">
            Logged in as: <strong>{user?.username}</strong>
          </p>
        </div>
        <div className="row">
          <button className="btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <section className="card">
        <div className="cardTitle">
          {selectedService ? (
            <>
              Edit service <span className="mono">{selectedService.serviceCode}</span>
            </>
          ) : (
            'Create service'
          )}
        </div>
        <form className="simpleForm" onSubmit={onSubmit}>
          <label className="field">
            <span>Service code</span>
            <input
              value={form.serviceCode}
              onChange={(e) =>
                setForm((s) => ({ ...s, serviceCode: e.target.value }))
              }
              placeholder="e.g. OIL-001"
              required
              disabled={Boolean(selectedService)}
            />
          </label>

          <label className="field">
            <span>Service name</span>
            <input
              value={form.serviceName}
              onChange={(e) =>
                setForm((s) => ({ ...s, serviceName: e.target.value }))
              }
              placeholder="e.g. Oil change"
              required
            />
          </label>

          <label className="field">
            <span>Service price</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.servicePrice}
              onChange={(e) =>
                setForm((s) => ({ ...s, servicePrice: e.target.value }))
              }
              placeholder="0.00"
              required
            />
          </label>

          <div className="row">
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : selectedService ? 'Save' : 'Create'}
            </button>
            <button className="btn" type="button" onClick={resetForm} disabled={busy}>
              New
            </button>
            <button
              className="btn danger"
              type="button"
              onClick={() => selectedService && onDelete(selectedService.serviceCode)}
              disabled={busy || !selectedService}
            >
              Delete
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="cardTitle">Services</div>

        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th className="num">Price</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="muted">
                    Loading…
                  </td>
                </tr>
              ) : sortedServices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No services yet.
                  </td>
                </tr>
              ) : (
                sortedServices.map((s) => (
                  <tr
                    key={s.serviceCode}
                    className={selectedCode === s.serviceCode ? 'selected' : ''}
                    onClick={() => selectService(s)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') selectService(s)
                    }}
                  >
                    <td className="mono">{s.serviceCode}</td>
                    <td>{s.serviceName}</td>
                    <td className="num mono">{formatMoney(s.servicePrice)}</td>
                    <td className="actions">
                      <button
                        className="btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          selectService(s)
                        }}
                      >
                        Select
                      </button>
                      <button
                        className="btn danger"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(s.serviceCode)
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: '400px', margin: '2rem auto', textAlign: 'center' }}>
          <div className="muted">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <ProtectedRoute>
      <AuthenticatedApp />
    </ProtectedRoute>
  )
}
