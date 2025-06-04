import React, { useState, useEffect } from 'react';

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  businessType: string;
  stage: string;
  score: number;
  priority: string;
}

interface ClientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientSelect: (client: Client) => void;
  datetime: string;
}

export default function ClientSearchModal({ isOpen, onClose, onClientSelect, datetime }: ClientSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    notes: ''
  });

  // Search for existing clients
  useEffect(() => {
    const searchClients = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/clients/search?q=${encodeURIComponent(searchQuery)}&token=pleasantcove2024admin`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Failed to search clients:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchClients, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleCreateNewClient = async () => {
    if (!newClientData.name.trim()) {
      alert('Please enter a client name');
      return;
    }

    try {
      setLoading(true);
      
      // Create new business/client
      const businessResponse = await fetch('/api/businesses?token=pleasantcove2024admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClientData.name,
          email: newClientData.email,
          phone: newClientData.phone,
          address: 'To be updated',
          city: 'To be updated',
          state: 'To be updated',
          businessType: newClientData.businessType || 'consultation',
          stage: 'scheduled',
          notes: newClientData.notes || 'Created for manual appointment',
          priority: 'medium',
          score: 75
        }),
      });

      if (!businessResponse.ok) {
        throw new Error('Failed to create client');
      }

      const newBusiness = await businessResponse.json();
      
      // Convert to client format and select
      const newClient: Client = {
        id: newBusiness.id,
        name: newBusiness.name,
        email: newBusiness.email || '',
        phone: newBusiness.phone || '',
        businessType: newBusiness.businessType || 'consultation',
        stage: newBusiness.stage || 'scheduled',
        score: newBusiness.score || 75,
        priority: newBusiness.priority || 'medium'
      };

      onClientSelect(newClient);
      handleClose();
    } catch (error) {
      console.error('Failed to create new client:', error);
      alert('Failed to create new client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateNew(false);
    setNewClientData({ name: '', email: '', phone: '', businessType: '', notes: '' });
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'contacted': return 'text-purple-600 bg-purple-100';
      case 'responded': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-lg font-bold mb-4">
          📅 Select Client for Appointment
        </h2>
        
        <div className="text-sm text-gray-600 mb-4 p-2 bg-blue-50 rounded">
          <strong>Appointment Time:</strong> {new Date(datetime).toLocaleString()}
        </div>

        {!showCreateNew ? (
          <>
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Search clients by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto mb-4">
              {loading && (
                <div className="text-center py-4 text-gray-500">Searching...</div>
              )}
              
              {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No clients found. Try a different search term.
                </div>
              )}
              
              {searchResults.map((client) => (
                <div
                  key={client.id}
                  className="border rounded-lg p-3 mb-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onClientSelect(client);
                    handleClose();
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{client.name}</h3>
                      <div className="text-sm text-gray-600">
                        {client.email && <div>📧 {client.email}</div>}
                        {client.phone && <div>📞 {client.phone}</div>}
                        {client.businessType && <div>🏢 {client.businessType}</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-4">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(client.priority)}`}>
                        {client.priority} priority
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getStageColor(client.stage)}`}>
                        {client.stage}
                      </span>
                      <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                        Score: {client.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setShowCreateNew(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                + Create New Client
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Create New Client Form */}
            <h3 className="text-md font-semibold mb-4">Create New Client</h3>
            
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                  placeholder="client@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2"
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Business Type</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={newClientData.businessType}
                  onChange={(e) => setNewClientData({...newClientData, businessType: e.target.value})}
                >
                  <option value="">Select business type</option>
                  <option value="consultation">Consultation</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="hvac">HVAC</option>
                  <option value="roofing">Roofing</option>
                  <option value="construction">Construction</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={newClientData.notes}
                  onChange={(e) => setNewClientData({...newClientData, notes: e.target.value})}
                  placeholder="Add any notes about this client"
                />
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowCreateNew(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                ← Back to Search
              </button>
              <div className="space-x-2">
                <button
                  onClick={handleClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNewClient}
                  disabled={loading || !newClientData.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded"
                >
                  {loading ? 'Creating...' : 'Create & Schedule'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 