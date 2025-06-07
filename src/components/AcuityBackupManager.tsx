import React, { useState, useEffect } from 'react';
import { Calendar, RefreshCw, CheckCircle, AlertCircle, Clock, Settings, Shield } from 'lucide-react';

interface SyncStatus {
  configured: boolean;
  credentialsSet: boolean;
  lastSync: string | null;
  continuousSyncEnabled: boolean;
  syncInterval: number;
}

export default function AcuityBackupManager() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/acuity/status?token=pleasantcove2024admin`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching Acuity status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <h3 className="text-lg font-semibold">Loading Acuity Status...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Appointment Backup System</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Connection Status */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          {status?.credentialsSet ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          )}
          <div>
            <div className="font-medium text-sm text-gray-900">API Connection</div>
            <div className={`text-xs ${status?.credentialsSet ? 'text-green-600' : 'text-yellow-600'}`}>
              {status?.credentialsSet ? 'Connected' : 'Setup Required'}
            </div>
          </div>
        </div>

        {/* Auto Sync Status */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <div className="font-medium text-sm text-gray-900">Auto Sync</div>
            <div className="text-xs text-blue-600">
              Every {status?.syncInterval || 15} minutes
            </div>
          </div>
        </div>

        {/* Last Sync */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Calendar className="w-5 h-5 text-gray-600" />
          <div>
            <div className="font-medium text-sm text-gray-900">Last Sync</div>
            <div className="text-xs text-gray-600">
              {status?.lastSync ? new Date(status.lastSync).toLocaleString() : 'In progress...'}
            </div>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      {!status?.credentialsSet && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 mb-2">Setup Required</h4>
              <p className="text-sm text-yellow-700 mb-3">
                To enable automatic appointment recovery, add your Acuity API credentials to the <code className="bg-yellow-100 px-1 rounded">.env</code> file:
              </p>
              <div className="bg-yellow-100 p-3 rounded text-xs font-mono text-yellow-800">
                ACUITY_USER_ID=your_user_id<br/>
                ACUITY_API_KEY=your_api_key
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                Get your credentials from: <a href="https://acuityscheduling.com/api" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Acuity API Settings</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Status */}
      {status?.credentialsSet && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800 mb-2">✅ Fully Automatic</h4>
              <p className="text-sm text-green-700">
                Your appointment backup system is running automatically every 15 minutes. 
                Any appointments missed due to server downtime will be automatically recovered.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 