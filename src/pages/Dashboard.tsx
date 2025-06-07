import React, { useEffect, useState } from 'react'
import { AlertCircle, Clock, DollarSign, Users, Calendar, Phone, Mail, TrendingUp, ExternalLink, CalendarDays, Activity, Building2, CheckCircle, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard'
import LeadCard from '../components/LeadCard'
import InteractionTimeline from '../components/InteractionTimeline'
import api from '../api'

interface StatsResponse {
  totalLeads: number
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  averageScore: number
  highScoreLeads: number
  stageStats: Record<string, number>
  recentActivityCount: number
  conversionRate: number
}

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
}

interface Activity {
  id: number
  type: string
  description: string
  createdAt?: string
}

interface Appointment {
  id: number
  businessId: number
  datetime: string
  status: string
  notes?: string
  isAutoScheduled?: boolean
  squarespaceId?: string
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, bizRes, actRes, apptRes] = await Promise.all([
          api.get<StatsResponse>('/stats'),
          api.get<Business[]>('/businesses'),
          api.get<Activity[]>('/activities'),
          api.get<Appointment[]>('/appointments'),
        ])

        setStats(statsRes.data)
        setBusinesses(bizRes.data)
        setActivities(actRes.data)
        setAppointments(apptRes.data)
      } catch (err) {
        console.error('Failed to load dashboard data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statCards = stats
    ? [
        {
          title: 'Total Leads',
          value: stats.totalLeads.toString(),
          change: '+12%',
          changeType: 'positive' as const,
          icon: Users,
          onClick: () => navigate('/leads')
        },
        {
          title: 'Total Appointments',
          value: appointments.length.toString(),
          change: `${appointments.filter(a => a.isAutoScheduled).length} from Squarespace`,
          changeType: 'positive' as const,
          icon: Calendar,
          onClick: () => navigate('/schedule')
        },
        {
          title: 'Paid Revenue',
          value: `$${stats.paidRevenue.toLocaleString()}`,
          change: '+8%',
          changeType: 'positive' as const,
          icon: DollarSign,
          onClick: () => navigate('/progress')
        },
        {
          title: 'High Priority Leads',
          value: stats.highScoreLeads.toString(),
          change: `Avg Score: ${stats.averageScore}`,
          changeType: 'neutral' as const,
          icon: AlertCircle,
          onClick: () => navigate('/leads?filter=high-priority')
        },
      ]
    : []

  const highPriorityLeads = businesses
    .filter((b) => (b.score || 0) >= 80)
    .slice(0, 3)
    .map((b) => ({
      id: b.id.toString(),
      name: b.name,
      email: b.email || '',
      phone: b.phone,
      business_type: b.businessType,
      message: (b as any).notes || '',
      stage: b.stage as any,
      priority: b.priority as any,
      created_at: b.createdAt || '',
      score: b.score,
    }))

  const upcomingAppointments = appointments
    .filter(a => {
      const appointmentDate = new Date(a.datetime)
      const now = new Date()
      return appointmentDate > now
    })
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 5)

  const recentActivityTexts = activities.slice(0, 6).map((a) => a.description)

  const formatAppointmentTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClientClick = (businessId: number) => {
    navigate(`/admin/client/${businessId}`)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-lg">Loading dashboard…</div>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted mt-2">Welcome to your Pleasant Cove Design business management dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Appointments */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                Upcoming Appointments
              </h3>
            </div>
            <div className="p-6">
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => {
                    const business = businesses.find(b => b.id === appointment.businessId)
                    return (
                      <div 
                        key={appointment.id} 
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
                        onClick={() => handleClientClick(appointment.businessId)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-foreground hover:text-primary-600 transition-colors">
                                {business?.name || `Business #${appointment.businessId}`}
                              </h4>
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                            </div>
                            <p className="text-sm text-muted mb-1">
                              {formatAppointmentTime(appointment.datetime)}
                            </p>
                            {appointment.notes && (
                              <p className="text-xs text-muted bg-white/60 rounded px-2 py-1 mt-2">
                                {appointment.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              appointment.isAutoScheduled 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {appointment.isAutoScheduled ? 'Squarespace' : 'Manual'}
                            </span>
                            {business?.phone && (
                              <a 
                                href={`tel:${business.phone}`} 
                                className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3" />
                                Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted text-center py-8">No upcoming appointments</p>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column - High Priority Leads */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-primary-600" />
                High Priority Leads
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {highPriorityLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
              {highPriorityLeads.length === 0 && (
                <p className="text-muted text-center py-4">No high priority leads</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="lg:col-span-1">
          <InteractionTimeline limit={6} showBusinessName={true} />
        </div>
      </div>

      {/* Bottom Section - Revenue Overview */}
      {stats && (
        <div className="bg-white rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-primary-600" />
              Revenue Overview
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted">Total Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">${stats.paidRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted">Paid Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">${stats.pendingRevenue.toLocaleString()}</div>
                <div className="text-sm text-muted">Pending Revenue</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Conversion Rate</span>
                <span className="font-medium text-foreground">{stats.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard 