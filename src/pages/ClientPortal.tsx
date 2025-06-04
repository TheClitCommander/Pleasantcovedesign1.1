import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Building2, 
  MessageSquare, 
  FileText, 
  Clock, 
  DollarSign, 
  Send,
  Download,
  AlertCircle,
  CheckCircle,
  Globe
} from 'lucide-react';

interface Project {
  id: number;
  title: string;
  type: string;
  stage: string;
  totalAmount?: number;
  paidAmount?: number;
  createdAt?: string;
}

interface Company {
  name: string;
  email?: string;
  phone: string;
}

interface ProjectMessage {
  id: number;
  projectId: number;
  senderType: 'admin' | 'client';
  senderName: string;
  content: string;
  attachments?: string[];
  createdAt?: string;
}

interface ProjectFile {
  id: number;
  projectId: number;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedBy: 'admin' | 'client';
  uploaderName: string;
  description?: string;
  createdAt?: string;
}

interface Activity {
  id: number;
  type: string;
  description: string;
  createdAt?: string;
}

interface ProjectData {
  project: Project;
  company: Company;
  messages: ProjectMessage[];
  files: ProjectFile[];
  activities: Activity[];
}

export default function ClientPortal() {
  const { token } = useParams<{ token: string }>();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Detect if this is admin access (token will be a number) vs real token access
  const isAdminAccess = token && /^\d+$/.test(token);
  const clientId = isAdminAccess ? parseInt(token) : null;

  // Fetch project data
  useEffect(() => {
    const fetchProjectData = async () => {
      if (!token) {
        setError('Invalid access token');
        setLoading(false);
        return;
      }

      try {
        let response;
        
        if (isAdminAccess && clientId) {
          // Admin access: use client ID endpoint
          response = await fetch(`/api/admin/client/${clientId}`);
        } else {
          // Public access: use token endpoint
          response = await fetch(`/api/public/project/${token}`);
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Project not found or access denied');
          } else {
            setError('Failed to load project data');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        setProjectData(data);
        
        // Set default sender name from company or admin
        if (isAdminAccess) {
          setSenderName('Pleasant Cove Design Admin');
        } else if (data.company.name && !senderName) {
          setSenderName(data.company.name);
        }
      } catch (err) {
        console.error('Failed to fetch project data:', err);
        setError('Failed to load project data');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [token, senderName, isAdminAccess, clientId]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !senderName.trim() || !token) return;

    setSendingMessage(true);
    try {
      let response;
      
      if (isAdminAccess && clientId) {
        // Admin access: use admin endpoint
        response = await fetch(`/api/admin/client/${clientId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage,
            senderName: senderName
          }),
        });
      } else {
        // Public access: use public endpoint
        response = await fetch(`/api/public/project/${token}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage,
            senderName: senderName
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const message = await response.json();
      
      // Add the new message to the current data
      if (projectData) {
        setProjectData({
          ...projectData,
          messages: [...projectData.messages, message]
        });
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get stage color
  const getStageColor = (stage: string) => {
    const colors = {
      'scraped': 'bg-gray-100 text-gray-800',
      'contacted': 'bg-blue-100 text-blue-800',
      'responded': 'bg-yellow-100 text-yellow-800',
      'scheduled': 'bg-orange-100 text-orange-800',
      'quoted': 'bg-purple-100 text-purple-800',
      'sold': 'bg-green-100 text-green-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your project...</p>
        </div>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Unable to access this project. Please check your link or contact support.'}
          </p>
          <div className="text-sm text-gray-500">
            Need help? Contact us at <a href="mailto:ben@pleasantcovedesign.com" className="text-blue-600 hover:underline">ben@pleasantcovedesign.com</a>
          </div>
        </div>
      </div>
    );
  }

  const { project, company, messages, files, activities } = projectData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Pleasant Cove Design</h1>
                <p className="text-sm text-gray-500">
                  {isAdminAccess ? 'Admin View - Local Development' : 'Client Portal'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{company.name}</p>
              <p className="text-xs text-gray-500">{project.title}</p>
              {isAdminAccess && (
                <p className="text-xs text-blue-600 font-medium">🔧 Admin Access</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Overview Card */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Building2 className="h-4 w-4 mr-1" />
                    {project.type.charAt(0).toUpperCase() + project.type.slice(1)} Project
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(project.stage)}`}>
                    {project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}
                  </span>
                </div>
              </div>
              
              {project.totalAmount && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${project.totalAmount.toLocaleString()}
                  </p>
                  {project.paidAmount !== undefined && (
                    <p className="text-sm text-gray-600">
                      ${project.paidAmount.toLocaleString()} paid
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">{messages.length}</p>
                <p className="text-sm text-blue-700">Messages</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">{files.length}</p>
                <p className="text-sm text-green-700">Files</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-900">{activities.length}</p>
                <p className="text-sm text-purple-700">Updates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'overview', name: 'Overview', icon: Building2 },
                { id: 'messages', name: 'Messages', icon: MessageSquare },
                { id: 'files', name: 'Files', icon: FileText },
                { id: 'updates', name: 'Updates', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Project Details</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Project Type:</dt>
                        <dd className="text-gray-900">{project.type.charAt(0).toUpperCase() + project.type.slice(1)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Current Stage:</dt>
                        <dd className="text-gray-900">{project.stage.charAt(0).toUpperCase() + project.stage.slice(1)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Started:</dt>
                        <dd className="text-gray-900">{formatDate(project.createdAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Company:</dt>
                        <dd className="text-gray-900">{company.name}</dd>
                      </div>
                      {company.email && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Email:</dt>
                          <dd className="text-gray-900">{company.email}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Phone:</dt>
                        <dd className="text-gray-900">{company.phone}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Messages</h3>
                
                {/* Message Input */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Send a Message</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Your name or company"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      placeholder="Type your message here..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || !senderName.trim() || sendingMessage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>

                {/* Messages List */}
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No messages yet. Start the conversation!</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderType === 'admin' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-3 rounded-lg ${
                            message.senderType === 'admin'
                              ? 'bg-white border border-gray-200'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className={`font-medium text-sm ${
                              message.senderType === 'admin' ? 'text-gray-900' : 'text-blue-100'
                            }`}>
                              {message.senderName}
                            </p>
                            <span className={`text-xs ${
                              message.senderType === 'admin' ? 'text-gray-500' : 'text-blue-200'
                            }`}>
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className={`text-sm ${
                            message.senderType === 'admin' ? 'text-gray-700' : 'text-white'
                          }`}>
                            {message.content}
                          </p>
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment, index) => (
                                <a
                                  key={index}
                                  href={attachment}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-xs underline ${
                                    message.senderType === 'admin' ? 'text-blue-600' : 'text-blue-200'
                                  }`}
                                >
                                  📎 View Attachment
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Files Tab */}
            {activeTab === 'files' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Files</h3>
                
                {files.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No files have been shared yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file) => (
                      <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <FileText className="h-8 w-8 text-gray-400 flex-shrink-0" />
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            file.uploadedBy === 'admin' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {file.uploadedBy === 'admin' ? 'From Admin' : 'From Client'}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 text-sm mb-1 truncate">{file.fileName}</h4>
                        <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.fileSize)}</p>
                        
                        {file.description && (
                          <p className="text-xs text-gray-600 mb-3">{file.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {file.uploaderName} • {formatDate(file.createdAt)}
                          </span>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Updates Tab */}
            {activeTab === 'updates' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Updates</h3>
                
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No updates yet.</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity, index) => (
                      <div key={activity.id} className="flex">
                        <div className="flex-shrink-0 mr-4">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          </div>
                          {index < activities.length - 1 && (
                            <div className="mt-2 ml-4 h-6 w-0.5 bg-gray-200"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(activity.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 Pleasant Cove Design. Questions? Contact us at{' '}
              <a href="mailto:ben@pleasantcovedesign.com" className="text-blue-600 hover:underline">
                ben@pleasantcovedesign.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 