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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [searchTerm, setSearchTerm] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentRoomRef = useRef<string | null>(null)
  const selectedConversationRef = useRef<Conversation | null>(null)
  const autoSelectedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const joinConversationRoom = (projectToken: string) => {
    console.log(`🔍 [ROOM_DEBUG] Request to join room: ${projectToken}`)
    console.log(`🔍 [ROOM_DEBUG] Current room: ${currentRoomRef.current}`)
    console.log(`🔍 [ROOM_DEBUG] Socket connected: ${socketRef.current?.connected}`)

    if (!socketRef.current || !socketRef.current.connected) {
      console.log(`❌ [ROOM_DEBUG] Socket not available or not connected`)
      return
    }

    // CRITICAL: If we're already in this room, don't rejoin
    if (currentRoomRef.current === projectToken) {
      console.log(`✅ [ROOM_DEBUG] Already in room ${projectToken} - no action needed`)
      return
    }

    // CRITICAL: Leave ALL previous rooms first
    if (currentRoomRef.current) {
      console.log(`🚪 [ROOM_DEBUG] Leaving previous room: ${currentRoomRef.current}`)
      socketRef.current.emit('leave', currentRoomRef.current)
      currentRoomRef.current = null // Clear immediately
    }

    // Join the new room ONLY
    console.log(`🏠 [ROOM_DEBUG] Joining SINGLE room: ${projectToken}`)
    socketRef.current.emit('join', projectToken, (response: any) => {
      console.log(`✅ [ROOM_DEBUG] Successfully joined room: ${projectToken}`, response)
    })
    
    currentRoomRef.current = projectToken
    console.log(`🔒 [ROOM_DEBUG] Room state updated to: ${currentRoomRef.current}`)
  }

  // Handle conversation selection - join only that room
  const handleConversationSelect = (conversation: Conversation) => {
    console.log(`👆 [ROOM_DEBUG] User manually selected conversation: ${conversation.customerName} (${conversation.projectToken})`)
    
    // Update selected conversation FIRST
    setSelectedConversation(conversation)
    selectedConversationRef.current = conversation // Update ref immediately
    
    // Then join only this conversation's room
    if (socketRef.current && socketRef.current.connected) {
      joinConversationRoom(conversation.projectToken)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        console.log('📥 [FIXED] Fetching all project messages for inbox...')
        const messagesRes = await api.get('/debug/all-messages')
        const debugData = messagesRes.data
        
        // Transform project messages into conversations
        const conversationList: Conversation[] = []
        
        if (debugData.projectMessages) {
          debugData.projectMessages.forEach((project: any) => {
            const messages: Message[] = project.messages ? project.messages.map((msg: any) => ({
              id: msg.id,
              content: msg.content || msg.body || '',
              senderName: msg.senderName || 'Unknown',
              senderType: msg.senderType || 'client',
              createdAt: msg.createdAt || new Date().toISOString(),
              attachments: msg.attachments || []
            })) : []

            conversationList.push({
              id: project.id,
              projectId: project.id,
              projectToken: project.token,
              projectTitle: project.title,
              customerName: project.customerName || 'Unknown Customer',
              customerEmail: project.customerEmail || 'unknown@email.com',
              lastMessage: messages[messages.length - 1],
              lastMessageTime: messages.length > 0 ? messages[messages.length - 1].createdAt : new Date().toISOString(),
              unreadCount: 0,
              messages: messages
            })
          })
        }

        setConversations(conversationList)
        console.log(`📥 [FIXED] Loaded ${conversationList.length} conversations`)
        
        // 🔧 CRITICAL FIX: Do NOT auto-join rooms here!
        // Only join a room when a conversation is explicitly selected
        
        // Auto-select first conversation if none selected and conversations exist
        if (!selectedConversation && !autoSelectedRef.current && conversationList.length > 0) {
          console.log(`🎯 [FIXED] Auto-selecting first conversation: ${conversationList[0].customerName}`)
          setSelectedConversation(conversationList[0])
          autoSelectedRef.current = true
        }
        
      } catch (error) {
        console.error('❌ [FIXED] Error fetching conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // 🚀 SETUP WEBSOCKET CONNECTION  
  useEffect(() => {
    console.log(`🔌 [WEBSOCKET] Setting up WebSocket connection...`)
    
    const backendUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000' 
      : 'https://pleasantcovedesign-production.up.railway.app'
    
    console.log(`🔌 [WEBSOCKET] Connecting to: ${backendUrl}`)
    setConnectionStatus('connecting')
    
    const socket = io(backendUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    
    socketRef.current = socket
    
    // Connection event handlers
    socket.on('connect', () => {
      console.log(`✅ [WEBSOCKET] Connected to backend`)
      setConnectionStatus('connected')
      
      // 🔧 CRITICAL FIX: DO NOT auto-join any rooms here!
      // Room joining happens only when a conversation is selected
      console.log(`🔧 [WEBSOCKET] Connection established - no auto-joining rooms`)
    })

    socket.on('disconnect', (reason) => {
      console.log(`❌ [WEBSOCKET] Disconnected:`, reason)
      setConnectionStatus('disconnected')
      currentRoomRef.current = null
    })

    socket.on('reconnect', () => {
      console.log(`🔄 [WEBSOCKET] Reconnected`)
      setConnectionStatus('connected')
    })

    // 🔧 FIXED MESSAGE HANDLER - uses refs to avoid closure issues
    socket.on('newMessage', (message: any) => {
      console.log('📨 [DEBUG] Received message:', message)
      console.log('📨 [DEBUG] Message projectToken:', message.projectToken)
      
      // Use ref to get current selected conversation (avoids stale closure)
      const currentConversation = selectedConversationRef.current
      console.log('📨 [DEBUG] Current conversation:', currentConversation?.customerName, currentConversation?.projectToken)
      console.log('📨 [DEBUG] Current room:', currentRoomRef.current)
      
      if (!currentConversation) {
        console.log('🚫 [DEBUG] No conversation selected, ignoring message')
        return
      }
      
      if (message.projectToken !== currentConversation.projectToken) {
        console.log(`🚫 [DEBUG] Message for different conversation (expected: ${currentConversation.projectToken}, got: ${message.projectToken})`)
        return
      }
      
      console.log('✅ [DEBUG] Message matches current conversation - processing')
      
      // ✅ FIX: Map server fields to client fields correctly
      const newMessage: Message = {
        id: message.id,
        content: message.content || message.body || '',  // Server sends "body", client expects "content"
        senderName: message.senderName || message.sender || 'Unknown',  // Server sends "sender", client expects "senderName"
        senderType: message.senderType || (message.sender !== 'Ben Dickinson' ? 'client' : 'admin') || 'client',  // Auto-detect client vs admin
        createdAt: message.createdAt || message.timestamp || new Date().toISOString(),  // Server sends "timestamp", client expects "createdAt"
        attachments: message.attachments || []
      }
      
      console.log('📨 [DEBUG] Processed message:', newMessage)
      
      // Update the current conversation with the new message
      setSelectedConversation(prev => {
        if (!prev) return prev
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          lastMessage: newMessage,
          lastMessageTime: newMessage.createdAt
        }
      })
      
      // Update conversations list
      setConversations(prev => prev.map(conv => 
        conv.projectToken === currentConversation.projectToken
          ? { ...conv, messages: [...conv.messages, newMessage], lastMessage: newMessage, lastMessageTime: newMessage.createdAt }
          : conv
      ))
      
      console.log('✅ [DEBUG] Message added to conversation')
    })

    return () => {
      console.log(`🔌 [WEBSOCKET] Cleaning up connection...`)
      socket.disconnect()
    }
  }, [])

  // 🔒 HANDLE CONVERSATION SELECTION CHANGES
  useEffect(() => {
    console.log(`🎯 [DEBUG] Conversation selection effect triggered`)
    console.log(`🎯 [DEBUG] selectedConversation:`, selectedConversation?.customerName, selectedConversation?.projectToken)
    console.log(`🎯 [DEBUG] Socket connected:`, socketRef.current?.connected)
    console.log(`🎯 [DEBUG] Current room:`, currentRoomRef.current)
    
    if (selectedConversation && socketRef.current && socketRef.current.connected) {
      console.log(`🎯 [DEBUG] ✅ CONDITIONS MET - Processing conversation selection`)
      
      // Update ref immediately to avoid closure issues
      selectedConversationRef.current = selectedConversation
      console.log(`🎯 [DEBUG] Updated selectedConversationRef to:`, selectedConversation.customerName)
      
      // 🔧 CRITICAL FIX: Join room for selected conversation ONLY
      console.log(`🎯 [DEBUG] About to join room for: ${selectedConversation.projectToken}`)
      joinConversationRoom(selectedConversation.projectToken)
      
    } else {
      console.log(`🎯 [DEBUG] ❌ CONDITIONS NOT MET:`)
      console.log(`🎯 [DEBUG] - selectedConversation:`, !!selectedConversation)
      console.log(`🎯 [DEBUG] - socket exists:`, !!socketRef.current)
      console.log(`🎯 [DEBUG] - socket connected:`, socketRef.current?.connected)
    }
  }, [selectedConversation])

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
        formData.append('content', newMessage || '')
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
              onClick={() => handleConversationSelect(conversation)}
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