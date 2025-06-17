import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeftIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  DocumentArrowDownIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  BoltIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Mock data for demonstration - will be replaced with real API data
const MOCK_TESTS = {
  'test123': {
    id: 'test123',
    name: 'Basic Phone Agent Test',
    simulations: [
      {
        id: 'sim1',
        target_phone_number: '+1234567890',
        date: '2023-05-15T10:30:00Z',
        overall_score: 8.2,
        tasks: ['task1', 'task2'],
        task_names: ['Order a pizza', 'Change an order'],
        response_times: [1.2, 0.8, 2.1, 1.5, 0.9, 1.8, 1.1, 2.3, 1.4, 0.7], // in seconds
        call_duration: 180, // in seconds
        transcript: [
          { speaker: 'system', text: 'Call initiated', timestamp: 0 },
          { speaker: 'agent', text: 'Hello, thank you for calling. How can I help you today?', timestamp: 2.1 },
          { speaker: 'user', text: "I'd like to order a pizza for delivery.", timestamp: 4.3 },
          { speaker: 'agent', text: "I'd be happy to help with that. What type of pizza would you like?", timestamp: 5.1 },
          { speaker: 'user', text: "I'd like a large pepperoni pizza with extra cheese.", timestamp: 7.8 },
          { speaker: 'agent', text: "Great choice! A large pepperoni pizza with extra cheese. Would you like any sides or drinks with that?", timestamp: 9.6 },
          { speaker: 'user', text: "Actually, I need to modify that order. Can I change it to a medium instead?", timestamp: 12.4 },
          { speaker: 'agent', text: "Absolutely, I can change that to a medium pepperoni pizza with extra cheese. Is there anything else you'd like to modify?", timestamp: 14.7 },
        ],
        metrics_results: [
          { metric_id: 'metric1', metric_name: 'Name Recognition', metric_type: 'generic', score: 9.5, details: 'Agent recognized customer name quickly' },
          { metric_id: 'metric2', metric_name: 'Address Validation', metric_type: 'generic', score: 8.3, details: 'Address was confirmed but took multiple attempts' },
          { metric_id: 'metric3', metric_name: 'Order Confirmation', metric_type: 'task-specific', score: 7.8, details: 'Order was confirmed with slight confusion' },
          { metric_id: 'metric4', metric_name: 'Order Modification', metric_type: 'task-specific', score: 6.2, details: 'Some confusion during modification process' },
        ]
      },
      {
        id: 'sim2',
        target_phone_number: '+1987654321',
        date: '2023-05-15T11:45:00Z',
        overall_score: 6.9,
        tasks: ['task1', 'task2'],
        task_names: ['Order a pizza', 'Change an order'],
        response_times: [3.2, 2.8, 4.1, 3.5, 2.9, 3.8, 4.1, 5.3, 3.4, 2.7], // slower responses
        call_duration: 240,
        transcript: [
          { speaker: 'system', text: 'Call initiated', timestamp: 0 },
          { speaker: 'agent', text: 'Thank you for calling. What can I do for you?', timestamp: 3.2 },
          { speaker: 'user', text: "I'd like to order a pizza for delivery.", timestamp: 6.0 },
          { speaker: 'agent', text: "Sure, what kind of pizza would you like?", timestamp: 8.8 },
          { speaker: 'user', text: "I want a large pepperoni pizza.", timestamp: 12.3 },
          { speaker: 'agent', text: "A large pepperoni. Anything else?", timestamp: 15.8 },
          { speaker: 'user', text: "Actually, I need to change that order. Make it a medium instead.", timestamp: 19.6 },
          { speaker: 'agent', text: "Ok, changing to a medium pepperoni. Is that all?", timestamp: 24.9 },
        ],
        metrics_results: [
          { metric_id: 'metric1', metric_name: 'Name Recognition', metric_type: 'generic', score: 8.8, details: 'Agent recognized customer name but had to ask twice' },
          { metric_id: 'metric2', metric_name: 'Address Validation', metric_type: 'generic', score: 6.5, details: 'Multiple attempts needed to confirm address' },
          { metric_id: 'metric3', metric_name: 'Order Confirmation', metric_type: 'task-specific', score: 6.4, details: 'Order confirmation was unclear' },
          { metric_id: 'metric4', metric_name: 'Order Modification', metric_type: 'task-specific', score: 4.3, details: 'Significant confusion during modification' },
        ]
      },
      {
        id: 'sim3',
        target_phone_number: '+1555123456',
        date: '2023-05-15T14:20:00Z',
        overall_score: 9.1,
        tasks: ['task1', 'task2'],
        task_names: ['Order a pizza', 'Change an order'],
        response_times: [0.8, 0.6, 1.1, 0.9, 0.7, 1.0, 0.8, 1.2, 0.9, 0.5], // fast responses
        call_duration: 150,
        transcript: [
          { speaker: 'system', text: 'Call initiated', timestamp: 0 },
          { speaker: 'agent', text: 'Hello, thank you for calling. How may I assist you today?', timestamp: 0.8 },
          { speaker: 'user', text: "I'd like to order a pizza for delivery.", timestamp: 1.4 },
          { speaker: 'agent', text: "I'd be delighted to help you order a pizza for delivery. What type of pizza would you like to order today?", timestamp: 2.5 },
          { speaker: 'user', text: "A large pepperoni pizza, please.", timestamp: 3.4 },
          { speaker: 'agent', text: "Excellent choice! One large pepperoni pizza. May I have your address for delivery?", timestamp: 4.3 },
          { speaker: 'user', text: "Actually, I'd like to change my order. Can I get a medium instead of large?", timestamp: 5.2 },
          { speaker: 'agent', text: "Absolutely! I've updated your order to a medium pepperoni pizza. Is there anything else you'd like to modify?", timestamp: 6.4 },
        ],
        metrics_results: [
          { metric_id: 'metric1', metric_name: 'Name Recognition', metric_type: 'generic', score: 9.8, details: 'Perfect name recognition on first attempt' },
          { metric_id: 'metric2', metric_name: 'Address Validation', metric_type: 'generic', score: 9.1, details: 'Address confirmed efficiently and accurately' },
          { metric_id: 'metric3', metric_name: 'Order Confirmation', metric_type: 'task-specific', score: 8.9, details: 'Clear and concise order confirmation' },
          { metric_id: 'metric4', metric_name: 'Order Modification', metric_type: 'task-specific', score: 8.5, details: 'Smooth modification process' },
        ]
      }
    ]
  }
};

function CompareResults() {
  const { testId } = useParams();
  const { currentOrganizationUsername } = useApp();
  
  const [test, setTest] = useState(null);
  const [simulations, setSimulations] = useState([]);
  const [selectedSimulations, setSelectedSimulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview, metrics, performance, transcripts

  useEffect(() => {
    async function fetchTestData() {
      if (!currentOrganizationUsername || !testId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // This would be replaced with actual API call
        // const testData = await testsAPI.getTest(currentOrganizationUsername, testId);
        // const simulationsData = await simulationsAPI.getTestSimulations(currentOrganizationUsername, testId);
        
        // For development, use mock data
        setTimeout(() => {
          const mockTest = MOCK_TESTS[testId];
          if (mockTest) {
            setTest(mockTest);
            setSimulations(mockTest.simulations);
            // Default select all simulations
            setSelectedSimulations(mockTest.simulations.map(sim => sim.id));
          } else {
            setError('Test not found');
          }
          setLoading(false);
        }, 1000);
      } catch (err) {
        console.error('Error fetching test data:', err);
        setError(err.message || 'Failed to load test data');
        setLoading(false);
      }
    }
    
    fetchTestData();
  }, [currentOrganizationUsername, testId]);
  
  const handleSimulationToggle = (simulationId) => {
    setSelectedSimulations(prev => {
      if (prev.includes(simulationId)) {
        return prev.filter(id => id !== simulationId);
      } else {
        return [...prev, simulationId];
      }
    });
  };
  
  const getSelectedSimulations = () => {
    return simulations.filter(sim => selectedSimulations.includes(sim.id));
  };
  
  const getColorClass = (score) => {
    if (score >= 8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getPerformanceColor = (value, type = 'score') => {
    if (type === 'response_time') {
      if (value <= 1.5) return 'text-green-600';
      if (value <= 3.0) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (value >= 8) return 'text-green-600';
    if (value >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Find the best performing simulation based on overall score
  const getBestSimulation = () => {
    if (simulations.length === 0) return null;
    
    const selected = getSelectedSimulations();
    if (selected.length === 0) return null;
    
    return selected.reduce((best, current) => {
      return current.overall_score > best.overall_score ? current : best;
    }, selected[0]);
  };

  // Get response time analysis
  const getResponseTimeAnalysis = () => {
    const selected = getSelectedSimulations();
    if (selected.length === 0) return null;

    const analysis = selected.map(sim => {
      const responseTimes = sim.response_times || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
      
      const fastResponses = responseTimes.filter(time => time <= 1.5).length;
      const slowResponses = responseTimes.filter(time => time > 3.0).length;
      
      return {
        ...sim,
        avgResponseTime,
        fastResponses,
        slowResponses,
        totalResponses: responseTimes.length,
        responseTimes
      };
    });

    // Find fastest and slowest
    const fastest = analysis.reduce((fast, current) => 
      current.avgResponseTime < fast.avgResponseTime ? current : fast, analysis[0]);
    const slowest = analysis.reduce((slow, current) => 
      current.avgResponseTime > slow.avgResponseTime ? current : slow, analysis[0]);

    return { analysis, fastest, slowest };
  };
  
  // Get all unique metrics from selected simulations
  const getAllUniqueMetrics = () => {
    const selected = getSelectedSimulations();
    if (selected.length === 0) return [];
    
    const metricsMap = new Map();
    
    selected.forEach(sim => {
      sim.metrics_results.forEach(metric => {
        if (!metricsMap.has(metric.metric_id)) {
          metricsMap.set(metric.metric_id, {
            id: metric.metric_id,
            name: metric.metric_name,
            type: metric.metric_type
          });
        }
      });
    });
    
    return Array.from(metricsMap.values());
  };
  
  const bestSimulation = getBestSimulation();
  const uniqueMetrics = getAllUniqueMetrics();
  const responseTimeAnalysis = getResponseTimeAnalysis();

  // Generate and download PDF
  const generatePDF = () => {
    if (!test || selectedSimulations.length === 0) return;
    
    setGeneratingPdf(true);
    
    try {
      // Initialize PDF
      const doc = new jsPDF();
      
      // Add title and header
      doc.setFontSize(20);
      doc.text(`Test Results: ${test.name}`, 20, 20);
      
      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      
      // Add selected simulations summary
      doc.setFontSize(14);
      doc.text('Selected Simulations:', 20, 45);
      
      let yPosition = 55;
      getSelectedSimulations().forEach((sim, index) => {
        doc.setFontSize(10);
        doc.text(`${index + 1}. ${sim.target_phone_number} - Score: ${sim.overall_score.toFixed(1)}/10`, 25, yPosition);
        yPosition += 10;
      });
      
      // Add metrics comparison table
      if (uniqueMetrics.length > 0) {
        yPosition += 10;
        doc.setFontSize(14);
        doc.text('Metrics Comparison:', 20, yPosition);
        yPosition += 10;
        
        const tableData = uniqueMetrics.map(metric => {
          const row = [metric.name, metric.type];
          getSelectedSimulations().forEach(sim => {
            const metricResult = sim.metrics_results.find(m => m.metric_id === metric.id);
            row.push(metricResult ? `${metricResult.score.toFixed(1)}/10` : 'N/A');
          });
          return row;
        });
        
        const headers = ['Metric', 'Type', ...getSelectedSimulations().map(sim => sim.target_phone_number)];
        
        doc.autoTable({
          head: [headers],
          body: tableData,
          startY: yPosition,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 }
        });
      }
      
      // Save the PDF
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `test-comparison-${test.name.replace(/\s+/g, '-')}-${dateStr}.pdf`.toLowerCase();
      doc.save(fileName);
      
      console.log('PDF successfully generated and downloaded');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };
  
  // Tab component
  const TabButton = ({ id, label, icon: Icon, isActive, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-primary-600 text-white shadow-lg transform scale-105'
          : 'text-secondary-600 hover:text-primary-600 hover:bg-primary-50'
      }`}
    >
      <Icon className="w-5 h-5 mr-2" />
      {label}
    </button>
  );

  // Performance Insight Card
  const InsightCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => (
    <div className={`bg-gradient-to-br from-${color}-50 to-${color}-100 border border-${color}-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 bg-${color}-500 rounded-lg shadow-md`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? <ArrowTrendingUpIcon className="w-4 h-4 mr-1" /> : <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />}
            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className={`text-3xl font-bold text-${color}-700 mb-2`}>{value}</div>
      <div className={`text-${color}-600 text-sm`}>{subtitle}</div>
      <div className={`text-lg font-semibold text-${color}-800 mt-2`}>{title}</div>
    </div>
  );

  // Response Time Chart Component
  const ResponseTimeChart = ({ data }) => {
    if (!data || data.analysis.length === 0) return null;

    const maxTime = Math.max(...data.analysis.flatMap(sim => sim.responseTimes));
    const chartHeight = 200;

    return (
      <div className="bg-white rounded-xl border border-secondary-200 shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-secondary-800 flex items-center">
            <ClockIcon className="w-6 h-6 mr-2 text-primary-600" />
            Response Time Distribution
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Fast (≤1.5s)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Medium (1.5-3s)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Slow (&gt;3s)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {data.analysis.map((sim, index) => (
            <div key={sim.id} className="bg-secondary-50 rounded-lg p-4 border border-secondary-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-semibold text-secondary-800">{sim.target_phone_number}</div>
                  <div className="text-sm text-secondary-600">
                    Avg: <span className={`font-bold ${getPerformanceColor(sim.avgResponseTime, 'response_time')}`}>
                      {sim.avgResponseTime.toFixed(2)}s
                    </span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  sim.id === data.fastest.id ? 'bg-green-100 text-green-800' :
                  sim.id === data.slowest.id ? 'bg-red-100 text-red-800' :
                  'bg-secondary-100 text-secondary-800'
                }`}>
                  {sim.id === data.fastest.id ? '🚀 FASTEST' :
                   sim.id === data.slowest.id ? '🐌 SLOWEST' : 'AVERAGE'}
                </div>
              </div>

              {/* Response Time Bars */}
              <div className="space-y-2 mb-4">
                {sim.responseTimes.map((time, i) => (
                  <div key={i} className="flex items-center">
                    <div className="w-8 text-xs text-secondary-600">#{i+1}</div>
                    <div className="flex-1 bg-secondary-200 rounded-full h-3 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          time <= 1.5 ? 'bg-green-500' :
                          time <= 3.0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${(time / maxTime) * 100}%` }}
                      ></div>
                    </div>
                    <div className={`w-12 text-xs text-right font-medium ${getPerformanceColor(time, 'response_time')}`}>
                      {time.toFixed(1)}s
                    </div>
                  </div>
                ))}
              </div>

              {/* Performance Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-100 rounded-lg p-2">
                  <div className="text-lg font-bold text-green-700">{sim.fastResponses}</div>
                  <div className="text-xs text-green-600">Fast</div>
                </div>
                <div className="bg-yellow-100 rounded-lg p-2">
                  <div className="text-lg font-bold text-yellow-700">
                    {sim.totalResponses - sim.fastResponses - sim.slowResponses}
                  </div>
                  <div className="text-xs text-yellow-600">Medium</div>
                </div>
                <div className="bg-red-100 rounded-lg p-2">
                  <div className="text-lg font-bold text-red-700">{sim.slowResponses}</div>
                  <div className="text-xs text-red-600">Slow</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Insights */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2" />
            Performance Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start">
              <BoltIcon className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-green-700">Fastest Agent:</span>
                <span className="text-secondary-700 ml-1">
                  {data.fastest.target_phone_number} with {data.fastest.avgResponseTime.toFixed(2)}s average
                </span>
              </div>
            </div>
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium text-red-700">Needs Improvement:</span>
                <span className="text-secondary-700 ml-1">
                  {data.slowest.target_phone_number} with {data.slowest.avgResponseTime.toFixed(2)}s average
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Compare Test Results</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view test comparisons.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Compare Test Results</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Compare Test Results</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
        <div className="mt-4">
          <Link to={`/tests/${testId}`} className="btn btn-secondary inline-flex items-center">
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Back to Test
          </Link>
        </div>
      </div>
    );
  }
  
  if (!test) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Compare Test Results</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">Test not found</p>
        </div>
        <div className="mt-4">
          <Link to="/tests" className="btn btn-secondary inline-flex items-center">
            <ArrowLeftIcon className="w-5 h-5 mr-1" />
            Back to Tests
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to={`/tests/${testId}`} className="text-primary-600 hover:text-primary-800 inline-flex items-center transition-colors duration-200">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Test
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            {test.name}
          </h1>
          <p className="text-secondary-600 mt-2 text-lg">Advanced Performance Analysis & Comparison</p>
        </div>
        
        {simulations.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow-md">
            <p className="text-yellow-700 text-lg">No test simulations available. Run a test first to compare results.</p>
          </div>
        ) : (
          <>
            {/* Simulation Selection */}
            <div className="bg-white rounded-xl border border-secondary-200 shadow-xl p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-secondary-800 flex items-center">
                  <EyeIcon className="w-7 h-7 mr-3 text-primary-600" />
                  Select Agents to Compare
                </h2>
                
                {selectedSimulations.length > 0 && (
                  <button
                    onClick={generatePDF}
                    disabled={generatingPdf}
                    className="btn btn-primary inline-flex items-center shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    {generatingPdf ? 'Generating PDF...' : 'Download Analysis Report'}
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {simulations.map(sim => (
                  <div 
                    key={sim.id}
                    className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedSimulations.includes(sim.id) 
                        ? 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 shadow-lg transform scale-105' 
                        : 'border-secondary-200 hover:border-primary-300 bg-white'
                    }`}
                    onClick={() => handleSimulationToggle(sim.id)}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="font-bold text-lg text-secondary-800">{sim.target_phone_number}</div>
                      <div className={`px-3 py-2 rounded-full text-sm font-bold border-2 ${getColorClass(sim.overall_score)}`}>
                        {sim.overall_score.toFixed(1)}/10
                      </div>
                    </div>
                    <div className="text-sm text-secondary-600 mb-4">
                      {new Date(sim.date).toLocaleString()}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-secondary-700">
                        <span className="font-medium">{sim.tasks.length}</span> {sim.tasks.length === 1 ? 'task' : 'tasks'} completed
                      </div>
                      <input 
                        type="checkbox" 
                        checked={selectedSimulations.includes(sim.id)}
                        onChange={() => {}}
                        className="h-6 w-6 text-primary-600 focus:ring-primary-500 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedSimulations.length > 0 ? (
              <div className="space-y-8">
                {/* Navigation Tabs */}
                <div className="bg-white rounded-xl shadow-lg p-2 border border-secondary-200">
                  <div className="flex space-x-2 overflow-x-auto">
                    <TabButton
                      id="overview"
                      label="Overview"
                      icon={ChartBarIcon}
                      isActive={activeTab === 'overview'}
                      onClick={setActiveTab}
                    />
                    <TabButton
                      id="performance"
                      label="Performance Analysis"
                      icon={BoltIcon}
                      isActive={activeTab === 'performance'}
                      onClick={setActiveTab}
                    />
                    <TabButton
                      id="metrics"
                      label="Metrics Comparison"
                      icon={CheckCircleIcon}
                      isActive={activeTab === 'metrics'}
                      onClick={setActiveTab}
                    />
                    <TabButton
                      id="transcripts"
                      label="Conversation Analysis"
                      icon={DocumentTextIcon}
                      isActive={activeTab === 'transcripts'}
                      onClick={setActiveTab}
                    />
                  </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Performance Insights Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <InsightCard
                        title="Best Performer"
                        value={bestSimulation?.overall_score.toFixed(1) || 'N/A'}
                        subtitle={bestSimulation?.target_phone_number || 'No data'}
                        icon={CheckCircleIcon}
                        color="green"
                      />
                      <InsightCard
                        title="Average Score"
                        value={(getSelectedSimulations().reduce((sum, sim) => sum + sim.overall_score, 0) / getSelectedSimulations().length).toFixed(1)}
                        subtitle="Across all agents"
                        icon={ChartBarIcon}
                        color="blue"
                      />
                      <InsightCard
                        title="Fastest Response"
                        value={responseTimeAnalysis?.fastest.avgResponseTime.toFixed(2) + 's' || 'N/A'}
                        subtitle={responseTimeAnalysis?.fastest.target_phone_number || 'No data'}
                        icon={BoltIcon}
                        color="purple"
                      />
                      <InsightCard
                        title="Total Tests"
                        value={getSelectedSimulations().length}
                        subtitle="Agents compared"
                        icon={EyeIcon}
                        color="indigo"
                      />
                    </div>

                    {/* Overall Comparison Table */}
                    <div className="bg-white rounded-xl border border-secondary-200 shadow-xl overflow-hidden">
                      <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-6">
                        <h2 className="text-2xl font-bold text-white flex items-center">
                          <ChartBarIcon className="w-7 h-7 mr-3" />
                          Overall Performance Comparison
                        </h2>
                      </div>
                      <div className="p-6">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-secondary-200">
                            <thead>
                              <tr className="bg-secondary-50">
                                <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Agent</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Test Date</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Overall Score</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Avg Response Time</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Performance</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-200">
                              {getSelectedSimulations().map(sim => {
                                const analysis = responseTimeAnalysis?.analysis.find(a => a.id === sim.id);
                                return (
                                  <tr key={sim.id} className={`hover:bg-secondary-50 transition-colors duration-200 ${
                                    sim.id === bestSimulation?.id ? 'bg-green-50 border-l-4 border-green-500' : ''
                                  }`}>
                                    <td className="px-6 py-4 text-sm font-bold text-secondary-900">
                                      {sim.target_phone_number}
                                      {sim.id === bestSimulation?.id && (
                                        <span className="ml-3 text-green-700 text-xs font-bold px-3 py-1 rounded-full bg-green-100 border border-green-300">
                                          🏆 TOP PERFORMER
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-secondary-600">
                                      {new Date(sim.date).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getColorClass(sim.overall_score)}`}>
                                        {sim.overall_score.toFixed(1)}/10
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      <span className={`text-sm font-bold ${getPerformanceColor(analysis?.avgResponseTime || 0, 'response_time')}`}>
                                        {analysis?.avgResponseTime.toFixed(2) || 'N/A'}s
                                      </span>
                                    </td>
                                    <td className="px-6 py-4">
                                      {bestSimulation && sim.id !== bestSimulation.id ? (
                                        <span className={`text-sm font-medium ${
                                          sim.overall_score >= bestSimulation.overall_score * 0.9 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {((sim.overall_score / bestSimulation.overall_score) * 100).toFixed(1)}% of best
                                        </span>
                                      ) : (
                                        <span className="text-green-600 font-bold">🎯 Baseline</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'performance' && (
                  <div className="space-y-8">
                    {/* Response Time Distribution */}
                    <ResponseTimeChart data={responseTimeAnalysis} />
                    
                    {/* Additional Performance Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-xl border border-secondary-200 shadow-lg p-6">
                        <h3 className="text-xl font-bold text-secondary-800 mb-4 flex items-center">
                          <ClockIcon className="w-6 h-6 mr-2 text-blue-600" />
                          Call Duration Analysis
                        </h3>
                        <div className="space-y-4">
                          {getSelectedSimulations().map(sim => (
                            <div key={sim.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                              <div>
                                <div className="font-semibold text-secondary-800">{sim.target_phone_number}</div>
                                <div className="text-sm text-secondary-600">Call Duration</div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">
                                  {Math.floor((sim.call_duration || 0) / 60)}:{String((sim.call_duration || 0) % 60).padStart(2, '0')}
                                </div>
                                <div className="text-sm text-secondary-600">minutes</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-secondary-200 shadow-lg p-6">
                        <h3 className="text-xl font-bold text-secondary-800 mb-4 flex items-center">
                          <ArrowTrendingUpIcon className="w-6 h-6 mr-2 text-green-600" />
                          Performance Ranking
                        </h3>
                        <div className="space-y-3">
                          {getSelectedSimulations()
                            .sort((a, b) => b.overall_score - a.overall_score)
                            .map((sim, index) => (
                              <div key={sim.id} className={`flex items-center p-4 rounded-lg ${
                                index === 0 ? 'bg-green-50 border border-green-200' :
                                index === 1 ? 'bg-yellow-50 border border-yellow-200' :
                                index === 2 ? 'bg-orange-50 border border-orange-200' :
                                'bg-secondary-50 border border-secondary-200'
                              }`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white mr-4 ${
                                  index === 0 ? 'bg-green-500' :
                                  index === 1 ? 'bg-yellow-500' :
                                  index === 2 ? 'bg-orange-500' :
                                  'bg-secondary-500'
                                }`}>
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="font-semibold text-secondary-800">{sim.target_phone_number}</div>
                                  <div className="text-sm text-secondary-600">Score: {sim.overall_score.toFixed(1)}/10</div>
                                </div>
                                {index === 0 && <span className="text-2xl">🏆</span>}
                                {index === 1 && <span className="text-2xl">🥈</span>}
                                {index === 2 && <span className="text-2xl">🥉</span>}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'metrics' && (
                  <div className="bg-white rounded-xl border border-secondary-200 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6">
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <CheckCircleIcon className="w-7 h-7 mr-3" />
                        Detailed Metrics Comparison
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                          <thead>
                            <tr className="bg-secondary-50">
                              <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Metric</th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-secondary-700">Type</th>
                              {getSelectedSimulations().map(sim => (
                                <th key={sim.id} className="px-6 py-4 text-center text-sm font-bold text-secondary-700">
                                  {sim.target_phone_number}<br/>
                                  <span className="text-xs font-normal text-secondary-500">
                                    {new Date(sim.date).toLocaleDateString()}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-secondary-200">
                            {uniqueMetrics.map(metric => (
                              <tr key={metric.id} className="hover:bg-secondary-50 transition-colors duration-200">
                                <td className="px-6 py-4 text-sm font-bold text-secondary-900">
                                  {metric.name}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    metric.type === 'task-specific' 
                                      ? 'bg-primary-100 text-primary-800 border border-primary-200' 
                                      : 'bg-secondary-100 text-secondary-800 border border-secondary-200'
                                  }`}>
                                    {metric.type === 'task-specific' ? 'Task-specific' : 'Generic'}
                                  </span>
                                </td>
                                {getSelectedSimulations().map(sim => {
                                  const metricResult = sim.metrics_results.find(m => m.metric_id === metric.id);
                                  return (
                                    <td key={sim.id} className="px-6 py-4 text-center">
                                      {metricResult ? (
                                        <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${getColorClass(metricResult.score)}`}>
                                          {metricResult.score.toFixed(1)}/10
                                        </span>
                                      ) : (
                                        <span className="text-secondary-400 font-medium">N/A</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'transcripts' && (
                  <div className="bg-white rounded-xl border border-secondary-200 shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                      <h2 className="text-2xl font-bold text-white flex items-center">
                        <DocumentTextIcon className="w-7 h-7 mr-3" />
                        Conversation Analysis
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {getSelectedSimulations().slice(0, 2).map(sim => (
                          <div key={sim.id} className="border-2 border-secondary-200 rounded-xl overflow-hidden shadow-lg">
                            <div className="bg-gradient-to-r from-secondary-100 to-secondary-200 p-4 border-b border-secondary-300">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-lg text-secondary-800">{sim.target_phone_number}</div>
                                  <div className="text-sm text-secondary-600">
                                    {new Date(sim.date).toLocaleString()}
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${getColorClass(sim.overall_score)}`}>
                                  Score: {sim.overall_score.toFixed(1)}/10
                                </div>
                              </div>
                            </div>
                            <div className="p-4 max-h-96 overflow-y-auto bg-secondary-50">
                              {sim.transcript.map((line, i) => (
                                <div key={i} className="mb-4 p-3 rounded-lg bg-white shadow-sm border border-secondary-200">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className={`font-bold text-sm px-3 py-1 rounded-full ${
                                      line.speaker === 'agent' ? 'bg-primary-100 text-primary-800' :
                                      line.speaker === 'user' ? 'bg-green-100 text-green-800' :
                                      'bg-secondary-100 text-secondary-800'
                                    }`}>
                                      {line.speaker === 'agent' ? '🤖 Phone Agent' :
                                      line.speaker === 'user' ? '👤 Test Agent' :
                                      '⚙️ System'}
                                    </span>
                                    {line.timestamp && (
                                      <span className="text-xs text-secondary-500 font-mono">
                                        {line.timestamp.toFixed(1)}s
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-secondary-700 leading-relaxed">{line.text}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {getSelectedSimulations().length > 2 && (
                        <div className="mt-6 text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-blue-700 font-medium">
                            📊 Showing 2 of {getSelectedSimulations().length} selected conversations. 
                            Deselect some agents to view different transcripts.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 p-8 rounded-xl shadow-lg text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <p className="text-yellow-800 text-xl font-semibold">Select at least one agent to begin analysis</p>
                <p className="text-yellow-700 mt-2">Choose agents from the selection panel above to compare their performance.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CompareResults; 