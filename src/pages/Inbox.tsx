import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Plus, 
  Mail, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Bell, 
  Clock, 
  User, 
  CheckCircle, 
  AlertTriangle,
  Star,
  Archive,
  MoreVertical,
  Reply,
  Send,
  Paperclip,
  ExternalLink
} from 'lucide-react'
import api from '../api'

interface Message {
  id: number
  type: 'email' | 'sms' | 'call' | 'notification' | 'system'
  from: string
  fromId?: number
  subject?: string
  content: string
  timestamp: string
  isRead: boolean
  isStarred: boolean
  priority: 'high' | 'medium' | 'low'
  hasAttachment?: boolean
}

interface Business {
  id: number
  name: string
  email?: string
  phone: string
}

const Inbox: React.FC = () => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'archived'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isComposing, setIsComposing] = useState(false)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const businessRes = await api.get<Business[]>('/businesses')
        setBusinesses(businessRes.data)
        
        // Generate mock messages for demo
        const mockMessages: Message[] = [
          {
            id: 1,
            type: 'email',
            from: 'Harbor Plumbing',
            fromId: 2,
            subject: 'Project inquiry - Website redesign',
            content: 'Hello! We\'re interested in getting a complete website redesign for our plumbing business. We currently have an outdated site and need something modern that showcases our services and allows online booking.',
            timestamp: '2024-01-20T09:30:00Z',
            isRead: false,
            isStarred: false,
            priority: 'high',
            hasAttachment: false
          },
          {
            id: 2,
            type: 'notification',
            from: 'System',
            subject: 'New appointment scheduled',
            content: 'Coastal Electric has scheduled an appointment for tomorrow at 8:30 AM via Squarespace booking.',
            timestamp: '2024-01-20T08:15:00Z',
            isRead: false,
            isStarred: true,
            priority: 'medium'
          },
          {
            id: 3,
            type: 'sms',
            from: 'Coastal Electric',
            fromId: 1,
            content: 'Quick question - can we reschedule our call to later this week? Thanks!',
            timestamp: '2024-01-19T16:45:00Z',
            isRead: true,
            isStarred: false,
            priority: 'medium'
          },
          {
            id: 4,
            type: 'email',
            from: 'Bay Construction',
            fromId: 3,
            subject: 'Payment confirmation',
            content: 'Hi there, just confirming that we\'ve sent the initial payment for the website project. Please confirm receipt when you have a chance.',
            timestamp: '2024-01-19T14:20:00Z',
            isRead: true,
            isStarred: false,
            priority: 'low',
            hasAttachment: true
          },
          {
            id: 5,
            type: 'call',
            from: 'Sunset Landscaping',
            fromId: 4,
            content: 'Missed call - left voicemail about portfolio website discussion',
            timestamp: '2024-01-19T11:30:00Z',
            isRead: true,
            isStarred: false,
            priority: 'medium'
          },
          {
            id: 6,
            type: 'system',
            from: 'Pleasant Cove Design',
            subject: 'Monthly report available',
            content: 'Your monthly business report is now available. You had 15 new leads, 8 appointments scheduled, and $12,500 in new revenue this month.',
            timestamp: '2024-01-18T09:00:00Z',
            isRead: true,
            isStarred: false,
            priority: 'low'
          }
        ]
        
        setMessages(mockMessages)
      } catch (err) {
        console.error('Failed to load inbox data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours < 1) {
      return `${Math.floor(diff / (1000 * 60))}m ago`
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />
      case 'sms': return <MessageSquare className="h-4 w-4" />
      case 'call': return <Phone className="h-4 w-4" />
      case 'notification': return <Bell className="h-4 w-4" />
      case 'system': return <AlertTriangle className="h-4 w-4" />
      default: return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: Message['type']) => {
    switch (type) {
      case 'email': return 'text-blue-600'
      case 'sms': return 'text-green-600'
      case 'call': return 'text-purple-600'
      case 'notification': return 'text-orange-600'
      case 'system': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getPriorityColor = (priority: Message['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  const handleMarkAsRead = (messageId: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ))
  }

  const handleStarMessage = (messageId: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isStarred: !msg.isStarred } : msg
    ))
  }

  const handleClientClick = (clientId?: number) => {
    if (clientId) {
      navigate(`/admin/client/${clientId}`)
    }
  }

  const handleSendReply = () => {
    if (replyText.trim() && selectedMessage) {
      // Add reply logic here
      console.log('Sending reply:', replyText)
      setReplyText('')
    }
  }

  const filteredMessages = messages.filter(message => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'unread' && !message.isRead) ||
      (filter === 'starred' && message.isStarred)
    
    const matchesType = typeFilter === 'all' || message.type === typeFilter
    
    const matchesSearch = 
      message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (message.subject?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesType && matchesSearch
  })

  const unreadCount = messages.filter(m => !m.isRead).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading inbox...</div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-12rem)]">
      {/* Sidebar */}
      <div className="w-80 bg-white rounded-l-xl shadow-sm border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
            <button 
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              onClick={() => setIsComposing(true)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { key: 'all', label: 'All', count: messages.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'starred', label: 'Starred', count: messages.filter(m => m.isStarred).length },
              { key: 'archived', label: 'Archived', count: 0 }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-2 text-sm rounded-lg text-left ${
                  filter === key 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-muted hover:bg-gray-50'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="call">Calls</option>
            <option value="notification">Notifications</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => {
                setSelectedMessage(message)
                if (!message.isRead) handleMarkAsRead(message.id)
              }}
              className={`p-4 border-b border-border cursor-pointer hover:bg-gray-50 border-l-4 ${
                getPriorityColor(message.priority)
              } ${!message.isRead ? 'bg-blue-50' : ''} ${
                selectedMessage?.id === message.id ? 'bg-primary-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className={getTypeColor(message.type)}>
                    {getMessageIcon(message.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p 
                        className={`font-medium truncate ${!message.isRead ? 'text-foreground' : 'text-muted'} ${
                          message.fromId ? 'hover:text-primary-600 cursor-pointer' : ''
                        }`}
                        onClick={(e) => {
                          if (message.fromId) {
                            e.stopPropagation()
                            handleClientClick(message.fromId)
                          }
                        }}
                      >
                        {message.from}
                        {message.fromId && <ExternalLink className="h-3 w-3 inline ml-1" />}
                      </p>
                      {message.isStarred && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                    </div>
                    {message.subject && (
                      <p className={`text-sm truncate ${!message.isRead ? 'font-medium' : 'text-muted'}`}>
                        {message.subject}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted">{formatTimestamp(message.timestamp)}</span>
              </div>
              
              <p className="text-sm text-muted line-clamp-2">{message.content}</p>
              
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  {message.hasAttachment && <Paperclip className="h-3 w-3 text-muted" />}
                  {!message.isRead && <div className="w-2 h-2 bg-primary-600 rounded-full"></div>}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStarMessage(message.id)
                  }}
                  className="text-muted hover:text-yellow-500"
                >
                  <Star className={`h-3 w-3 ${message.isStarred ? 'fill-current text-yellow-500' : ''}`} />
                </button>
              </div>
            </div>
          ))}
          
          {filteredMessages.length === 0 && (
            <div className="p-8 text-center text-muted">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No messages found</p>
            </div>
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className="flex-1 bg-white rounded-r-xl shadow-sm flex flex-col">
        {selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={getTypeColor(selectedMessage.type)}>
                    {getMessageIcon(selectedMessage.type)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{selectedMessage.from}</h2>
                      {selectedMessage.fromId && (
                        <button
                          onClick={() => handleClientClick(selectedMessage.fromId)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {selectedMessage.subject && (
                      <p className="text-muted">{selectedMessage.subject}</p>
                    )}
                    <p className="text-sm text-muted">{formatTimestamp(selectedMessage.timestamp)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStarMessage(selectedMessage.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Star className={`h-4 w-4 ${selectedMessage.isStarred ? 'fill-current text-yellow-500' : 'text-muted'}`} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Archive className="h-4 w-4 text-muted" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="h-4 w-4 text-muted" />
                  </button>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </div>

            {/* Reply Section */}
            {selectedMessage.type !== 'system' && selectedMessage.type !== 'notification' && (
              <div className="p-6 border-t border-border">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="w-full p-3 border border-border rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-muted hover:text-foreground hover:bg-gray-100 rounded">
                          <Paperclip className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Send Reply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Select a message to view</p>
              <p className="text-sm">Choose a message from the inbox to read and reply</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Inbox 