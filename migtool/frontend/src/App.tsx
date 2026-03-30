import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { CollectionsPage } from './pages/CollectionsPage'
import { ConnectDirectusPage } from './pages/ConnectDirectusPage'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { DashboardPage } from './pages/DashboardPage'
import { DataModelsPage } from './pages/DataModelsPage'
import { LoginPage } from './pages/LoginPage'
import { PrepareAssetsPage } from './pages/PrepareAssetsPage'
import { SourceFilesPage } from './pages/SourceFilesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-project"
        element={
          <ProtectedRoute>
            <CreateProjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/source-files"
        element={
          <ProtectedRoute>
            <SourceFilesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/connect-directus"
        element={
          <ProtectedRoute>
            <ConnectDirectusPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/data-models"
        element={
          <ProtectedRoute>
            <DataModelsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/prepare-assets"
        element={
          <ProtectedRoute>
            <PrepareAssetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId/collections"
        element={
          <ProtectedRoute>
            <CollectionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connect-directus"
        element={<Navigate to="/create-project" replace />}
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
