import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Navbar from './components/layout/Navbar';

// Task Components
import TasksList from './components/tasks/TasksList';
import CreateTask from './components/tasks/CreateTask';
import TaskDetail from './components/tasks/TaskDetail';
import EditTask from './components/tasks/EditTask';

// Metric Components
import MetricsList from './components/metrics/MetricsList';
import CreateMetric from './components/metrics/CreateMetric';
import MetricDetail from './components/metrics/MetricDetail';
import EditMetric from './components/metrics/EditMetric';

// Test Components
import TestsList from './components/tests/TestsList';
import CreateTest from './components/tests/CreateTest';
import TestDetail from './components/tests/TestDetail';
import EditTest from './components/tests/EditTest';
import RunTest from './components/tests/RunTest';
import CompareResults from './components/tests/CompareResults';

// Simulation and Comparison Components
import SimulationsPage from './components/simulations/SimulationsPage';
import SimulationDetailPage from './components/simulations/SimulationDetailPage';
import ComparisonsPage from './components/comparisons/ComparisonsPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppProvider>
          <Navbar>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              {/* Task Routes */}
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <TasksList />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks/create" element={
                <ProtectedRoute>
                  <CreateTask />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks/:taskId" element={
                <ProtectedRoute>
                  <TaskDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/tasks/:taskId/edit" element={
                <ProtectedRoute>
                  <EditTask />
                </ProtectedRoute>
              } />
              
              {/* Metric Routes */}
              <Route path="/metrics" element={
                <ProtectedRoute>
                  <MetricsList />
                </ProtectedRoute>
              } />
              
              <Route path="/metrics/create" element={
                <ProtectedRoute>
                  <CreateMetric />
                </ProtectedRoute>
              } />
              
              <Route path="/metrics/:metricId" element={
                <ProtectedRoute>
                  <MetricDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/metrics/:metricId/edit" element={
                <ProtectedRoute>
                  <EditMetric />
                </ProtectedRoute>
              } />
              
              {/* Test Routes */}
              <Route path="/tests" element={
                <ProtectedRoute>
                  <TestsList />
                </ProtectedRoute>
              } />
              
              <Route path="/tests/create" element={
                <ProtectedRoute>
                  <CreateTest />
                </ProtectedRoute>
              } />
              
              <Route path="/tests/:testId" element={
                <ProtectedRoute>
                  <TestDetail />
                </ProtectedRoute>
              } />
              
              <Route path="/tests/:testId/edit" element={
                <ProtectedRoute>
                  <EditTest />
                </ProtectedRoute>
              } />
              
              <Route path="/tests/:testId/run" element={
                <ProtectedRoute>
                  <RunTest />
                </ProtectedRoute>
              } />
              
              <Route path="/tests/:testId/compare" element={
                <ProtectedRoute>
                  <CompareResults />
                </ProtectedRoute>
              } />
              
              {/* Update global simulation and comparison routes */}
              <Route path="/simulations" element={
                <ProtectedRoute>
                  <SimulationsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/simulations/:testId/:conversationId" element={
                <ProtectedRoute>
                  <SimulationDetailPage />
                </ProtectedRoute>
              } />
              
              <Route path="/comparisons" element={
                <ProtectedRoute>
                  <ComparisonsPage />
                </ProtectedRoute>
              } />
            </Routes>
          </Navbar>
        </AppProvider>
      </AuthProvider>
    </Router>
  );
}

export default App; 