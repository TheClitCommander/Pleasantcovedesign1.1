import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MessageSquare,
  Send,
  Paperclip,
  FileText,
  Image,
  X,
  ExternalLink,
  Download,
  Building2,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface Company {
  id: number;
  name: string;
  email?: string;
  phone: string;
}

interface Project {
  id: number;
  companyId: number;
  title: string;
  type: string;
  stage: string;
  company?: Company;
  accessToken?: string;
}

interface UnifiedMessage {
  id?: number;
  projectToken: string;
  sender: string;
  body: string;
  timestamp: string;
  attachments?: string[];
}

interface AttachmentPreview {
  file: File;
  url: string;
  name: string;
}

export default function ProjectInbox() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [senderName, setSenderName] = useState('Ben Dickinson');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize WebSocket connection
  const connectSocket = (projectToken: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    console.log('🔌 Connecting to WebSocket...');
    setConnectionStatus('connecting');
    
    const socket = io('http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setConnectionStatus('connected');
      
      // Join the project room
      socket.emit('join', projectToken);
    });
    
    socket.on('joined', (data) => {
      console.log('🏠 Joined project room:', data);
    });
    
    socket.on('newMessage', (message: UnifiedMessage) => {
      console.log('📨 Received new message:', message);
      setMessages(prev => {
        // Avoid duplicates by checking if message already exists
        const exists = prev.some(m => m.id === message.id);
        if (exists) return prev;
        
        // Add new message and sort by timestamp
        const updated = [...prev, message].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return updated;
      });
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnectionStatus('disconnected');
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      setConnectionStatus('disconnected');
    });
    
    socket.on('reconnect', () => {
      console.log('🔌 Socket reconnected');
      setConnectionStatus('connected');
      socket.emit('join', projectToken);
    });
    
    socketRef.current = socket;
  };

  // Load projects on mount (with small delay to let server start)
  useEffect(() => {
    // Give server time to start up when running npm run dev
    const timer = setTimeout(() => {
      fetchProjects();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Connect WebSocket when project changes
  useEffect(() => {
    if (selectedProject?.accessToken) {
      fetchMessages(selectedProject.accessToken);
      connectSocket(selectedProject.accessToken);
    }
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedProject]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up socket on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchProjects = async (retryCount = 0) => {
    try {
      console.log(`📥 Fetching projects (attempt ${retryCount + 1})`);
      const response = await fetch('/api/projects?token=pleasantcove2024admin');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const projectsData = await response.json();
      
      // Fetch company info for each project
      const projectsWithCompanies = await Promise.all(
        projectsData.map(async (project: Project) => {
          try {
            const companyResponse = await fetch(`/api/companies/${project.companyId}?token=pleasantcove2024admin`);
            if (companyResponse.ok) {
              const companyData = await companyResponse.json();
              return { ...project, company: companyData };
            }
            return project;
          } catch (error) {
            console.error(`Failed to fetch company for project ${project.id}:`, error);
            return project;
          }
        })
      );
      
      setProjects(projectsWithCompanies);
      if (projectsWithCompanies.length > 0) {
        setSelectedProject(projectsWithCompanies[0]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      
      // Retry for connection refused errors (server still starting)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (retryCount < 3 && (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch'))) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`🔄 Server not ready, retrying in ${delay}ms...`);
        setTimeout(() => fetchProjects(retryCount + 1), delay);
        return; // Don't set loading to false yet
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (projectToken: string, retryCount = 0) => {
    try {
      console.log(`📥 Fetching messages for project token: ${projectToken} (attempt ${retryCount + 1})`);
      const response = await fetch(`http://localhost:3000/api/public/project/${projectToken}/messages`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }
      
      const data = await response.json();
      const rawMessages = data.messages || data;
      
      // Transform raw database format to UnifiedMessage format
      const messagesData: UnifiedMessage[] = rawMessages.map((msg: any) => ({
        id: msg.id,
        projectToken: projectToken,
        sender: msg.senderName || msg.sender,
        body: msg.content || msg.body,
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        attachments: msg.attachments || []
      }));
      
      console.log(`📋 Retrieved ${messagesData.length} messages`);
      console.log(`📎 Messages with attachments:`, messagesData.filter(m => m.attachments && m.attachments.length > 0));
      setMessages(messagesData);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      
      // Retry up to 3 times with exponential backoff for connection issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (retryCount < 3 && (errorMessage.includes('Failed to fetch') || errorMessage.includes('ECONNREFUSED'))) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`🔄 Retrying to fetch messages in ${delay}ms...`);
        setTimeout(() => fetchMessages(projectToken, retryCount + 1), delay);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: AttachmentPreview[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      newAttachments.push({
        file,
        url,
        name: file.name
      });
    }
    
    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && attachments.length === 0) || !selectedProject?.accessToken || sending) return;

    setSending(true);
    setUploading(attachments.length > 0);

    try {
      // Create FormData for the public project message API
      const formData = new FormData();
      formData.append('content', messageText || '(File attachment)');
      formData.append('senderName', senderName);
      formData.append('senderType', 'admin');

      // Attach all files
      attachments.forEach((attachment) => {
        formData.append('files', attachment.file);
      });

      console.log('📤 Sending message to project:', selectedProject.accessToken, 'with', attachments.length, 'files');

      const response = await fetch(`http://localhost:3000/api/public/project/${selectedProject.accessToken}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Message sent:', result);

      // Clear form (the message will appear via WebSocket or we'll refresh)
      setMessageText('');
      setAttachments([]);
      
      // Refresh messages to show the new one
      setTimeout(() => {
        if (selectedProject.accessToken) {
          fetchMessages(selectedProject.accessToken);
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to send message: ${errorMessage}`);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading project inbox...</div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-gray-50">
      {/* Project Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 mb-3">Project Messaging</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-y-auto">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedProject?.id === project.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{project.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{project.company?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {project.type}
                    </span>
                    <span className="text-xs text-gray-500">{project.stage}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No projects found</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedProject ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedProject.title}</h2>
                    <p className="text-sm text-gray-500">{selectedProject.company?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Real-time connection indicator */}
                  <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                    connectionStatus === 'connected' ? 'bg-green-50 text-green-700' :
                    connectionStatus === 'connecting' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                      connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                      'bg-red-500'
                    }`}></div>
                    {connectionStatus === 'connected' ? 'Live updates' :
                     connectionStatus === 'connecting' ? 'Connecting...' :
                     'Disconnected'}
                  </div>
                  
                  <button
                    onClick={() => selectedProject.accessToken && fetchMessages(selectedProject.accessToken)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Refresh messages"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                  </button>
                  
                  <button
                    onClick={() => navigate(`/admin/client/${selectedProject.companyId}`)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="View client profile"
                  >
                    <ExternalLink className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isAdmin = message.sender.toLowerCase().includes('ben') || 
                                  message.sender.toLowerCase().includes('admin') ||
                                  message.sender.toLowerCase().includes('pleasant cove');
                  
                  return (
                    <div
                      key={message.id || index}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-lg ${
                          isAdmin
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-medium text-sm ${
                            isAdmin ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            {message.sender}
                          </span>
                          <span className={`text-xs ${
                            isAdmin ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                        
                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.attachments.map((attachment, attachmentIndex) => {
                              const fileName = attachment.split('/').pop() || 'attachment';
                              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
                              
                              if (isImage) {
                                return (
                                  <div key={attachmentIndex} className="mt-2">
                                    <img 
                                      src={attachment} 
                                      alt={fileName}
                                      className="max-w-48 max-h-32 rounded cursor-pointer border border-gray-200"
                                      onClick={() => window.open(attachment, '_blank')}
                                      onError={(e) => {
                                        // Fallback to file link if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                    <a
                                      href={attachment}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`items-center gap-2 text-xs underline hover:no-underline ${
                                        isAdmin ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                      }`}
                                      style={{ display: 'none' }}
                                    >
                                      <Download className="h-3 w-3" />
                                      📷 {fileName}
                                    </a>
                                  </div>
                                );
                              } else {
                                return (
                                  <a
                                    key={attachmentIndex}
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                    className={`flex items-center gap-2 text-xs underline hover:no-underline px-2 py-1 rounded ${
                                      isAdmin 
                                        ? 'text-blue-200 hover:text-blue-100 hover:bg-blue-700' 
                                        : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                    }`}
                                  >
                                    <Download className="h-3 w-3" />
                                    📎 {fileName}
                                  </a>
                                );
                              }
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                      >
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="max-w-32 truncate">{attachment.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Attach files"
                  >
                    <Paperclip className="h-5 w-5 text-gray-500" />
                  </button>
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || (!messageText.trim() && attachments.length === 0)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        {uploading ? 'Uploading...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a project</h3>
              <p>Choose a project from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 