import { useAuth } from './AuthContext'

export default function ProtectedRoute({ children }) {
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
    // Redirect to login will be handled by the main App component
    return null
  }

  return children
}
