import { useState, useEffect } from 'react';
import { callAnalyticsAPI } from '../../lib/api';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

function CallRecording({ callSid, transcript, metricsResults, testName }) {
  const [recordings, setRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);

  useEffect(() => {
    async function fetchRecordings() {
      if (!callSid) {
        setError('No call SID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching recordings for call SID: ${callSid}`);
        const recordingsData = await callAnalyticsAPI.getRecordings(callSid);
        console.log('Recordings data:', recordingsData);
        
        if (recordingsData && Array.isArray(recordingsData) && recordingsData.length > 0) {
          setRecordings(recordingsData);
          
          // Select the first recording by default
          setSelectedRecording(recordingsData[0]);
          console.log('Selected recording:', recordingsData[0]);
        } else {
          console.log('No recordings found or invalid response format');
          setError('No recordings found for this call');
        }
      } catch (err) {
        console.error('Error fetching recordings:', err);
        setError(`Failed to load recordings: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    if (callSid) {
      fetchRecordings();
    }
  }, [callSid]);

  useEffect(() => {
    async function fetchRecordingAudio() {
      if (!selectedRecording || !selectedRecording.sid) {
        console.log('No recording selected or invalid recording object');
        return;
      }

      try {
        setLoadingAudio(true);
        setError(null);
        const recordingSid = selectedRecording.sid;
        
        // Direct URL to the recording (this is the key change)
        const directUrl = `https://phoneline-dashboard-backend-63qdm.ondigitalocean.app/api/v1/call-analytics/recording/${recordingSid}`;
        console.log('Using direct recording URL:', directUrl);
        
        // Set both the direct URL and create a blob URL for flexibility
        setRecordingUrl(directUrl);
        setAudioUrl(directUrl); // Use direct URL for audio element
        setLoadingAudio(false);
        
      } catch (err) {
        console.error('Error fetching recording audio:', err);
        setError(`Failed to load recording audio: ${err.message}`);
        setLoadingAudio(false);
      }
    }

    fetchRecordingAudio();
  }, [selectedRecording]);

  // Function to retry loading a recording that's still processing
  const retryLoadRecording = async () => {
    if (!selectedRecording || !selectedRecording.sid) return;
    
    try {
      setLoading(true);
      setError(null);
      // Fetch the latest status of this recording
      const recordingsData = await callAnalyticsAPI.getRecordings(callSid);
      if (recordingsData && Array.isArray(recordingsData)) {
        const updatedRecording = recordingsData.find(r => r.sid === selectedRecording.sid);
        if (updatedRecording) {
          setSelectedRecording(updatedRecording);
        }
        setRecordings(recordingsData);
      }
    } catch (err) {
      console.error('Error refreshing recording status:', err);
      setError('Failed to refresh recording status');
    } finally {
      setLoading(false);
    }
  };

  // Add function to handle PDF download
  const handleDownloadPDF = async () => {
    if (!selectedRecording) {
      setError('No recording selected for download');
      return;
    }
    
    setGeneratingPdf(true);
    
    try {
      // Initialize PDF with proper configuration
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title with branded header
      doc.setFillColor(66, 139, 202);
      doc.rect(0, 0, 210, 20, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('Call Recording Report', 105, 12, { align: 'center' });
      
      // Reset text color for rest of document
      doc.setTextColor(0, 0, 0);
      
      // Add recording details
      doc.setFontSize(18);
      doc.text(testName || 'Call Recording', 105, 30, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 105, 38, { align: 'center' });
      doc.text(`Recording Date: ${new Date(selectedRecording.date_created).toLocaleString()}`, 20, 46);
      doc.text(`Recording SID: ${selectedRecording.sid}`, 20, 52);
      doc.text(`Duration: ${selectedRecording.duration} seconds`, 20, 58);
      doc.text(`Status: ${selectedRecording.status}`, 20, 64);
      
      let currentY = 75;
      
      // Add metrics results if available
      if (metricsResults && metricsResults.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Metrics Evaluation', 20, currentY);
        currentY += 10;
        
        const metricsData = metricsResults.map(metric => {
          // Limit details length for better formatting
          let details = metric.details || 'No details available';
          if (details.length > 60) {
            details = details.substring(0, 57) + '...';
          }
          
          return [
            metric.metric_name || 'Unknown Metric',
            metric.metric_type === 'task-specific' ? 'Task-specific' : 'Generic',
            metric.score ? `${parseFloat(metric.score).toFixed(1)}/10` : 'N/A',
            details
          ];
        });
        
        // Use autoTable directly
        autoTable(doc, {
          startY: currentY,
          head: [['Metric', 'Type', 'Score', 'Details']],
          body: metricsData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 }
        });
        
        // Get the final Y position
        currentY = doc.lastAutoTable.finalY + 15;
      }
      
      // Add transcript if available
      if (transcript && transcript.length > 0) {
        // Add a new page if we have metrics (for more space)
        if (metricsResults && metricsResults.length > 0) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Call Transcript', 20, currentY);
        currentY += 10;
        
        // Format transcript data with timestamps
        const transcriptData = transcript.map(entry => {
          const speaker = entry.speaker === 'user' ? 'Customer' : 
                         entry.speaker === 'agent' ? 'Agent' : 
                         entry.speaker === 'system' ? 'System' : 
                         entry.speaker;
          
          // Format timestamp if available
          const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '';
          
          return [timestamp, speaker, entry.text || ''];
        });
        
        // Use autoTable directly
        autoTable(doc, {
          startY: currentY,
          head: [['Time', 'Speaker', 'Message']],
          body: transcriptData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] },
          margin: { left: 20, right: 20 },
          styles: { overflow: 'linebreak', cellWidth: 'wrap' },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 'auto' }
          }
        });
      }
      
      // Save the PDF with a descriptive filename
      const filename = `Call_Recording_${selectedRecording.sid}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(filename);
      
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(`Failed to generate PDF: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading && !recordings.length) {
    return <div className="text-secondary-600">Loading recordings...</div>;
  }

  if (error && !recordings.length) {
    return <div className="text-red-600">{error}</div>;
  }

  if (!recordings.length) {
    return <div className="text-secondary-600">No recordings available</div>;
  }

  // Check if the selected recording is still processing
  const isRecordingProcessing = selectedRecording && 
    (selectedRecording.status === 'processing' || 
     selectedRecording.status === 'queued' || 
     selectedRecording.duration <= 0);

  return (
    <div className="space-y-4">
      {/* Recording selector */}
      <div className="flex flex-wrap gap-2">
        {recordings.map((recording) => (
          <button
            key={recording.sid}
            onClick={() => setSelectedRecording(recording)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedRecording?.sid === recording.sid
                ? 'bg-primary-600 text-white'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            {new Date(recording.date_created).toLocaleTimeString()} 
            {recording.status === 'completed' 
              ? `(${recording.duration}s)` 
              : `(${recording.status})`}
          </button>
        ))}
      </div>

      {/* Processing status message */}
      {isRecordingProcessing && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div>
              <p className="text-sm text-yellow-700">
                This recording is still being processed and is not available for playback yet.
              </p>
              <button 
                onClick={retryLoadRecording}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Check again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio player - show loading state */}
      {loadingAudio && !isRecordingProcessing && (
        <div className="text-secondary-600">Loading audio...</div>
      )}
      
      {/* Show error for audio specifically */}
      {error && recordings.length > 0 && !isRecordingProcessing && (
        <div className="text-red-600 mb-2">{error}</div>
      )}

      {/* Audio player with fallback - only show for completed recordings */}
      {!loadingAudio && !isRecordingProcessing && (
        <div className="w-full">
          {audioUrl ? (
            <audio
              controls
              className="w-full"
              src={audioUrl}
              onError={(e) => {
                console.error('Audio player error:', e);
                setError('Audio playback failed. Trying direct URL...');
                setAudioUrl(null);
              }}
            >
              Your browser does not support the audio element.
            </audio>
          ) : recordingUrl ? (
            <div>
              <p className="text-sm text-secondary-600 mb-2">Using direct URL fallback:</p>
              <audio
                controls
                className="w-full"
                src={recordingUrl}
                onError={(e) => {
                  console.error('Direct URL audio player error:', e);
                  setError('Audio playback failed with direct URL. Please try again later.');
                }}
              >
                Your browser does not support the audio element.
              </audio>
              <p className="text-xs text-blue-600 mt-1">
                <a href={recordingUrl} target="_blank" rel="noopener noreferrer">
                  Open audio in new tab
                </a>
              </p>
            </div>
          ) : (
            <div className="text-secondary-600">Audio not available</div>
          )}
        </div>
      )}

      {/* Recording details and download button */}
      {selectedRecording && (
        <div>
          <div className="text-sm text-secondary-600">
            <p>Recording SID: {selectedRecording.sid}</p>
            <p>Duration: {selectedRecording.duration > 0 ? `${selectedRecording.duration} seconds` : 'Not available yet'}</p>
            <p>Status: <span className={
              selectedRecording.status === 'completed' ? 'text-green-600 font-medium' : 
              selectedRecording.status === 'processing' ? 'text-yellow-600 font-medium' : 
              'text-secondary-600'
            }>{selectedRecording.status}</span></p>
            <p>Created: {new Date(selectedRecording.date_created).toLocaleString()}</p>
          </div>
          
          {/* Download PDF button */}
          {!isRecordingProcessing && (
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={generatingPdf}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                {generatingPdf ? 'Generating PDF...' : 'Download Report'}
              </button>
              
              {pdfSuccess && (
                <span className="text-green-600 text-sm">
                  PDF downloaded successfully!
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CallRecording; 