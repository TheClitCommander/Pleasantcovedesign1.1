import React, { useEffect, useState } from 'react'
import { AlertCircle, Clock, DollarSign, Users, Calendar, Phone, Mail, TrendingUp } from 'lucide-react'
// @ts-ignore
import StatCard from '../components/StatCard'
// @ts-ignore  
import LeadCard from '../components/LeadCard'
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
        },
        {
          title: 'Total Appointments',
          value: appointments.length.toString(),
          change: `${appointments.filter(a => a.isAutoScheduled).length} from Squarespace`,
          changeType: 'positive' as const,
          icon: Calendar,
        },
        {
          title: 'Paid Revenue',
          value: `$${stats.paidRevenue.toLocaleString()}`,
          change: '+8%',
          changeType: 'positive' as const,
          icon: DollarSign,
        },
        {
          title: 'High Priority Leads',
          value: stats.highScoreLeads.toString(),
          change: `Avg Score: ${stats.averageScore}`,
          changeType: 'neutral' as const,
          icon: AlertCircle,
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-lg">Loading dashboard…</div>
    </div>
  )

  return (
    <div className="space-y-8">
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
                      <div key={appointment.id} className="border-l-4 border-primary-500 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {business?.name || `Business #${appointment.businessId}`}
                            </p>
                            <p className="text-sm text-muted">
                              {formatAppointmentTime(appointment.datetime)}
                            </p>
                            {appointment.notes && (
                              <p className="text-xs text-muted mt-1">{appointment.notes}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              appointment.isAutoScheduled 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {appointment.isAutoScheduled ? 'Squarespace' : 'Manual'}
                            </span>
                            {business?.phone && (
                              <div className="mt-1">
                                <a href={`tel:${business.phone}`} className="text-xs text-primary-600 hover:underline">
                                  <Phone className="h-3 w-3 inline mr-1" />
                                  Call
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted text-center py-4">No upcoming appointments</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary-600" />
                Recent Activity
              </h3>
            </div>
            <div className="p-6">
              <ul className="space-y-3">
                {recentActivityTexts.map((activity, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                    <span className="text-muted">{activity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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