import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PhoneIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

function TestConfiguration({ 
  test, 
  error, 
  selectedPhoneNumber, 
  setSelectedPhoneNumber, 
  running, 
  cleaningMetrics, 
  handleRunTest, 
  handleCleanMetrics,
  testId 
}) {
  const [inputMode, setInputMode] = useState('select');
  const [manualPhoneNumber, setManualPhoneNumber] = useState('');
  
  const handlePhoneNumberChange = (e) => {
    if (inputMode === 'select') {
      setSelectedPhoneNumber(e.target.value);
    } else {
      setManualPhoneNumber(e.target.value);
      setSelectedPhoneNumber(e.target.value);
    }
  };
  
  const handleInputModeChange = (mode) => {
    setInputMode(mode);
    // Reset the selected phone number when switching modes
    if (mode === 'select') {
      setSelectedPhoneNumber('');
    } else {
      setSelectedPhoneNumber(manualPhoneNumber);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-secondary-200 shadow-card p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Test Configuration</h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="mb-6">
        <label className="block mb-2 font-medium">
          Target Phone Number
        </label>
        
        <div className="flex mb-3">
          <div className="mr-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="select"
                checked={inputMode === 'select'}
                onChange={() => handleInputModeChange('select')}
                className="mr-2"
                disabled={running}
              />
              <span>Select from list</span>
            </label>
          </div>
          <div>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="manual"
                checked={inputMode === 'manual'}
                onChange={() => handleInputModeChange('manual')}
                className="mr-2"
                disabled={running}
              />
              <span>Enter manually</span>
            </label>
          </div>
        </div>
        
        {inputMode === 'select' ? (
          <select
            id="phoneNumber"
            value={selectedPhoneNumber}
            onChange={handlePhoneNumberChange}
            className="w-full md:w-1/2 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={running}
          >
            <option value="">Select a phone number</option>
            {test.target_phone_numbers.map((number, index) => (
              <option key={index} value={number}>
                {number}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="manualPhoneNumber"
            type="tel"
            placeholder="Enter phone number (e.g., +1234567890)"
            value={manualPhoneNumber}
            onChange={handlePhoneNumberChange}
            className="w-full md:w-1/2 px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={running}
          />
        )}
        
        <div className="mt-1 text-sm text-secondary-600">
          This is the phone number that the testing agent will call.
        </div>
      </div>
      
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleRunTest}
          className="btn btn-primary inline-flex items-center"
          disabled={running || !selectedPhoneNumber}
        >
          <PhoneIcon className="w-5 h-5 mr-1" />
          {running ? 'Starting Test...' : 'Start Test'}
        </button>
        <button
          type="button"
          onClick={handleCleanMetrics}
          className="btn btn-secondary inline-flex items-center"
          disabled={cleaningMetrics}
        >
          <ArrowPathIcon className="w-5 h-5 mr-1" />
          {cleaningMetrics ? 'Cleaning...' : 'Clean Metrics'}
        </button>
        <Link
          to={`/tests/${testId}`}
          className="btn btn-secondary inline-flex items-center"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

export default TestConfiguration; 