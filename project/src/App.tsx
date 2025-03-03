import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, Database, HardDrive } from 'lucide-react';

function App() {
  const [file, setFile] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [requestId, setRequestId] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusPolling, setStatusPolling] = useState(false);
  const [dbStatus, setDbStatus] = useState({ connected: false, checked: false });

  // Check database connection status
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const response = await fetch('/api/status/health');
        const data = await response.json();
        setDbStatus({ connected: data.dbConnected, checked: true });
      } catch (err) {
        // If we can't reach the API, assume we're in development mode without MongoDB
        setDbStatus({ connected: false, checked: true });
        console.log('Could not check database status, assuming in-memory mode');
      }
    };
    
    checkDbStatus();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid CSV file');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (webhookUrl) {
        formData.append('webhookUrl', webhookUrl);
      }
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setRequestId(data.requestId);
      setStatusPolling(true);
    } catch (err) {
      setError(err.message || 'An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  // Check status of a request
  const checkStatus = async () => {
    if (!requestId) return;
    
    try {
      const response = await fetch(`/api/status/${requestId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }
      
      setStatus(data);
      
      // Stop polling if processing is complete or failed
      if (data.status === 'completed' || data.status === 'failed') {
        setStatusPolling(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to check status');
      setStatusPolling(false);
    }
  };

  // Poll for status updates
  useEffect(() => {
    let interval;
    
    if (statusPolling) {
      // Check immediately
      checkStatus();
      
      // Then set up polling
      interval = setInterval(checkStatus, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [statusPolling, requestId]);

  // Reset the form
  const handleReset = () => {
    setFile(null);
    setWebhookUrl('');
    setRequestId('');
    setStatus(null);
    setError('');
    setStatusPolling(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Image Processing System</h1>
        
        {dbStatus.checked && (
          <div className={`mb-4 p-3 rounded-md flex items-center ${dbStatus.connected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {dbStatus.connected ? (
              <>
                <Database className="w-5 h-5 mr-2" />
                <span>Connected to MongoDB database</span>
              </>
            ) : (
              <>
                <HardDrive className="w-5 h-5 mr-2" />
                <span>Running in memory-only mode (data will not persist after restart)</span>
              </>
            )}
          </div>
        )}
        
        {!requestId ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">CSV files only</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv" 
                    onChange={handleFileChange} 
                  />
                </label>
              </div>
              {file && (
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <FileText className="w-4 h-4 mr-2" />
                  <span>{file.name}</span>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL (Optional)
              </label>
              <input
                type="url"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://your-webhook-endpoint.com/callback"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                If provided, we'll send a notification when processing is complete
              </p>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload and Process'
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 text-green-700 rounded-md">
              <h2 className="text-lg font-medium flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                File Uploaded Successfully
              </h2>
              <p className="mt-1">Your request ID: <span className="font-mono font-medium">{requestId}</span></p>
              <p className="text-sm mt-2">Keep this ID to check the status of your request.</p>
            </div>
            
            {status && (
              <div className="border border-gray-200 rounded-md p-4">
                <h3 className="font-medium text-gray-900 mb-2">Processing Status</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${
                      status.status === 'completed' ? 'text-green-600' : 
                      status.status === 'failed' ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Progress:</span>
                    <span className="font-medium">{status.progress}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${status.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Items Processed:</span>
                    <span className="font-medium">{status.processedItems} / {status.totalItems}</span>
                  </div>
                  
                  {status.status === 'completed' && status.outputFileName && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        Processing complete! Your output file is ready.
                      </p>
                      <a 
                        href={`/uploads/${status.outputFileName}`} 
                        download
                        className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Download Output CSV
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {statusPolling && (
              <div className="flex items-center justify-center text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Updating status...
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                onClick={checkStatus}
                disabled={statusPolling}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Refresh Status
              </button>
              
              <button
                onClick={handleReset}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Process Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;