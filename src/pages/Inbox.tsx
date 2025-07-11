import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Search, 
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  User,
  X,
  MessageSquare
} from 'lucide-react'
import api, { getWebSocketUrl } from '../api'
import { io, Socket } from 'socket.io-client'
import TokenDebugPanel from '../components/TokenDebugPanel'
import InvalidTokenError from '../components/InvalidTokenError'

interface Message {
  id: number
  projectId: number
  projectToken: string
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
  const { projectToken } = useParams<{ projectToken?: string }>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected')
  const [searchTerm, setSearchTerm] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [showProjectHelper, setShowProjectHelper] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentRoomRef = useRef<string | null>(null)
  const selectedConversationRef = useRef<Conversation | null>(null)
  const autoSelectedRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fetchHasRun = useRef(false)

  // Cache last opened project token
  useEffect(() => {
    if (selectedConversation?.projectToken) {
      localStorage.setItem('pcd_last_admin_project', selectedConversation.projectToken)
    }
  }, [selectedConversation])

  // Auto-redirect to last-used token if no token in URL
  useEffect(() => {
    if (!projectToken && !loading) {
      const lastProject = localStorage.getItem('pcd_last_admin_project')
      if (lastProject && conversations.some(c => c.projectToken === lastProject)) {
        navigate(`/inbox/${lastProject}`, { replace: true })
      }
    }
  }, [projectToken, loading, conversations, navigate])

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const joinConversationRoom = (projectToken: string) => {
    console.log(`🔍 [ROOM_DEBUG] Request to join room: ${projectToken}`)
    console.log(`🔍 [ROOM_DEBUG] Current room: ${currentRoomRef.current}`)
    console.log(`🔍 [ROOM_DEBUG] Socket connected: ${socketRef.current?.connected}`)

    // CRITICAL: If we're already in this room, don't rejoin
    if (currentRoomRef.current === projectToken) {
      console.log(`✅ [ROOM_DEBUG] Already in room ${projectToken} - no action needed`)
      return
    }

    // Update the desired room immediately
    currentRoomRef.current = projectToken
    console.log(`🔒 [ROOM_DEBUG] Room state updated to: ${currentRoomRef.current}`)

    if (!socketRef.current || !socketRef.current.connected) {
      console.log(`⏳ [ROOM_DEBUG] Socket not connected yet - will join room when connected`)
      return
    }

    // CRITICAL: Leave ALL previous rooms first (only if socket is connected)
    const previousRoom = currentRoomRef.current
    if (previousRoom && previousRoom !== projectToken) {
      console.log(`🚪 [ROOM_DEBUG] Leaving previous room: ${previousRoom}`)
      socketRef.current.emit('leave', previousRoom)
    }

    // Join the new room ONLY
    console.log(`🏠 [ROOM_DEBUG] Joining SINGLE room: ${projectToken}`)
    socketRef.current.emit('join', projectToken, (response: any) => {
      console.log(`✅ [ROOM_DEBUG] Successfully joined room: ${projectToken}`, response)
    })
  }

