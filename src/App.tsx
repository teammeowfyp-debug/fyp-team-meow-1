import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard/Dashboard'
import Login from './components/Login'
import AdminPortal from './components/AdminPortal/AdminPortal'
import ScenarioCalculator from './components/ScenarioCalculator/ScenarioCalculator'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import './App.css'
import { AuthProvider } from './lib/AuthProvider'
import RequireAuth from './lib/RequireAuth'
import IdleLogout from './components/IdleLogout'
import AddClientPage from './components/AddClient/AddClientPage'

function AppContent() {
  const location = useLocation()
  const hideNavbar = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)

  return (
    <div className="app-wrapper">
      <IdleLogout />
      {!hideNavbar && <Navbar />}
      <main className={hideNavbar ? 'no-navbar' : ''}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/manage-users"
            element={
              <RequireAuth>
                <AdminPortal />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/add-user"
            element={
              <RequireAuth>
                <AdminPortal defaultTab="add" />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/manage-clients"
            element={
              <RequireAuth>
                <AdminPortal defaultTab="edit" />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/remove-user"
            element={
              <RequireAuth>
                <AdminPortal defaultTab="delete" />
              </RequireAuth>
            }
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/scenario"
            element={
              <RequireAuth>
                <ScenarioCalculator />
              </RequireAuth>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/add-client"
            element={
              <RequireAuth>
                <AddClientPage onSuccess={(newId) => {
                  if (newId) window.location.href = `/${newId}`;
                }} />
              </RequireAuth>
            }
          />
          <Route
            path="/:clientId/*"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
