import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  Briefcase, 
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  CreditCard,
  MessageCircle,
  Edit,
  Save,
  X,
  Send
} from 'lucide-react'
import api from '../api'

interface Business {
  id: number
  name: string
  email?: string
  phone: string
  businessType: string
  stage: string
  score?: number
  priority?: string
  createdAt?: string
  notes?: string
  address?: string
  website?: string
}

interface Activity {
  id: number
  businessId: number
  type: string
  description: string
  createdAt: string
}

interface Appointment {
  id: number
  businessId: number
  datetime: string
  status: string
  notes?: string
  isAutoScheduled?: boolean
}

interface Payment {
  id: number
  businessId: number
  amount: number
  status: string
  description: string
  createdAt: string
}

interface Project {
  id: number
  companyId: number
  title: string
  type: string
  stage: string
  company?: any
}

interface ProjectMessage {
  id: number
  projectId: number
  senderType: 'admin' | 'client'
  senderName: string
  content: string
  attachments?: string[]
  createdAt?: string
}

const ClientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [business, setBusiness] = useState<Business | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [messages, setMessages] = useState<ProjectMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  
  // Messaging state
  const [newMessage, setNewMessage] = useState('')
  const [senderName, setSenderName] = useState('Pleasant Cove Design Admin')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Handle hash-based navigation (e.g., #notes)
  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash === 'notes') {
      setActiveTab('overview') // Notes are in the overview tab
      // Scroll to notes section after a brief delay
      setTimeout(() => {
        const notesElement = document.getElementById('notes-section')
        if (notesElement) {
          notesElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Add highlight effect
          notesElement.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50')
          setTimeout(() => {
            notesElement.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50')
          }, 3000)
        }
      }, 300)
    }
  }, [location.hash])

  const fetchClientData = async () => {
    if (!id) return
    
    try {
      const [businessRes, activitiesRes, appointmentsRes, projectsRes] = await Promise.all([
        api.get<Business[]>('/businesses'),
        api.get<Activity[]>('/activities'),
        api.get<Appointment[]>('/appointments'),
        api.get<Project[]>('/projects'),
      ])

      const clientBusiness = businessRes.data.find(b => b.id === parseInt(id))
      setBusiness(clientBusiness || null)
      setNotesText(clientBusiness?.notes || '')
      
      setActivities(activitiesRes.data.filter(a => a.businessId === parseInt(id)))
      setAppointments(appointmentsRes.data.filter(a => a.businessId === parseInt(id)))
      
      // Get projects for this company (business)
      const clientProjects = projectsRes.data.filter(p => p.companyId === parseInt(id))
      setProjects(clientProjects)
      
      // Fetch messages from all projects for this client
      if (clientProjects.length > 0) {
        const allMessages: ProjectMessage[] = []
        for (const project of clientProjects) {
          try {
            const messagesRes = await api.get(`/projects/${project.id}/messages`)
            allMessages.push(...messagesRes.data)
          } catch (error) {
            console.error(`Failed to fetch messages for project ${project.id}:`, error)
          }
        }
        // Sort messages by creation date
        allMessages.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime())
        setMessages(allMessages)
      }
      
      // No mock payment data - start with empty state to see real data clearly
      setPayments([])
      
    } catch (err) {
      console.error('Failed to load client data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientData()
  }, [id])

  const handleSaveNotes = async () => {
    if (!business) return
    
    setSavingNotes(true)
    try {
      // Update business notes - we'll need to create this API endpoint
      const response = await api.put(`/businesses/${business.id}`, {
        ...business,
        notes: notesText
      })
      
      setBusiness(response.data)
      setIsEditingNotes(false)
      
      // Log activity
      await api.post('/activities', {
        type: 'notes_updated',
        description: `Notes updated for ${business.name}`,
        businessId: business.id
      })
      
      // Refresh activities
      const activitiesRes = await api.get<Activity[]>('/activities')
      setActivities(activitiesRes.data.filter(a => a.businessId === parseInt(id!)))
      
    } catch (error) {
      console.error('Failed to save notes:', error)
      alert('Failed to save notes. Please try again.')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !projects.length) return
    
    // Send to the first project (you could add project selection if multiple projects)
    const targetProject = projects[0]
    
    setSendingMessage(true)
    try {
      const response = await api.post(`/projects/${targetProject.id}/messages`, {
        content: newMessage,
        senderName,
        attachments: []
      })
      
      // Add the new message to the list
      setMessages(prev => [...prev, response.data])
      setNewMessage('')
      
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStageColor = (stage: string) => {
    const colors = {
      'scraped': 'bg-gray-100 text-gray-700',
      'contacted': 'bg-blue-100 text-blue-700',
      'responded': 'bg-green-100 text-green-700',
      'scheduled': 'bg-purple-100 text-purple-700',
      'quoted': 'bg-yellow-100 text-yellow-700',
      'sold': 'bg-emerald-100 text-emerald-700',
      'in_progress': 'bg-indigo-100 text-indigo-700',
      'delivered': 'bg-teal-100 text-teal-700',
      'paid': 'bg-green-100 text-green-700'
    }
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  const getPaymentStatusColor = (status: string) => {
    const colors = {
      'paid': 'bg-green-100 text-green-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'overdue': 'bg-red-100 text-red-700'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-lg">Loading client profile...</div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{business.name}</h1>
          <p className="text-muted mt-1">{business.businessType} • Score: {business.score || 0}/100</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(business.stage)}`}>
            {business.stage.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Contact Info Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-muted">Phone</p>
              <a href={`tel:${business.phone}`} className="font-medium text-primary-600 hover:underline">
                {business.phone}
              </a>
            </div>
          </div>
          {business.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-sm text-muted">Email</p>
                <a href={`mailto:${business.email}`} className="font-medium text-primary-600 hover:underline">
                  {business.email}
                </a>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-muted">Client Since</p>
              <p className="font-medium">{business.createdAt ? formatDate(business.createdAt) : 'Unknown'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-border">
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'projects', label: 'Projects', icon: Briefcase },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'appointments', label: 'Appointments', icon: Calendar },
              { id: 'conversations', label: 'Conversations', icon: MessageCircle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-muted hover:text-foreground hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Client Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted">Business Type</label>
                      <p className="font-medium">{business.businessType}</p>
                    </div>
                    
                    {/* Enhanced Notes Section */}
                    <div id="notes-section" className="transition-all duration-300 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        {!isEditingNotes ? (
                          <button
                            onClick={() => setIsEditingNotes(true)}
                            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSaveNotes}
                              disabled={savingNotes}
                              className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                            >
                              <Save className="h-4 w-4" />
                              {savingNotes ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingNotes(false)
                                setNotesText(business.notes || '')
                              }}
                              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditingNotes ? (
                        <textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Add notes about this client..."
                          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          rows={4}
                        />
                      ) : (
                        <div className="min-h-[100px] p-3 bg-gray-50 rounded-md">
                          {business.notes ? (
                            <p className="text-gray-800 whitespace-pre-wrap">{business.notes}</p>
                          ) : (
                            <p className="text-gray-500 italic">No notes added yet. Click Edit to add notes.</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="text-sm text-muted">Lead Score</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full" 
                            style={{ width: `${business.score || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{business.score || 0}/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted">{formatDateTime(activity.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                    {activities.length === 0 && (
                      <p className="text-muted text-sm">No recent activity</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Projects</h3>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  New Project
                </button>
              </div>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{project.title}</h4>
                        <p className="text-sm text-muted mt-1">{project.type} Project</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted">
                          <span>Type: {project.type}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(project.stage)}`}>
                        {project.stage.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <p className="text-muted text-center py-8">No projects yet</p>
                )}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Payment History</h3>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Add Payment
                </button>
              </div>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border border-border rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <p className="text-sm text-muted">{formatDate(payment.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${payment.amount.toLocaleString()}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-muted text-center py-8">No payments recorded</p>
                )}
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Appointment History</h3>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  Schedule Appointment
                </button>
              </div>
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-primary-600" />
                        <div>
                          <p className="font-medium">{formatDateTime(appointment.datetime)}</p>
                          {appointment.notes && (
                            <p className="text-sm text-muted mt-1">{appointment.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                        {appointment.isAutoScheduled && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Squarespace
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {appointments.length === 0 && (
                  <p className="text-muted text-center py-8">No appointments scheduled</p>
                )}
              </div>
            </div>
          )}

          {/* Conversations Tab - Now connected to real project messaging */}
          {activeTab === 'conversations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Project Conversations</h3>
                {projects.length > 0 && (
                  <span className="text-sm text-muted">
                    Messages from {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              {projects.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-muted">No projects yet</p>
                  <p className="text-sm text-muted mt-1">Create a project to start messaging with this client</p>
                </div>
              ) : (
                <>
                  {/* Message Input */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Send Message</h4>
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Your name"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <textarea
                        placeholder="Type your message here..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || !senderName.trim() || sendingMessage}
                        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {sendingMessage ? 'Sending...' : 'Send Message'}
                      </button>
                    </div>
                  </div>

                  {/* Messages List */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-muted text-center py-8">No messages yet. Start the conversation!</p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md px-4 py-3 rounded-lg ${
                              message.senderType === 'admin'
                                ? 'bg-primary-600 text-white'
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
                                {formatDateTime(message.createdAt || '')}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientProfile 