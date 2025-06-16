import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

interface Conversation {
  id: number
  projectId: number
  projectToken: string
  projectTitle: string
  customerName: string
  customerEmail: string
  lastMessage?: Message
  lastMessageTime: string
  unreadCount: number
  messages: Message[]
}

const Inbox: React.FC = () => {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [searchTerm, setSearchTerm] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationsRef = useRef<Conversation[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Helper function to join all conversation rooms
  const joinAllConversationRooms = (conversationList: Conversation[]) => {
    console.log(`🔍 [ADMIN_UI] joinAllConversationRooms called:`, {
      hasSocket: !!socketRef.current,
      connectionStatus,
      conversationCount: conversationList.length,
      socketConnected: socketRef.current?.connected
    })

    if (!socketRef.current) {
      console.log(`❌ [ADMIN_UI] No socket available`)
      return
    }

    if (!socketRef.current.connected) {
      console.log(`❌ [ADMIN_UI] Socket not connected`)
      return
    }

    if (conversationList.length === 0) {
      console.log(`⏳ [ADMIN_UI] No conversations to join`)
      return
    }

    console.log(`🏠 [ADMIN_UI] Starting to join ${conversationList.length} conversation rooms...`)
    conversationList.forEach((conversation, index) => {
      console.log(`🏠 [ADMIN_UI] Joining room ${index + 1}/${conversationList.length}: ${conversation.projectToken}`)
      socketRef.current?.emit('join', conversation.projectToken, (response: any) => {
        console.log(`✅ [ADMIN_UI] Successfully joined room: ${conversation.projectToken}`, response)
      })
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        console.log('📥 Fetching all project messages for inbox...')
        const messagesRes = await api.get('/debug/all-messages')
        const debugData = messagesRes.data
        
        console.log('📋 Debug data received:', debugData)
        
        // Transform project messages into conversations
        const conversationList: Conversation[] = []
        
        if (debugData.projectMessages) {
          console.log('🔍 Processing projects:', debugData.projectMessages.length)
          debugData.projectMessages.forEach((project: any, index: number) => {
            console.log(`📋 Project ${index}:`, {
              id: project.projectId,
              token: project.accessToken,
              title: project.projectTitle,
              messagesCount: project.messages?.length || 0
            })
            
            if (project.messages && project.messages.length > 0) {
              const messages: Message[] = project.messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content || msg.body || '',
                senderName: msg.senderName || 'Unknown',
                senderType: msg.senderType || 'client',
                createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
                attachments: msg.attachments || []
              }))

              // Sort messages by timestamp
              messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

              const lastMessage = messages[messages.length - 1]
              const customerName = messages.find(m => m.senderType === 'client')?.senderName || 'Unknown Customer'
              const customerEmail = 'customer@example.com' // We don't have email in the message data

              conversationList.push({
                id: project.projectId,
                projectId: project.projectId,
                projectToken: project.accessToken,
                projectTitle: project.projectTitle,
                customerName,
                customerEmail,
                lastMessage,
                lastMessageTime: lastMessage.createdAt,
                unreadCount: 0,
                messages
              })
            }
          })
        }
        
        // Sort conversations by last message time (newest first)
        conversationList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
        
        setConversations(conversationList)
        conversationsRef.current = conversationList // Keep ref updated
        console.log(`✅ [ADMIN_UI] Loaded ${conversationList.length} conversations`)
        
        console.log(`🔍 [ADMIN_UI] After loading conversations - attempting to join rooms`)
        // Join all project rooms for real-time updates
        joinAllConversationRooms(conversationList)
        
        // Auto-select first conversation if none selected
        if (conversationList.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationList[0])
        }
        
      } catch (err) {
        console.error('Failed to load conversations', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
    
    // Set up WebSocket connection for real-time updates
    if (!socketRef.current) {
      console.log('🔌 Connecting to WebSocket for real-time updates...')
      setConnectionStatus('connecting')
      
      socketRef.current = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      })
      
      socketRef.current.on('connect', () => {
        console.log('✅ [ADMIN_UI] WebSocket connected for inbox updates')
        setConnectionStatus('connected')
        
        console.log(`🔍 [ADMIN_UI] On connect - attempting to join rooms for ${conversationsRef.current.length} conversations`)
        // Join all project rooms for existing conversations (if any have loaded)
        joinAllConversationRooms(conversationsRef.current)
      })
      
      socketRef.current.on('joined', (data: any) => {
        console.log('🏠 Successfully joined project room:', data)
      })
      
      socketRef.current.on('newMessage', (message: any) => {
        console.log('📨 [ADMIN_UI] Received real-time message:', message)
        console.log('📨 [ADMIN_UI] Current conversations count:', conversations.length)
        
        // Add message instantly to the UI (no HTTP call needed!)
        const newMessage: Message = {
          id: message.id,
          content: message.content || '',
          senderName: message.senderName || 'Unknown',
          senderType: message.senderType || 'client',
          createdAt: message.createdAt || new Date().toISOString(),
          attachments: message.attachments || []
        }
        
        // Update conversations state instantly
        setConversations(prevConversations => {
          const updatedConversations = prevConversations.map(conversation => {
            if (conversation.projectToken === message.projectToken) {
              // Check for duplicates
              const messageExists = conversation.messages.some(m => m.id === newMessage.id)
              if (messageExists) return conversation
              
              const updatedMessages = [...conversation.messages, newMessage]
              const updatedConversation = {
                ...conversation,
                messages: updatedMessages,
                lastMessage: newMessage,
                lastMessageTime: newMessage.createdAt,
                unreadCount: newMessage.senderType === 'client' 
                  ? conversation.unreadCount + 1 
                  : conversation.unreadCount
              }
              
              // Update selected conversation if it's the current one
              if (selectedConversation?.id === conversation.id) {
                setSelectedConversation(updatedConversation)
              }
              
              return updatedConversation
            }
            return conversation
          })
          
          // Keep ref updated
          conversationsRef.current = updatedConversations
          return updatedConversations
        })
      })
      
      socketRef.current.on('disconnect', (reason: string) => {
        console.log('❌ WebSocket disconnected:', reason)
        setConnectionStatus('disconnected')
      })
      
      socketRef.current.on('connect_error', (error: any) => {
        console.error('❌ WebSocket connection error:', error)
        setConnectionStatus('disconnected')
      })
    }

    // Only refresh data if WebSocket is disconnected (no automatic polling when connected)
    const interval = setInterval(() => {
      if (connectionStatus === 'disconnected') {
        console.log('🔄 WebSocket disconnected, refreshing conversations...')
        fetchConversations()
      }
    }, 30000)
    
    return () => {
      clearInterval(interval)
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setAttachments(prev => [...prev, ...newFiles])
    
    // Clear the input so same file can be selected again
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

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !selectedConversation) {
      console.log('❌ Cannot send message: missing content or conversation')
      return
    }

    try {
      console.log('📤 Sending admin message to project:', {
        projectId: selectedConversation.projectId,
        projectToken: selectedConversation.projectToken,
        customerName: selectedConversation.customerName,
        messageContent: newMessage,
        filesCount: attachments.length
      })
      
      let response;
      
      if (attachments.length > 0) {
        // Use FormData for file uploads via public API
        const formData = new FormData()
        formData.append('content', newMessage || '(File attachment)')
        formData.append('senderName', 'Ben Dickinson')
        formData.append('senderType', 'admin')
        
        attachments.forEach(file => {
          formData.append('files', file)
        })
        
        response = await fetch(`http://localhost:3000/api/public/project/${selectedConversation.projectToken}/messages`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        response = { data: await response.json() }
      } else {
        // Use JSON API for text-only messages
        response = await api.post(`/projects/${selectedConversation.projectId}/messages`, {
          content: newMessage,
          senderName: 'Ben Dickinson',
          senderType: 'admin'
        })
      }

      console.log('✅ Admin message sent successfully:', response.data)

      // Clear the input immediately
      setNewMessage('')
      setAttachments([])
      
      // Add message instantly via optimistic update (WebSocket will handle real-time sync)
      const sentMessage: Message = {
        id: response.data.id || Date.now(), // Use server ID or temporary ID
        content: newMessage,
        senderName: 'Ben Dickinson',
        senderType: 'admin',
        createdAt: response.data.createdAt || new Date().toISOString(),
        attachments: response.data.attachments || []
      }
      
      // Update conversations state instantly
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conversation => {
          if (conversation.id === selectedConversation?.id) {
            // Check for duplicates
            const messageExists = conversation.messages.some(m => m.id === sentMessage.id)
            if (messageExists) return conversation
            
            const updatedMessages = [...conversation.messages, sentMessage]
            const updatedConversation = {
              ...conversation,
              messages: updatedMessages,
              lastMessage: sentMessage,
              lastMessageTime: sentMessage.createdAt
            }
            
            // Update selected conversation
            setSelectedConversation(updatedConversation)
            
            return updatedConversation
          }
          return conversation
        })
        
        // Keep ref updated
        conversationsRef.current = updatedConversations
        return updatedConversations
      })
      
    } catch (error) {
      console.error('❌ Failed to send admin message:', error)
      
      // Show more detailed error message
      let errorMessage = 'Failed to send message. Please try again.'
      if (error instanceof Error) {
        errorMessage = `Failed to send message: ${error.message}`
      }
      
      alert(errorMessage)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 1) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading conversations...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-white rounded-xl shadow-sm border border-border">
      {/* Conversations Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-foreground">Messages</h1>
            {/* Connection status */}
            <div className="flex items-center gap-2">
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
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <div
              key={`conversation-${conversation.id}`}
              onClick={() => setSelectedConversation(conversation)}
              className={`p-4 border-b border-border cursor-pointer hover:bg-gray-50 ${
                selectedConversation?.id === conversation.id ? 'bg-primary-50 border-r-2 border-r-primary-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground truncate">
                      {conversation.customerName}
                    </p>
                    <span className="text-xs text-muted">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-muted truncate">
                    {conversation.projectTitle}
                  </p>
                  {conversation.lastMessage && (
                    <p className="text-sm text-muted truncate mt-1">
                      {conversation.lastMessage.senderType === 'admin' ? 'You: ' : ''}
                      {conversation.lastMessage.content}
                    </p>
                  )}
                  {conversation.unreadCount > 0 && (
                    <div className="inline-flex items-center justify-center w-5 h-5 bg-primary-600 text-white text-xs rounded-full mt-1">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {filteredConversations.length === 0 && (
            <div className="p-8 text-center text-muted">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {selectedConversation.customerName}
                    </h2>
                    <p className="text-sm text-muted">
                      {selectedConversation.projectTitle}
                    </p>
                    <p className="text-xs text-muted">
                      Token: {selectedConversation.projectToken}
                    </p>
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
              {selectedConversation.messages.map((message) => (
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
                                    message.senderType === 'admin' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                  }`}
                                  style={{ display: 'none' }}
                                >
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
                  className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted">
              <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Select a conversation
              </h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Inbox 