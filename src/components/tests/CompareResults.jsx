import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ArrowLeftIcon, ChartBarIcon, DocumentTextIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
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
        transcript: [
          { speaker: 'system', text: 'Call initiated' },
          { speaker: 'agent', text: 'Hello, thank you for calling. How can I help you today?' },
          { speaker: 'user', text: "I'd like to order a pizza for delivery." },
          { speaker: 'agent', text: "I'd be happy to help with that. What type of pizza would you like?" },
          { speaker: 'user', text: "I'd like a large pepperoni pizza with extra cheese." },
          { speaker: 'agent', text: "Great choice! A large pepperoni pizza with extra cheese. Would you like any sides or drinks with that?" },
          { speaker: 'user', text: "Actually, I need to modify that order. Can I change it to a medium instead?" },
          { speaker: 'agent', text: "Absolutely, I can change that to a medium pepperoni pizza with extra cheese. Is there anything else you'd like to modify?" },
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
        transcript: [
          { speaker: 'system', text: 'Call initiated' },
          { speaker: 'agent', text: 'Thank you for calling. What can I do for you?' },
          { speaker: 'user', text: "I'd like to order a pizza for delivery." },
          { speaker: 'agent', text: "Sure, what kind of pizza would you like?" },
          { speaker: 'user', text: "I want a large pepperoni pizza." },
          { speaker: 'agent', text: "A large pepperoni. Anything else?" },
          { speaker: 'user', text: "Actually, I need to change that order. Make it a medium instead." },
          { speaker: 'agent', text: "Ok, changing to a medium pepperoni. Is that all?" },
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
        transcript: [
          { speaker: 'system', text: 'Call initiated' },
          { speaker: 'agent', text: 'Hello, thank you for calling. How may I assist you today?' },
          { speaker: 'user', text: "I'd like to order a pizza for delivery." },
          { speaker: 'agent', text: "I'd be delighted to help you order a pizza for delivery. What type of pizza would you like to order today?" },
          { speaker: 'user', text: "A large pepperoni pizza, please." },
          { speaker: 'agent', text: "Excellent choice! One large pepperoni pizza. May I have your address for delivery?" },
          { speaker: 'user', text: "Actually, I'd like to change my order. Can I get a medium instead of large?" },
          { speaker: 'agent', text: "Absolutely! I've updated your order to a medium pepperoni pizza. Is there anything else you'd like to modify?" },
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
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
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
  
  // Generate and download PDF
  const generatePDF = () => {
    if (!test || selectedSimulations.length === 0) return;
    
    setGeneratingPdf(true);
    
    try {
      // Initialize PDF
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text(`Test Results: ${test.name}`, 14, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);
      
      // Add overall comparison table
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Overall Comparison', 14, 45);
      
      const selectedSims = getSelectedSimulations();
      
      // Overall comparison table
      const overallTableData = selectedSims.map(sim => [
        sim.target_phone_number,
        new Date(sim.date).toLocaleDateString(),
        `${sim.overall_score.toFixed(1)}/10`
      ]);
      
      doc.autoTable({
        startY: 50,
        head: [['Phone Number', 'Date', 'Overall Score']],
        body: overallTableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      // Add metrics comparison
      doc.setFontSize(14);
      doc.text('Metrics Comparison', 14, doc.autoTable.previous.finalY + 15);
      
      // Create metrics table
      const metricsTableHead = ['Metric', 'Type', ...selectedSims.map(sim => 
        `${sim.target_phone_number}\n${new Date(sim.date).toLocaleDateString()}`
      )];
      
      const metricsTableBody = uniqueMetrics.map(metric => {
        const row = [
          metric.name,
          metric.type === 'task-specific' ? 'Task-specific' : 'Generic'
        ];
        
        selectedSims.forEach(sim => {
          const metricResult = sim.metrics_results.find(m => m.metric_id === metric.id);
          row.push(metricResult ? `${metricResult.score.toFixed(1)}/10` : 'N/A');
        });
        
        return row;
      });
      
      doc.autoTable({
        startY: doc.autoTable.previous.finalY + 20,
        head: [metricsTableHead],
        body: metricsTableBody,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      // Add transcript for each simulation
      for (let i = 0; i < selectedSims.length; i++) {
        const sim = selectedSims[i];
        
        // Add page break if not the first transcript and not enough space
        if (i > 0) {
          doc.addPage();
        }
        
        doc.setFontSize(14);
        doc.text(`Transcript: ${sim.target_phone_number}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Date: ${new Date(sim.date).toLocaleString()}`, 14, 30);
        
        const transcriptData = sim.transcript.map(entry => [
          entry.speaker === 'user' ? 'Testing Agent' : entry.speaker === 'agent' ? 'Phoneline Agent' : 'System',
          entry.text
        ]);
        
        doc.autoTable({
          startY: 40,
          head: [['Speaker', 'Text']],
          body: transcriptData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 'auto' }
          }
        });
      }
      
      // Save the PDF
      doc.save(`test-results-${test.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
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
    <div>
      <div className="mb-6">
        <Link to={`/tests/${testId}`} className="text-primary-600 hover:text-primary-800 inline-flex items-center">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Test
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{test.name}</h1>
        <p className="text-secondary-600 mt-1">Compare the results of different test runs</p>
      </div>
      
      {simulations.length === 0 ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">No test simulations available. Run a test first to compare results.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select Simulations to Compare</h2>
              
              {selectedSimulations.length > 0 && (
                <button
                  onClick={generatePDF}
                  disabled={generatingPdf}
                  className="btn btn-secondary inline-flex items-center"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 mr-1" />
                  {generatingPdf ? 'Generating PDF...' : 'Download Results as PDF'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {simulations.map(sim => (
                <div 
                  key={sim.id}
                  className={`border rounded-lg p-4 ${
                    selectedSimulations.includes(sim.id) ? 'border-primary-500 bg-primary-50' : 'border-secondary-200'
                  } cursor-pointer`}
                  onClick={() => handleSimulationToggle(sim.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{sim.target_phone_number}</div>
                    <div className={`px-2 py-1 rounded-full text-sm font-medium ${getColorClass(sim.overall_score)}`}>
                      Score: {sim.overall_score.toFixed(1)}/10
                    </div>
                  </div>
                  <div className="text-sm text-secondary-600">
                    {new Date(sim.date).toLocaleString()}
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-sm">
                      {sim.tasks.length} {sim.tasks.length === 1 ? 'task' : 'tasks'} in flow
                    </div>
                    <input 
                      type="checkbox" 
                      checked={selectedSimulations.includes(sim.id)}
                      onChange={() => {}} // Handled by the div onClick
                      className="h-5 w-5 text-primary-600 focus:ring-primary-500 rounded"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {selectedSimulations.length > 0 ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
                <h2 className="text-xl font-semibold p-6 bg-secondary-50 border-b border-secondary-200">
                  Overall Comparison
                </h2>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">Phone Number</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">Overall Score</th>
                          {bestSimulation && (
                            <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">Comparison</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary-200">
                        {getSelectedSimulations().map(sim => (
                          <tr key={sim.id} className={sim.id === bestSimulation?.id ? 'bg-green-50' : ''}>
                            <td className="px-4 py-3 text-sm font-medium">
                              {sim.target_phone_number}
                              {sim.id === bestSimulation?.id && (
                                <span className="ml-2 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100">
                                  BEST
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-secondary-600">
                              {new Date(sim.date).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-sm font-medium ${getColorClass(sim.overall_score)}`}>
                                {sim.overall_score.toFixed(1)}/10
                              </span>
                            </td>
                            {bestSimulation && (
                              <td className="px-4 py-3 text-sm">
                                {sim.id !== bestSimulation.id ? (
                                  <span className={`${
                                    sim.overall_score >= bestSimulation.overall_score * 0.9 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {((sim.overall_score / bestSimulation.overall_score) * 100).toFixed(1)}% of best
                                  </span>
                                ) : (
                                  <span className="text-green-600">Baseline for comparison</span>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
                <h2 className="text-xl font-semibold p-6 bg-secondary-50 border-b border-secondary-200">
                  Metrics Comparison
                </h2>
                <div className="p-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">Metric</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">Type</th>
                          {getSelectedSimulations().map(sim => (
                            <th key={sim.id} className="px-4 py-3 text-left text-sm font-medium text-secondary-600 bg-secondary-50">
                              {sim.target_phone_number}<br/>
                              <span className="text-xs font-normal">{new Date(sim.date).toLocaleDateString()}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary-200">
                        {uniqueMetrics.map(metric => (
                          <tr key={metric.id}>
                            <td className="px-4 py-3 text-sm font-medium">
                              {metric.name}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className={`
                                px-2 py-0.5 rounded-full
                                ${metric.type === 'task-specific' ? 'bg-primary-100 text-primary-800' : 'bg-secondary-100 text-secondary-800'}
                              `}>
                                {metric.type === 'task-specific' ? 'Task-specific' : 'Generic'}
                              </span>
                            </td>
                            {getSelectedSimulations().map(sim => {
                              const metricResult = sim.metrics_results.find(m => m.metric_id === metric.id);
                              return (
                                <td key={sim.id} className="px-4 py-3">
                                  {metricResult ? (
                                    <span className={`px-2 py-1 rounded text-sm font-medium ${getColorClass(metricResult.score)}`}>
                                      {metricResult.score.toFixed(1)}/10
                                    </span>
                                  ) : (
                                    <span className="text-secondary-400">N/A</span>
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
              
              <div className="bg-white rounded-lg border border-secondary-200 shadow-card overflow-hidden">
                <h2 className="text-xl font-semibold p-6 bg-secondary-50 border-b border-secondary-200 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2" />
                  Transcript Comparison
                </h2>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {getSelectedSimulations().slice(0, 2).map(sim => (
                      <div key={sim.id} className="border border-secondary-200 rounded-lg overflow-hidden">
                        <div className="bg-secondary-50 p-3 border-b border-secondary-200">
                          <div className="font-medium">{sim.target_phone_number}</div>
                          <div className="text-sm text-secondary-600">
                            {new Date(sim.date).toLocaleString()}
                          </div>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                          {sim.transcript.map((line, i) => (
                            <div key={i} className="mb-2">
                              <span className={`font-semibold ${
                                line.speaker === 'agent' ? 'text-primary-700' :
                                line.speaker === 'user' ? 'text-secondary-700' :
                                'text-secondary-500'
                              }`}>
                                {line.speaker === 'agent' ? 'Phoneline Agent: ' :
                                line.speaker === 'user' ? 'Testing Agent: ' :
                                'System: '}
                              </span>
                              <span>{line.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {getSelectedSimulations().length > 2 && (
                    <div className="mt-4 text-center">
                      <p className="text-secondary-600">Showing 2 of {getSelectedSimulations().length} selected simulations. For additional transcripts, deselect some simulations.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-yellow-700">Select at least one simulation to see comparison data.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CompareResults; 