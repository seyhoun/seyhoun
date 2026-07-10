import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { ErrorBoundary } from './components/ErrorBoundary'

const HomePage = lazy(() => import('./modes/HomePage').then((m) => ({ default: m.HomePage })))
const SchemaPage = lazy(() => import('./modes/SchemaPage').then((m) => ({ default: m.SchemaPage })))
const LoginPage = lazy(() => import('./modes/LoginPage').then((m) => ({ default: m.LoginPage })))

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <HomePage />
              </AuthGuard>
            }
          />
          <Route
            path="/schema/:id"
            element={
              <AuthGuard>
                <SchemaPage />
              </AuthGuard>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
