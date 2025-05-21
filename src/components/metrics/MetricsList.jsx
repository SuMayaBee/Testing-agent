import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { metricsAPI } from '../../lib/api';
import { 
  PlusIcon, 
  PencilSquareIcon as PencilAltIcon, 
  TrashIcon, 
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

function MetricsList() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentOrganizationUsername } = useApp();
  
  useEffect(() => {
    async function fetchMetrics() {
      if (!currentOrganizationUsername) return;
      
      try {
        setLoading(true);
        setError(null);
        const fetchedMetrics = await metricsAPI.getMetrics(currentOrganizationUsername);
        
        // Set metrics directly without conversion
        setMetrics(fetchedMetrics);
      } catch (err) {
        setError(err.message || 'Failed to fetch metrics');
        console.error('Error fetching metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMetrics();
  }, [currentOrganizationUsername]);

  const handleDeleteMetric = async (metricId) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      await metricsAPI.deleteMetric(currentOrganizationUsername, metricId);
      setMetrics(metrics.filter(metric => metric.id !== metricId));
    } catch (err) {
      setError(err.message || 'Failed to delete metric');
      console.error('Error deleting metric:', err);
    }
  };

  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Metrics</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Metrics</h1>
        <Link 
          to="/metrics/create" 
          className="btn btn-primary inline-flex items-center"
        >
          <PlusIcon className="w-5 h-5 mr-1" />
          Create Metric
        </Link>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-12 text-center">
          <div className="bg-secondary-100 mx-auto rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <ChartBarIcon className="w-8 h-8 text-secondary-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">No metrics found</h3>
          <p className="text-secondary-600 mb-6">Create your first metric to start evaluating tests</p>
          <Link to="/metrics/create" className="btn btn-primary inline-flex items-center">
            <PlusIcon className="w-5 h-5 mr-1" />
            Create Metric
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map(metric => (
            <div key={metric.id} className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-secondary-900">{metric.name}</h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                    {metric.type === 'generic' ? 'Generic' : 'Task-Specific'}
                  </span>
                </div>
                <p className="text-secondary-600 mb-4 line-clamp-2">{metric.description}</p>
                <div className="text-xs text-secondary-500 mb-4">
                  Created {new Date(metric.created_at).toLocaleDateString()}
                </div>
                <div className="flex space-x-2">
                  <Link 
                    to={`/metrics/${metric.id}`} 
                    className="flex-1 btn btn-secondary btn-sm inline-flex items-center justify-center"
                  >
                    <ExternalLinkIcon className="w-4 h-4 mr-1" />
                    View
                  </Link>
                  <Link 
                    to={`/metrics/${metric.id}/edit`} 
                    className="flex-1 btn btn-primary btn-sm inline-flex items-center justify-center"
                  >
                    <PencilAltIcon className="w-4 h-4 mr-1" />
                    Edit
                  </Link>
                  <button 
                    onClick={() => handleDeleteMetric(metric.id)}
                    className="btn btn-danger btn-sm inline-flex items-center justify-center"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MetricsList; 