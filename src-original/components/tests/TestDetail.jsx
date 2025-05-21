import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { testsAPI, tasksAPI, metricsAPI } from '../../lib/api';
import { 
  PencilSquareIcon as PencilAltIcon, 
  TrashIcon, 
  PlayIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import CallRecording from '../common/CallRecording';

// Mock data for recent simulations
const MOCK_RECENT_RUNS = [
  {
    id: 'sim_1234567890',
    target_phone_number: '+1234567890',
    date: '2023-06-10T14:30:00Z',
    status: 'completed',
    overall_score: 8.5,
    tasks: ['task1', 'task2', 'task3'],
    metrics_count: 8
  },
  {
    id: 'sim_0987654321',
    target_phone_number: '+1987654321',
    date: '2023-06-09T11:20:00Z',
    status: 'completed',
    overall_score: 7.2,
    tasks: ['task1', 'task2', 'task3'],
    metrics_count: 8
  }
];

function TestDetail() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { currentOrganizationUsername } = useApp();
  
  const [test, setTest] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingMetrics, setRefreshingMetrics] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  
  const fetchTestDetails = async () => {
    if (!currentOrganizationUsername || !testId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Fetch test data
      const testData = await testsAPI.getTest(currentOrganizationUsername, testId);
      setTest(testData);
      
      // Fetch associated tasks and metrics
      const [taskDetails, metricDetails] = await Promise.all([
        Promise.all(testData.tasks.map(taskId => 
          tasksAPI.getTask(currentOrganizationUsername, taskId)
        )),
        Promise.all(testData.metrics.map(metricId => 
          metricsAPI.getMetric(currentOrganizationUsername, metricId)
        ))
      ]);
      
      setTasks(taskDetails);
      setMetrics(metricDetails);
      
      // Fetch recent test runs
      try {
        // Try to fetch real test run data
        const testRuns = await testsAPI.getTestRuns(currentOrganizationUsername, testId);
        
        if (testRuns && testRuns.length > 0) {
          // For each test run, fetch additional details if needed
          const detailedRuns = await Promise.all(
            testRuns.map(async (run) => {
              // If run details are already present, return as is
              if (run.transcript && run.metrics_results) {
                return run;
              }
              
              try {
                // Otherwise fetch detailed run data
                const runDetails = await testsAPI.getTestRunDetails(
                  currentOrganizationUsername, 
                  testId, 
                  run.id
                );
                return runDetails || run;
              } catch (detailError) {
                console.warn(`Could not fetch details for run ${run.id}:`, detailError);
                return run;
              }
            })
          );
          
          setRecentRuns(detailedRuns);
        } else {
          // Fallback to mock data for development/demo purposes
          console.log('No real test runs found, using mock data for development');
          setRecentRuns(MOCK_RECENT_RUNS);
        }
      } catch (runsError) {
        console.warn('Error fetching test runs, using mock data:', runsError);
        setRecentRuns(MOCK_RECENT_RUNS);
      }
    } catch (err) {
      console.error('Error fetching test details:', err);
      setError(err.message || 'Failed to load test details');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTestDetails();
  }, [currentOrganizationUsername, testId]);
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    
    try {
      await testsAPI.deleteTest(currentOrganizationUsername, testId);
      navigate('/tests');
    } catch (err) {
      console.error('Error deleting test:', err);
      setError(err.message || 'Failed to delete test');
    }
  };
  
  const handleRefreshMetrics = async () => {
    if (!currentOrganizationUsername || !testId || !test) return;
    
    try {
      setRefreshingMetrics(true);
      setRefreshMessage(null);
      
      // Get all available metrics to see what's new
      const allMetrics = await metricsAPI.getMetrics(currentOrganizationUsername);
      
      // Auto-select all generic metrics not already in the test
      const genericMetrics = allMetrics.filter(metric => metric.type !== 'task-specific');
      const existingMetricIds = new Set(test.metrics);
      const newGenericMetricIds = genericMetrics
        .filter(metric => !existingMetricIds.has(metric.id))
        .map(metric => metric.id);
      
      let metricChanges = 0;
      
      // If we found new generic metrics, add them to the test
      if (newGenericMetricIds.length > 0) {
        console.log("Adding new generic metrics to test:", newGenericMetricIds);
        
        // Add each new generic metric to the test
        await Promise.all(newGenericMetricIds.map(metricId => 
          testsAPI.addMetricToTest(currentOrganizationUsername, testId, metricId)
        ));
        
        metricChanges += newGenericMetricIds.length;
      }
      
      // Check for new task-specific metrics for each task
      if (tasks.length > 0) {
        for (const task of tasks) {
          // Get latest task-specific metrics for this task
          const taskSpecificMetrics = await metricsAPI.getTaskSpecificMetrics(
            currentOrganizationUsername, 
            task.id
          );
          
          // Find task-specific metrics not already in the test
          const newTaskSpecificMetricIds = taskSpecificMetrics
            .filter(metric => !existingMetricIds.has(metric.id))
            .map(metric => metric.id);
          
          // If we found new task-specific metrics, add them to the test
          if (newTaskSpecificMetricIds.length > 0) {
            console.log(`Adding new task-specific metrics for task ${task.id}:`, newTaskSpecificMetricIds);
            
            // Add each new task-specific metric to the test
            await Promise.all(newTaskSpecificMetricIds.map(metricId => 
              testsAPI.addMetricToTest(currentOrganizationUsername, testId, metricId)
            ));
            
            metricChanges += newTaskSpecificMetricIds.length;
          }
        }
      }
      
      // Refresh the test details to reflect the changes
      await fetchTestDetails();
      
      // Display appropriate message
      if (metricChanges > 0) {
        setRefreshMessage({
          type: 'success',
          text: `Added ${metricChanges} new metric${metricChanges > 1 ? 's' : ''} to the test.`
        });
      } else {
        setRefreshMessage({
          type: 'info',
          text: 'No new metrics were found.'
        });
      }
    } catch (err) {
      console.error('Error refreshing metrics:', err);
      setRefreshMessage({
        type: 'error',
        text: 'Failed to refresh metrics. Please try again.'
      });
    } finally {
      setRefreshingMetrics(false);
      
      // Clear the message after 5 seconds
      setTimeout(() => {
        setRefreshMessage(null);
      }, 5000);
    }
  };
  
  const getScoreClass = (score) => {
    if (score >= 8) return 'bg-green-100 text-green-800';
    if (score >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  // Generate and download PDF of test results
  const handleDownloadPDF = async (run) => {
    if (!run || !test) {
      setError('No test run data available for download');
      return;
    }
    
    setGeneratingPdf(true);
    
    try {
      // Initialize PDF with better configuration
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title with test name and branded header
      doc.setFillColor(66, 139, 202);
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Test Results Report', 105, 12, { align: 'center' });
      
      // Reset text color for rest of document
      doc.setTextColor(0, 0, 0);
      
      // Add test details
      doc.setFontSize(18);
      doc.text(`${test.name}`, 105, 30, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 38, { align: 'center' });
      doc.text(`Test Run Date: ${new Date(run.date).toLocaleString()}`, 20, 46);
      doc.text(`Phone Number: ${run.target_phone_number}`, 20, 52);
      
      // Add overall score
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Overall Results', 105, 65, { align: 'center' });
      
      // Score summary table
      doc.autoTable({
        startY: 70,
        head: [['Overall Score', 'Tasks Completed', 'Metrics Evaluated']],
        body: [[
          `${run.overall_score.toFixed(1)}/10`,
          `${run.tasks.filter(t => t.completed).length}/${run.tasks.length}`,
          `${run.metrics_count || metrics.length}`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
        styles: { halign: 'center' },
        margin: { left: 20, right: 20 }
      });
      
      // Add tasks section if available
      if (run.tasks && run.tasks.length > 0) {
        doc.setFontSize(14);
        doc.text('Task Performance', 20, doc.autoTable.previous.finalY + 15);
        
        const tasksData = run.tasks.map((task, index) => {
          let taskName = task.name || `Task ${index + 1}`;
          // Limit task name length for PDF
          if (taskName.length > 40) {
            taskName = taskName.substring(0, 37) + '...';
          }
          
          return [
            index + 1,
            taskName,
            task.completed ? 'Completed' : 'Not Completed',
            task.score ? `${task.score.toFixed(1)}/10` : 'N/A'
          ];
        });
        
        doc.autoTable({
          startY: doc.autoTable.previous.finalY + 20,
          head: [['#', 'Task Name', 'Status', 'Score']],
          body: tasksData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 }
        });
      }
      
      // Add metrics results if available
      const metricResults = run.metrics_results || [];
      if (metricResults.length > 0) {
        doc.setFontSize(14);
        doc.text('Metrics Evaluation', 20, doc.autoTable.previous.finalY + 15);
        
        const metricsData = metricResults.map(metric => {
          // Limit details length for better formatting
          let details = metric.details || 'No details available';
          if (details.length > 60) {
            details = details.substring(0, 57) + '...';
          }
          
          return [
            metric.metric_name,
            metric.metric_type === 'task-specific' ? 'Task-specific' : 'Generic',
            `${metric.score.toFixed(1)}/10`,
            details
          ];
        });
        
        doc.autoTable({
          startY: doc.autoTable.previous.finalY + 20,
          head: [['Metric', 'Type', 'Score', 'Details']],
          body: metricsData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 35 },
            2: { cellWidth: 20 },
            3: { cellWidth: 'auto' }
          }
        });
      }
      
      // Add transcript if available
      if (run.transcript && run.transcript.length > 0) {
        // Add a new page for transcript
        doc.addPage();
        
        // Add transcript header with styling
        doc.setFillColor(66, 139, 202);
        doc.rect(0, 0, 210, 20, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text('Transcript', 105, 12, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`Test: ${test.name}`, 20, 30);
        doc.text(`Date: ${new Date(run.date).toLocaleString()}`, 20, 38);
        
        // Format transcript data with better labels and handling of long text
        const transcriptData = run.transcript.map(entry => {
          const speaker = entry.speaker === 'user' ? 'User' : 
                         entry.speaker === 'agent' ? 'Agent' : 
                         entry.speaker === 'system' ? 'System' : 
                         entry.speaker;
          
          // Format text for better readability in PDF
          let text = entry.text || '';
          
          return [speaker, text];
        });
        
        doc.autoTable({
          startY: 46,
          head: [['Speaker', 'Text']],
          body: transcriptData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
          },
          styles: { overflow: 'linebreak', cellPadding: 4 },
          rowPageBreak: 'auto'
        });
      }
      
      // Add a footer with page numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${totalPages}`, 105, 290, { align: 'center' });
      }
      
      // Save the PDF with a well-formatted name
      const dateStr = new Date(run.date).toISOString().slice(0, 10);
      const fileName = `test-result-${test.name.replace(/\s+/g, '-')}-${dateStr}.pdf`.toLowerCase();
      doc.save(fileName);
      
      // Show success notification
      setPdfSuccess(true);
      
      // Hide success notification after 5 seconds
      setTimeout(() => {
        setPdfSuccess(false);
      }, 5000);
      
      // Log success message
      console.log('PDF successfully generated and downloaded');
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };
  
  if (!currentOrganizationUsername) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Test Details</h1>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-yellow-700">Please select an organization to view this test.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Test Details</h1>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Test Details</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <p className="text-red-700">{error}</p>
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
  
  if (!test) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Test Details</h1>
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
        <Link to="/tests" className="text-primary-600 hover:text-primary-800 inline-flex items-center">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Tests
        </Link>
      </div>
      
      <div className="flex flex-wrap justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{test.name}</h1>
          <p className="text-secondary-600 mt-1">{test.description}</p>
          <div className="text-sm text-secondary-500 mt-2">
            Created {new Date(test.created_at).toLocaleString()}
          </div>
        </div>
        
        <div className="flex gap-3 mt-3 md:mt-0">
          <Link
            to={`/tests/${testId}/edit`}
            className="btn btn-primary inline-flex items-center"
          >
            <PencilAltIcon className="w-5 h-5 mr-1" />
            Edit
          </Link>
          <Link
            to={`/tests/${testId}/run`}
            className="btn btn-success inline-flex items-center"
          >
            <PlayIcon className="w-5 h-5 mr-1" />
            Run Test
          </Link>
          <Link
            to={`/tests/${testId}/compare`}
            className="btn btn-secondary inline-flex items-center"
          >
            <ChartBarIcon className="w-5 h-5 mr-1" />
            Compare
          </Link>
          <button
            onClick={handleDelete}
            className="btn btn-danger inline-flex items-center"
          >
            <TrashIcon className="w-5 h-5 mr-1" />
            Delete
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">System Prompt</h3>
            <div className="bg-secondary-50 rounded-md p-3 whitespace-pre-wrap">
              {test.system_prompt}
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Target Phone Numbers</h3>
            <ul className="bg-secondary-50 rounded-md p-3">
              {test.target_phone_numbers.map((number, index) => (
                <li key={index} className="flex items-center mb-2 last:mb-0">
                  <CheckCircleIcon className="w-5 h-5 text-success-500 mr-2" />
                  {number}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6">
          <h2 className="text-lg font-semibold mb-4">Test Flow Components</h2>
          
          <div className="mb-4">
            <h3 className="font-medium mb-2">Tasks in Flow ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <div className="text-secondary-600 italic">No tasks defined for this test flow.</div>
            ) : (
              <ul className="bg-secondary-50 rounded-md p-3">
                {tasks.map((task, index) => (
                  <li key={task.id} className="mb-2 last:mb-0">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center w-5 h-5 mr-2 rounded-full bg-primary-100 text-primary-800 text-xs font-medium">
                        {index + 1}
                      </span>
                      <Link 
                        to={`/tasks/${task.id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        {task.name}
                      </Link>
                    </div>
                    <p className="text-sm text-secondary-600 line-clamp-1 ml-7">
                      {task.description}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Metrics ({metrics.length})</h3>
            {metrics.length === 0 ? (
              <div className="text-secondary-600 italic">No metrics associated with this test.</div>
            ) : (
              <ul className="bg-secondary-50 rounded-md p-3">
                {metrics.map(metric => (
                  <li key={metric.id} className="mb-2 last:mb-0">
                    <Link 
                      to={`/metrics/${metric.id}`}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {metric.name}
                    </Link>
                    <div className="flex items-center">
                      <span className={`
                        text-xs rounded px-2 py-0.5 mr-2
                        ${metric.type === 'task-specific' 
                          ? 'bg-primary-100 text-primary-800' 
                          : 'bg-secondary-100 text-secondary-800'}
                      `}>
                        {metric.type === 'task-specific' ? 'Task-specific' : 'Generic'}
                      </span>
                      <p className="text-sm text-secondary-600 line-clamp-1">
                        {metric.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/tests/${testId}/run`}
            className="btn btn-primary inline-flex items-center"
          >
            <PlayIcon className="w-5 h-5 mr-1" />
            Run Test
          </Link>
          
          <Link
            to={`/tests/${testId}/compare`}
            className="btn btn-secondary inline-flex items-center"
          >
            <ChartBarIcon className="w-5 h-5 mr-1" />
            Compare Results
          </Link>
          
          {recentRuns.length > 0 && (
            <button
              onClick={() => handleDownloadPDF(recentRuns[0])}
              disabled={generatingPdf}
              className="btn btn-info inline-flex items-center"
            >
              <DocumentArrowDownIcon className="w-5 h-5 mr-1" />
              {generatingPdf ? 'Generating PDF...' : 'Download Latest Results'}
            </button>
          )}
          
          <Link
            to={`/tests/${testId}/edit`}
            className="btn btn-outline inline-flex items-center"
          >
            <PencilAltIcon className="w-5 h-5 mr-1" />
            Edit Test
          </Link>
          
          <button
            onClick={handleDelete}
            className="btn btn-danger inline-flex items-center"
          >
            <TrashIcon className="w-5 h-5 mr-1" />
            Delete Test
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Recent Test Runs</h2>
        
        {pdfSuccess && (
          <div className="mb-4 p-3 rounded border bg-green-50 border-green-200 text-green-700 flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
              PDF successfully generated and downloaded.
            </div>
            <button 
              onClick={() => setPdfSuccess(false)}
              className="text-green-700 hover:text-green-900 focus:outline-none"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {recentRuns.length === 0 ? (
          <div className="bg-secondary-50 rounded-md p-8 text-center">
            <p className="text-secondary-600 italic">No test runs yet. Run this test to see results.</p>
            <Link
              to={`/tests/${testId}/run`}
              className="btn btn-primary inline-flex items-center mt-4"
            >
              <PlayIcon className="w-5 h-5 mr-1" />
              Run Test
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Tasks in Flow
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Metrics
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 text-sm text-secondary-600">
                      {new Date(run.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {run.target_phone_number}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreClass(run.overall_score)}`}>
                        {run.overall_score.toFixed(1)}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {run.tasks.length}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {run.metrics_count}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          to={`/tests/${testId}/compare`} 
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View Details
                        </Link>
                        <button
                          onClick={() => handleDownloadPDF(run)}
                          disabled={generatingPdf}
                          className={`flex items-center ${
                            generatingPdf ? 'text-gray-400' : 'text-secondary-600 hover:text-secondary-900'
                          }`}
                          title="Download test results as PDF"
                        >
                          {generatingPdf ? (
                            <>
                              <ArrowPathIcon className="w-5 h-5 animate-spin mr-1" />
                              <span className="sr-only">Generating PDF...</span>
                            </>
                          ) : (
                            <>
                              <DocumentArrowDownIcon className="w-5 h-5 mr-1" />
                              <span className="hidden sm:inline">Download PDF</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Metrics</h2>
          <button 
            onClick={handleRefreshMetrics}
            className="btn btn-sm btn-secondary inline-flex items-center"
            disabled={refreshingMetrics}
          >
            <ArrowPathIcon className={`w-4 h-4 mr-1 ${refreshingMetrics ? 'animate-spin' : ''}`} />
            {refreshingMetrics ? 'Refreshing...' : 'Refresh Metrics'}
          </button>
        </div>
        
        {refreshMessage && (
          <div className={`mb-4 p-3 rounded border ${
            refreshMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
            refreshMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
            'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            {refreshMessage.text}
          </div>
        )}
        
        {metrics.length === 0 ? (
          <div className="text-secondary-600 italic">No metrics associated with this test.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-2">Generic Metrics</h3>
              <ul className="bg-secondary-50 rounded-md p-3">
                {metrics.filter(m => m.type !== 'task-specific').map(metric => (
                  <li key={metric.id} className="mb-2 last:mb-0">
                    <Link 
                      to={`/metrics/${metric.id}`}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {metric.name}
                    </Link>
                    <p className="text-sm text-secondary-600 line-clamp-1">
                      {metric.description}
                    </p>
                  </li>
                ))}
                {metrics.filter(m => m.type !== 'task-specific').length === 0 && (
                  <li className="text-secondary-600 italic">No generic metrics</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Task-Specific Metrics</h3>
              <ul className="bg-secondary-50 rounded-md p-3">
                {metrics.filter(m => m.type === 'task-specific').map(metric => (
                  <li key={metric.id} className="mb-2 last:mb-0">
                    <Link 
                      to={`/metrics/${metric.id}`}
                      className="text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {metric.name}
                    </Link>
                    <p className="text-sm text-secondary-600 line-clamp-1">
                      {metric.description}
                    </p>
                  </li>
                ))}
                {metrics.filter(m => m.type === 'task-specific').length === 0 && (
                  <li className="text-secondary-600 italic">No task-specific metrics</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {recentRuns.map((run) => (
        <div key={run.id} className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">Test Run: {new Date(run.date).toLocaleString()}</h3>
              <p className="text-secondary-600">Phone: {run.target_phone_number}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadPDF(run)}
                className="btn btn-secondary inline-flex items-center"
                disabled={generatingPdf}
              >
                <DocumentArrowDownIcon className="w-5 h-5 mr-1" />
                {generatingPdf ? 'Generating...' : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* Add Call Recording section if call_sid exists */}
          {run.call_sid && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Call Recording</h3>
              <CallRecording 
                callSid={run.call_sid} 
                transcript={run.transcript} 
                metricsResults={run.metrics_results} 
                testName={test.name}
              />
            </div>
          )}

          {/* Rest of the run details */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {run.tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="px-4 py-3 text-sm text-secondary-600">
                      {task.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {task.completed ? 'Completed' : 'Not Completed'}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-900">
                      {task.score ? `${task.score.toFixed(1)}/10` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TestDetail; 
