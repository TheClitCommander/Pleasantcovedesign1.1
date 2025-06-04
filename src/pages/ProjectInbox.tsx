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
  CheckCircle
} from 'lucide-react';
import api from '../api';

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

interface AttachmentPreview {
  file: File;
  url: string;
  name: string;
}

export default function ProjectInbox() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [senderName, setSenderName] = useState('Ben Dickinson');
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load projects on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  // Load messages when project changes
  useEffect(() => {
    if (selectedProject) {
      fetchMessages(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const projectsData = response.data;
      
      // Fetch company info for each project
      const projectsWithCompanies = await Promise.all(
        projectsData.map(async (project: Project) => {
          try {
            const companyResponse = await api.get(`/companies/${project.companyId}`);
            return { ...project, company: companyResponse.data };
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
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (projectId: number) => {
    try {
      const response = await api.get(`/projects/${projectId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
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

  const uploadFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const response = await api.post('/upload', {
            fileName: file.name,
            fileData: reader.result,
            fileType: file.type
          });
          
          if (response.data.success) {
            resolve(response.data.fileUrl);
          } else {
            reject(new Error('Upload failed'));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedProject || sending) return;

    setSending(true);
    setUploading(attachments.length > 0);

    try {
      // Upload attachments first
      const uploadedUrls: string[] = [];
      for (const attachment of attachments) {
        try {
          const url = await uploadFile(attachment.file);
          uploadedUrls.push(url);
        } catch (error) {
          console.error('Failed to upload file:', attachment.name, error);
        }
      }

      // Send message with Squarespace push
      const response = await api.post(`/projects/${selectedProject.id}/messages/with-push`, {
        content: messageText,
        senderName,
        attachments: uploadedUrls,
        pushToSquarespace: true
      });

      if (response.data.message) {
        // Add the new message to the list
        setMessages(prev => [...prev, response.data.message]);
        
        // Clear form
        setMessageText('');
        setAttachments([]);
        
        // Show success message if pushed to Squarespace
        if (response.data.squarespace_push === 'success') {
          console.log('✅ Message pushed to Squarespace successfully!');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
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
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-lg ${
                        message.senderType === 'admin'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium text-sm ${
                          message.senderType === 'admin' ? 'text-blue-100' : 'text-gray-600'
                        }`}>
                          {message.senderName}
                        </span>
                        <span className={`text-xs ${
                          message.senderType === 'admin' ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, index) => (
                            <a
                              key={index}
                              href={attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs underline ${
                                message.senderType === 'admin' ? 'text-blue-200' : 'text-blue-600'
                              }`}
                            >
                              <Download className="h-3 w-3" />
                              {attachment.split('/').pop() || 'attachment'}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Attachment Previews */}
              {attachments.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700 truncate max-w-32">
                          {attachment.name}
                        </span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sender Name Input */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Message Input */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message here..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  {/* File Upload Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    title="Attach file"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  
                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || !senderName.trim() || sending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
              
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg text-gray-500">Select a project to start messaging</p>
              <p className="text-sm text-gray-400">Choose a project from the sidebar to view and send messages</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 