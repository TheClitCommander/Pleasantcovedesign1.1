import React, { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  User,
  X
} from 'lucide-react'
import api from '../api'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: number
  content: string
  senderName: string
  senderType: 'client' | 'admin'
  createdAt: string
  attachments?: string[]
}

interface Business {
  id: number
  name: string
  email: string
  phone: string
}

interface Project {
  id: number
  companyId: number
  title: string
  accessToken: string
  createdAt?: string
}

const BusinessInbox: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  
  const [business, setBusiness] = useState<Business | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [attachments, setAttachments] = useState<File[]>([])
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const projectTokenRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Fetch business and latest project
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!businessId) return
      
      try {
        console.log(`🏢 [BUSINESS_INBOX] Fetching business data for ID: ${businessId}`)
        
        // Get business details
        const businessRes = await api.get(`/companies/${businessId}`)
        const businessData = businessRes.data
        setBusiness(businessData)
        console.log(`✅ [BUSINESS_INBOX] Business loaded: ${businessData.name}`)
        
        // Get latest project for this business
        const projectsRes = await api.get(`/projects?companyId=${businessId}`)
        const projects = projectsRes.data
        
        if (projects.length > 0) {
          // Sort by creation date, get latest
          const latestProject = projects.sort((a: Project, b: Project) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )[0]
          
          setProject(latestProject)
          projectTokenRef.current = latestProject.accessToken
          console.log(`✅ [BUSINESS_INBOX] Latest project: ${latestProject.title} (Token: ${latestProject.accessToken})`)
          
          // Load messages for this project
          await loadMessages(latestProject.accessToken)
        } else {
          console.log(`⚠️ [BUSINESS_INBOX] No projects found for business ${businessId}`)
        }
      } catch (error) {
        console.error(`❌ [BUSINESS_INBOX] Error fetching business data:`, error)
      } finally {
        setLoading(false)
      }
    }

    fetchBusinessData()
  }, [businessId])

  // Load messages for the project
  const loadMessages = async (projectToken: string) => {
    try {
      console.log(`📥 [BUSINESS_INBOX] Loading messages for token: ${projectToken}`)
      const response = await fetch(`http://localhost:3000/api/public/project/${projectToken}/messages`)
      
      if (!response.ok) {
        throw new Error('Failed to load messages')
      }
      
      const data = await response.json()
      const serverMessages = data.messages || data
      
      setMessages(serverMessages)
      console.log(`📥 [BUSINESS_INBOX] Loaded ${serverMessages.length} messages`)
      
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('❌ [BUSINESS_INBOX] Failed to load messages:', error)
    }
  }

  // Setup WebSocket connection
  useEffect(() => {
    if (!project?.accessToken) return
    
    console.log(`🔌 [BUSINESS_INBOX] Setting up WebSocket for token: ${project.accessToken}`)
    
    const backendUrl = 'http://localhost:3000'
    setConnectionStatus('connecting')
    
    const socket = io(backendUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    
    socketRef.current = socket
    
    socket.on('connect', () => {
      console.log(`✅ [BUSINESS_INBOX] Socket connected`)
      setConnectionStatus('connected')
      
      // Join the project room
      console.log(`🏠 [BUSINESS_INBOX] Joining room: ${project.accessToken}`)
      socket.emit('join', project.accessToken, (response: any) => {
        console.log(`✅ [BUSINESS_INBOX] Joined room response:`, response)
      })
    })

    socket.on('disconnect', (reason) => {
      console.log(`❌ [BUSINESS_INBOX] Socket disconnected:`, reason)
      setConnectionStatus('disconnected')
    })

    socket.on('newMessage', (message: any) => {
      console.log('📨 [BUSINESS_INBOX] Received new message:', message)
      
      // Verify message is for our project
      if (message.projectToken !== project.accessToken) {
        console.log('⚠️ [BUSINESS_INBOX] Message for different project, ignoring')
        return
      }
      
      // Map server fields to client fields
      const newMessage: Message = {
        id: message.id,
        content: message.content || message.body || '',
        senderName: message.senderName || message.sender || 'Unknown',
        senderType: message.senderType || 'client',
        createdAt: message.createdAt || message.timestamp || new Date().toISOString(),
        attachments: message.attachments || []
      }
      
      console.log('✅ [BUSINESS_INBOX] Processing new message:', newMessage)
      
      setMessages(prev => [...prev, newMessage])
      setTimeout(scrollToBottom, 100)
    })

    return () => {
      console.log(`🔌 [BUSINESS_INBOX] Cleaning up WebSocket connection`)
      socket.disconnect()
    }
  }, [project])

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !project) {
      console.log('❌ Cannot send message: missing content or project')
      return
    }

    try {
      console.log('📤 [BUSINESS_INBOX] Sending admin message:', {
        projectId: project.id,
        projectToken: project.accessToken,
        messageContent: newMessage,
        filesCount: attachments.length
      })
      
      let response;
      
      if (attachments.length > 0) {
        // Use FormData for file uploads via public API
        const formData = new FormData()
        formData.append('content', newMessage || '')
        formData.append('senderName', 'Ben Dickinson')
        formData.append('senderType', 'admin')
        
        attachments.forEach(file => {
          formData.append('files', file)
        })
        
        response = await fetch(`http://localhost:3000/api/public/project/${project.accessToken}/messages`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        response = { data: await response.json() }
      } else {
        // Use JSON API for text-only messages
        response = await api.post(`/projects/${project.id}/messages`, {
          content: newMessage,
          senderName: 'Ben Dickinson',
          senderType: 'admin'
        })
      }

      console.log('✅ [BUSINESS_INBOX] Admin message sent successfully:', response.data)

      // Clear the input immediately
      setNewMessage('')
      setAttachments([])
      
      // Optimistic update
      const sentMessage: Message = {
        id: response.data.id || Date.now(),
        content: newMessage,
        senderName: 'Ben Dickinson',
        senderType: 'admin',
        createdAt: response.data.createdAt || new Date().toISOString(),
        attachments: response.data.attachments || []
      }
      
      setMessages(prev => [...prev, sentMessage])
      setTimeout(scrollToBottom, 100)
      
    } catch (error) {
      console.error('❌ [BUSINESS_INBOX] Failed to send admin message:', error)
      alert('Failed to send message. Please try again.')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setAttachments(prev => [...prev, ...newFiles])
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev]
      updated.splice(index, 1)
      return updated
    })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading business inbox...</div>
      </div>
    )
  }

  if (!business || !project) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-lg text-gray-600">No active conversation found for this business.</p>
          <button 
            onClick={() => navigate('/inbox')}
            className="mt-4 btn-primary"
          >
            Back to All Conversations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-xl shadow-sm border border-border">
      {/* Business Header */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate('/inbox')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4 text-muted" />
              </button>
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">
                  {business.name}
                </h2>
                <p className="text-sm text-muted">
                  {project.title}
                </p>
                <p className="text-xs text-muted">
                  Token: {project.accessToken}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-muted">
                    {connectionStatus === 'connected' ? 'Live' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Phone className="h-4 w-4 text-muted" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Video className="h-4 w-4 text-muted" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <MoreVertical className="h-4 w-4 text-muted" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={`message-${message.id}`}
              className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderType === 'admin'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-foreground'
              }`}>
                <p className="text-sm">{message.content}</p>
                
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
                            />
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
                              message.senderType === 'admin' 
                                ? 'text-blue-200 hover:text-blue-100 hover:bg-blue-700' 
                                : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                            }`}
                          >
                            📎 {fileName}
                          </a>
                        );
                      }
                    })}
                  </div>
                )}
                
                <p className={`text-xs mt-1 ${
                  message.senderType === 'admin' ? 'text-primary-100' : 'text-muted'
                }`}>
                  {formatTime(message.createdAt)} • {message.senderName}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                  >
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    <span className="max-w-32 truncate">{file.name}</span>
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
          
          <div className="flex items-end gap-3">
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
              className="p-2 text-muted hover:text-foreground hover:bg-gray-100 rounded-lg"
              title="Attach files"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="Type a message..."
                className="w-full p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && attachments.length === 0}
              className="w-12 h-12 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg flex items-center justify-center transition-colors"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusinessInbox 