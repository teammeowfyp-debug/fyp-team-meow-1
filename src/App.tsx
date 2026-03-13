import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import ManageUsers from './components/ManageUsers'
import AddUser from './components/AddUser'
import EditUsers from './components/EditUsers'
import DeleteUsers from './components/DeleteUsers'
import ScenarioCalculator from './components/ScenarioCalculator'
import ForgotPassword from './components/ForgotPassword'
import ResetPassword from './components/ResetPassword'
import './App.css'
import { AuthProvider } from './lib/AuthProvider'
import RequireAuth from './lib/RequireAuth'
import IdleLogout from './components/IdleLogout'

function AppContent() {
  const location = useLocation()
  const hideNavbar = ['/login', '/forgot-password', '/reset-password'].includes(location.pathname)

  return (
    <div className="app-wrapper">
      <IdleLogout />
      {!hideNavbar && <Navbar />}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin/manage-users"
            element={
              <RequireAuth>
                <ManageUsers />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/add-user"
            element={
              <RequireAuth>
                <AddUser />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/edit-users"
            element={
              <RequireAuth>
                <EditUsers />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/delete-users"
            element={
              <RequireAuth>
                <DeleteUsers />
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