  // Handle conversation selection - join only that room
  const handleConversationSelect = (conversation: Conversation) => {
    console.log('🎯 [SELECT] Selected conversation:', conversation.customerName);
    
    // Navigate to the conversation's URL
    if (conversation.projectToken !== projectToken) {
      navigate(`/inbox/${conversation.projectToken}`)
    }
    
    // Leave previous room
    if (selectedConversation && selectedConversation.projectToken !== conversation.projectToken) {
      socketRef.current?.emit('leave', selectedConversation.projectToken);
      console.log('👋 [WEBSOCKET] Left room:', selectedConversation.projectToken);
    }
    
    // Join new room
    joinConversationRoom(conversation.projectToken);
    
    // Update selected conversation
    setSelectedConversation(conversation);
    
    // Clear unread count - update both local state and persist
    setConversations(prevConversations =>
      prevConversations.map(conv =>
        conv.id === conversation.id
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    );
    
    // Cache this selection
    localStorage.setItem('pcd_last_admin_project', conversation.projectToken)
  }

  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  useEffect(() => {
    console.log(`🔌 [WEBSOCKET] Setting up WebSocket connection for Admin Inbox...`);
    
    const backendUrl = getWebSocketUrl();
    console.log(`🔌 [WEBSOCKET] Connecting to: ${backendUrl}`);
    setConnectionStatus('connecting');
    
    const socket = io(backendUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log(`✅ [WEBSOCKET] Connected with ID: ${socket.id}`);
      setConnectionStatus('connected');
      console.log('🏠 [WEBSOCKET] Joining universal admin room...');
      socket.emit('join', 'admin-room', (response: any) => {
        console.log(`✅ [WEBSOCKET] Join response for admin-room:`, response);
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`❌ [WEBSOCKET] Disconnected:`, reason);
      setConnectionStatus('disconnected');
    });

    // Add debugging for ALL socket events
    socket.onAny((eventName, ...args) => {
      console.log(`🎧 [SOCKET_EVENT] Received event: ${eventName}`, args);
    });

    // Enhanced admin message handler with detailed logging
    socket.on('newMessage', (message: Message) => {
      console.log('📨 [ADMIN_BROADCAST] Received newMessage event');
      console.log('📨 [ADMIN_BROADCAST] Message data:', JSON.stringify(message, null, 2));
      
      // Validate message structure
      if (!message.projectToken) {
        console.error('❌ [ADMIN_BROADCAST] Message missing projectToken:', message);
        return;
      }
      
      if (!message.id) {
        console.error('❌ [ADMIN_BROADCAST] Message missing ID:', message);
        return;
      }
      
      setConversations(prevConvos => {
        console.log('🔄 [STATE_UPDATE] Current conversations count:', prevConvos.length);
        console.log('🔄 [STATE_UPDATE] Looking for conversation with token:', message.projectToken);
        
        const newConversations = [...prevConvos];
        const convoIndex = newConversations.findIndex(c => c.projectToken === message.projectToken);
        console.log(`🤔 [STATE_UPDATE] Conversation found at index: ${convoIndex}`);

        if (convoIndex > -1) {
          const updatedConvo = { ...newConversations[convoIndex] };
          console.log('✅ [STATE_UPDATE] Updating existing conversation:', updatedConvo.customerName);
          
          const messageExists = updatedConvo.messages.some(m => m.id === message.id);
          console.log(`🔍 [STATE_UPDATE] Message already exists: ${messageExists}`);
          
          if (!messageExists) {
            console.log('➕ [STATE_UPDATE] Adding new message to conversation');
            updatedConvo.messages = [...updatedConvo.messages, message];
            updatedConvo.lastMessage = message;
            updatedConvo.lastMessageTime = message.createdAt;
            
            // Increment unread count only if this conversation is not currently selected
            if (!selectedConversation || selectedConversation.id !== updatedConvo.id) {
              updatedConvo.unreadCount = (updatedConvo.unreadCount || 0) + 1;
              console.log('📬 [STATE_UPDATE] Incremented unread count for:', updatedConvo.customerName);
            }
            
            newConversations[convoIndex] = updatedConvo;
            console.log('✅ [STATE_UPDATE] Message added successfully');
          } else {
            console.log('⚠️ [STATE_UPDATE] Duplicate message ignored');
          }
        } else {
          console.log('🆕 [STATE_UPDATE] Creating new conversation for:', message.senderName);
          // For new conversations, just create a minimal entry
          // The full data will be fetched on next refresh
          const newConversation: Conversation = {
            id: message.projectId || Date.now(),
            projectId: message.projectId,
            projectToken: message.projectToken,
            projectTitle: `${message.senderName || 'Unknown'}'s Conversation`,
            customerName: message.senderName || 'Unknown',
            customerEmail: 'unknown@example.com',
            lastMessage: message,
            lastMessageTime: message.createdAt,
            unreadCount: 1,
            messages: [message],
          };
          newConversations.unshift(newConversation);
          console.log('✅ [STATE_UPDATE] New conversation created');
        }

        const sortedConversations = newConversations.sort((a, b) => 
          new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
        
        console.log('📊 [STATE_UPDATE] Final conversations count:', sortedConversations.length);
        console.log('📊 [STATE_UPDATE] Conversations:', sortedConversations.map(c => ({
          name: c.customerName,
          token: c.projectToken,
          messageCount: c.messages.length
        })));
        
        return sortedConversations;
      });

      // Update selected conversation
      setSelectedConversation(prev => {
        if (prev && prev.projectToken === message.projectToken) {
          console.log('🎯 [STATE_UPDATE] Updating selected conversation');
          const messageExists = prev.messages.some(m => m.id === message.id);
          if (!messageExists) {
            const updated = {
              ...prev,
              messages: [...prev.messages, message]
            };
            console.log('✅ [STATE_UPDATE] Selected conversation updated');
            return updated;
          }
        }
        return prev;
      });
    });

    return () => {
      console.log(`🔌 [WEBSOCKET] Cleaning up admin connection...`);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchConversations = async () => {
      if (fetchHasRun.current) {
        console.log('⏭️ [FETCH] Fetch already ran, skipping');
        return;
      }
      
      console.log('📥 [FETCH] Starting conversation fetch...');
      
      try {
        const businessId = 1;
        console.log(`📥 [FETCH] Fetching messages for business ${businessId}...`);
        
        const messagesRes = await api.get(`/admin/conversations`);
        console.log('📥 [FETCH] Raw API response:', messagesRes.data);
        
        const businessData = messagesRes.data;
        
        if (!businessData.projectMessages) {
          console.log('⚠️ [FETCH] No projectMessages in response');
          setConversations([]);
          setLoading(false);
          return;
        }
        
        console.log(`📥 [FETCH] Found ${businessData.projectMessages.length} projects`);
        
        const conversationList: Conversation[] = [];
        
        businessData.projectMessages.forEach((project: any, index: number) => {
          console.log(`📋 [FETCH] Processing project ${index + 1}:`, {
            projectId: project.projectId,
            accessToken: project.accessToken,
            projectTitle: project.projectTitle,
            messageCount: project.messages?.length || 0
          });
          
          const customerName = project.projectTitle.split(' - ')[0] || 'Unknown Customer';
          
          const messages: Message[] = project.messages ? project.messages.map((msg: any, msgIndex: number) => {
            console.log(`📝 [FETCH] Processing message ${msgIndex + 1}:`, msg);
            
            return {
              id: msg.id || `temp_${Date.now()}_${msgIndex}`,
              projectId: project.projectId,
              projectToken: project.accessToken, // Key mapping
              content: msg.content || msg.body || '',
              senderName: msg.senderName || msg.sender || 'Unknown',
              senderType: msg.senderType || 'client',
              createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
              attachments: msg.attachments || []
            };
          }) : [];
          
          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          const conversation: Conversation = {
            id: project.projectId,
            projectId: project.projectId,
            projectToken: project.accessToken,
            projectTitle: project.projectTitle,
            customerName: customerName,
            customerEmail: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            lastMessage: messages[messages.length - 1] || undefined,
            lastMessageTime: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
            unreadCount: 0,
            messages: messages
          };
          
          conversationList.push(conversation);
          console.log(`✅ [FETCH] Created conversation for ${customerName} with ${messages.length} messages`);
        });
        
        conversationList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

        console.log(`📥 [FETCH] Final conversation list:`, conversationList.map(c => ({
          name: c.customerName,
          token: c.projectToken,
          messageCount: c.messages.length
        })));
        
        setConversations(conversationList);
        
        // Auto-select based on URL token or first conversation
        if (!selectedConversation && !autoSelectedRef.current && conversationList.length > 0) {
          let conversationToSelect = null;
          
          // If we have a project token in the URL, try to find that conversation
          if (projectToken) {
            console.log(`🎯 [AUTO_SELECT] Looking for conversation with token: ${projectToken}`);
            conversationToSelect = conversationList.find(c => c.projectToken === projectToken);
            if (conversationToSelect) {
              console.log(`✅ [AUTO_SELECT] Found conversation for token: ${conversationToSelect.customerName}`);
            } else {
              console.log(`⚠️ [AUTO_SELECT] No conversation found for token: ${projectToken}`);
              // Mark token as invalid if not found
              setInvalidToken(true);
            }
          }
          
          // If no token or conversation not found, select the first one
          if (!conversationToSelect) {
            conversationToSelect = conversationList[0];
            console.log(`🎯 [AUTO_SELECT] Auto-selecting first conversation: ${conversationToSelect.customerName}`);
          }
          
          setSelectedConversation(conversationToSelect);
          autoSelectedRef.current = true;
        }
        
      } catch (error) {
        console.error('❌ [FETCH] Error fetching conversations:', error);
        if (error instanceof Error) {
          console.error('❌ [FETCH] Error details:', error.message);
          console.error('❌ [FETCH] Error stack:', error.stack);
        }
      } finally {
        setLoading(false);
        fetchHasRun.current = true;
      }
    };

    fetchConversations();
  }, []);

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
        
        response = await fetch(`${getWebSocketUrl()}/api/public/project/${selectedConversation.projectToken}/messages`, {
          method: 'POST',
          body: formData
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        response = { data: await response.json() }
      } else {
        // Use unified messaging API for text-only messages
        response = await api.post(`/messages`, {
          projectToken: selectedConversation.projectToken,
          sender: 'Ben Dickinson',
          body: newMessage,
          attachmentKeys: [],
          hasFiles: false
        })
      }

      console.log('✅ Admin message sent successfully:', response.data)

      // Clear the input immediately
      setNewMessage('')
      setAttachments([])
      
      // Add message instantly via optimistic update (WebSocket will handle real-time sync)
      const sentMessage: Message = {
        id: response.data.id || Date.now(), // Use server ID or temporary ID
        projectId: selectedConversation.projectId,
        projectToken: selectedConversation.projectToken,
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
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return `${days} days ago`
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Sort conversations by last activity and filter by search
  const filteredConversations = conversations
    .filter(conv => 
      conv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by last message time (most recent first)
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    })

  // Add helper to navigate to a specific project
  const navigateToProject = (token: string) => {
    navigate(`/inbox/${token}`)
    window.location.reload() // Force reload to ensure proper initialization
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading conversations...</div>
      </div>
    )
  }

  // Show error if invalid token
  if (invalidToken && projectToken) {
    return <InvalidTokenError token={projectToken} onRetry={() => {
      setInvalidToken(false)
      fetchHasRun.current = false
      window.location.reload()
    }} />
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Project Helper Panel */}
      {showProjectHelper && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Project Navigation Helper</h3>
              <button
                onClick={() => setShowProjectHelper(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                Current URL Token: <code className="bg-blue-100 px-2 py-1 rounded">{projectToken || 'none'}</code>
              </p>
              <p className="text-sm text-blue-800">
                Selected Conversation: <code className="bg-blue-100 px-2 py-1 rounded">{selectedConversation?.projectToken ? `${selectedConversation.customerName} (${selectedConversation.projectToken.substring(0, 8)}...)` : 'none'}</code>
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Available Conversations (sorted by recent activity):</p>
              {filteredConversations.map((conv) => (
                <div
                  key={conv.projectToken}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{conv.customerName}</p>
                      <span className="text-xs text-gray-500">• {conv.customerEmail}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Token: {conv.projectToken.substring(0, 8)}... • Last activity: {formatTime(conv.lastMessageTime)}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {conv.lastMessage.senderType === 'admin' ? 'You: ' : `${conv.lastMessage.senderName}: `}
                        {conv.lastMessage.content || '📎 Attachment'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      handleConversationSelect(conv)
                      setShowProjectHelper(false)
                    }}
                    className={`px-3 py-1 text-sm rounded whitespace-nowrap ml-2 ${
                      conv.projectToken === selectedConversation?.projectToken
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {conv.projectToken === selectedConversation?.projectToken ? 'Current' : 'Select'}
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Tip:</strong> The system automatically remembers your last opened conversation.
              </p>
              <p className="text-xs text-gray-500">
                Direct link to current conversation:
              </p>
              <code className="block bg-gray-200 p-2 rounded text-xs break-all mt-1">
                {window.location.origin}/inbox/{selectedConversation?.projectToken || '<PROJECT_TOKEN>'}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="flex h-[calc(100vh-12rem)] bg-white rounded-xl shadow-sm border border-border">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">Business Inbox</h1>
              {/* Connection status */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowProjectHelper(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Open project navigation helper"
                >
                  <MessageSquare className="w-3 h-3" />
                  Projects
                </button>
                <button
                  onClick={async () => {
                    console.log('🔄 Manual refresh triggered');
                    fetchHasRun.current = false;
                    const fetchConversations = async () => {
                      try {
                        const messagesRes = await api.get(`/admin/conversations`);
                        const businessData = messagesRes.data;
                        
                        if (!businessData.projectMessages) {
                          setConversations([]);
                          return;
                        }
                        
                        const conversationList: Conversation[] = [];
                        
                        businessData.projectMessages.forEach((project: any) => {
                          const customerName = project.projectTitle.split(' - ')[0] || 'Unknown Customer';
                          
                          const messages: Message[] = project.messages ? project.messages.map((msg: any) => ({
                            id: msg.id || `temp_${Date.now()}_${Math.random()}`,
                            projectId: project.projectId,
                            projectToken: project.accessToken,
                            content: msg.content || msg.body || '',
                            senderName: msg.senderName || msg.sender || 'Unknown',
                            senderType: msg.senderType || 'client',
                            createdAt: msg.createdAt || msg.timestamp || new Date().toISOString(),
                            attachments: msg.attachments || []
                          })) : [];
                          
                          messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                          
                          const conversation: Conversation = {
                            id: project.projectId,
                            projectId: project.projectId,
                            projectToken: project.accessToken,
                            projectTitle: project.projectTitle,
                            customerName: customerName,
                            customerEmail: `${customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
                            lastMessage: messages[messages.length - 1] || undefined,
                            lastMessageTime: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
                            unreadCount: 0,
                            messages: messages
                          };
                          
                          conversationList.push(conversation);
                        });
                        
                        conversationList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
                        setConversations(conversationList);
                        console.log('✅ Manual refresh complete:', conversationList.length, 'conversations');
                      } catch (error) {
                        console.error('❌ Manual refresh failed:', error);
                      }
                    };
                    await fetchConversations();
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="Refresh conversations"
                >
                  🔄
                </button>
                <span className="text-xs text-muted">{filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    connectionStatus === 'connected' ? 'text-green-600' : 
                    connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {connectionStatus === 'connected' ? 'Live' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                  </span>
                </div>
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
                        {conversation.customerName || 'Unknown Customer'}
                      </p>
                      <span className="text-xs text-muted">
                        {conversation.lastMessageTime ? formatTime(conversation.lastMessageTime) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted truncate">
                      {conversation.projectTitle || 'No Title'}
                    </p>
                    {conversation.lastMessage ? (
                      <p className="text-sm text-muted truncate mt-1">
                        {conversation.lastMessage.senderType === 'admin' ? '🔵 You: ' : '💬 '}
                        {conversation.lastMessage.content || (conversation.lastMessage.attachments?.length ? `📎 ${conversation.lastMessage.attachments.length} file(s)` : 'Message')}
                      </p>
                    ) : (
                      <p className="text-sm text-muted truncate mt-1 italic">No messages yet</p>
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
            
            {filteredConversations.length === 0 && !loading && (
              <div className="p-8 text-center text-muted">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
                            const isVideo = /\.(mp4|webm|mov|avi)$/i.test(fileName);
                            const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(fileName);
                            const isPdf = /\.pdf$/i.test(fileName);
                            
                            if (isImage) {
                              return (
                                <div key={attachmentIndex} className="mt-2">
                                  <img 
                                    src={attachment} 
                                    alt={fileName}
                                    className="max-w-48 max-h-32 rounded cursor-pointer border border-gray-200 hover:opacity-90 transition-opacity"
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
                            } else if (isVideo) {
                              return (
                                <div key={attachmentIndex} className="mt-2">
                                  <video 
                                    controls
                                    className="max-w-64 max-h-40 rounded border border-gray-200"
                                    preload="metadata"
                                  >
                                    <source src={attachment} />
                                    Your browser does not support video playback.
                                  </video>
                                  <a
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs underline hover:no-underline mt-1 ${
                                      message.senderType === 'admin' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                  >
                                    🎬 {fileName}
                                  </a>
                                </div>
                              );
                            } else if (isAudio) {
                              return (
                                <div key={attachmentIndex} className="mt-2">
                                  <audio 
                                    controls
                                    className="w-full max-w-64"
                                    preload="metadata"
                                  >
                                    <source src={attachment} />
                                    Your browser does not support audio playback.
                                  </audio>
                                  <a
                                    href={attachment}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-2 text-xs underline hover:no-underline mt-1 ${
                                      message.senderType === 'admin' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                                    }`}
                                  >
                                    🎵 {fileName}
                                  </a>
                                </div>
                              );
                            } else {
                              // Get appropriate icon based on file type
                              const getFileIcon = (filename: string) => {
                                if (isPdf) return '📄';
                                if (/\.(doc|docx)$/i.test(filename)) return '📝';
                                if (/\.(xls|xlsx|csv)$/i.test(filename)) return '📊';
                                if (/\.(zip|rar|7z)$/i.test(filename)) return '🗜️';
                                if (/\.(txt|log)$/i.test(filename)) return '📃';
                                return '📎';
                              };
                              
                              return (
                                <a
                                  key={attachmentIndex}
                                  href={attachment}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className={`flex items-center gap-2 text-xs underline hover:no-underline px-2 py-1 rounded transition-colors ${
                                    message.senderType === 'admin' 
                                      ? 'text-blue-200 hover:text-blue-100 hover:bg-blue-700' 
                                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                  }`}
                                >
                                  {getFileIcon(fileName)} {fileName}
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
            <div className="flex flex-col items-center justify-center h-full text-center text-muted">
              <MessageSquare className="h-16 w-16 mb-4 text-gray-300" />
              <h2 className="text-lg font-medium">Select a conversation</h2>
              <p className="text-sm">Choose a conversation from the left to start messaging.</p>
            </div>
          )}
        </div>
        
        {/* Debug Panel */}
        <TokenDebugPanel 
          projectToken={selectedConversation?.projectToken}
          connectionStatus={connectionStatus}
          currentRoom={currentRoomRef.current || undefined}
        />
      </div>
    </div>
  )
}

export default Inbox;