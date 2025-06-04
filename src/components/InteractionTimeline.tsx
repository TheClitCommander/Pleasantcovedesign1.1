import React, { useState, useEffect } from 'react'
import { Clock, User, Bot, Calendar, Phone, Mail, MessageCircle, Star, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import api from '../api'

interface Activity {
  id: number
  type: string
  description: string
  businessId?: number
  createdAt?: string
}

interface Business {
  id: number
  name: string
  email?: string
  phone: string
  businessType: string
  stage: string
  priority?: string
  score?: number
}

interface InteractionTimelineProps {
  businessId?: number
  limit?: number
  showBusinessName?: boolean
}

const InteractionTimeline: React.FC<InteractionTimelineProps> = ({ 
  businessId, 
  limit = 50, 
  showBusinessName = true 
}) => {
  const [activities, setActivities] = useState<Activity[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activitiesRes, businessesRes] = await Promise.all([
          api.get<Activity[]>('/activities'),
          api.get<Business[]>('/businesses')
        ])
        
        let filteredActivities = activitiesRes.data
        if (businessId) {
          filteredActivities = activitiesRes.data.filter(a => a.businessId === businessId)
        }
        
        setActivities(filteredActivities.slice(0, limit))
        setBusinesses(businessesRes.data)
      } catch (err) {
        console.error('Failed to fetch data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [businessId, limit])

  const getBusinessName = (businessId?: number) => {
    if (!businessId) return 'Unknown Business'
    const business = businesses.find(b => b.id === businessId)
    return business?.name || 'Unknown Business'
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'lead_received':
      case 'new_lead':
        return <Star className="h-4 w-4 text-yellow-500" />
      case 'business_created':
      case 'client_created':
        return <User className="h-4 w-4 text-blue-500" />
      case 'appointment_scheduled':
      case 'appointment_created':
        return <Calendar className="h-4 w-4 text-green-500" />
      case 'appointment_updated':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'outreach_sent':
      case 'campaign_sent':
        return <MessageCircle className="h-4 w-4 text-purple-500" />
      case 'response_received':
        return <Mail className="h-4 w-4 text-blue-500" />
      case 'phone_call':
        return <Phone className="h-4 w-4 text-green-500" />
      case 'bot_interaction':
        return <Bot className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'lead_received':
      case 'new_lead':
        return 'border-yellow-200 bg-yellow-50'
      case 'business_created':
      case 'client_created':
        return 'border-blue-200 bg-blue-50'
      case 'appointment_scheduled':
      case 'appointment_created':
        return 'border-green-200 bg-green-50'
      case 'appointment_updated':
        return 'border-orange-200 bg-orange-50'
      case 'outreach_sent':
      case 'campaign_sent':
        return 'border-purple-200 bg-purple-50'
      case 'response_received':
        return 'border-blue-200 bg-blue-50'
      case 'phone_call':
        return 'border-green-200 bg-green-50'
      case 'bot_interaction':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true
    return activity.type.includes(filter)
  })

  const activityTypes = Array.from(new Set(activities.map(a => a.type)))

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Interaction Timeline
          </h3>
          
          {activityTypes.length > 1 && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Activities</option>
              {activityTypes.map(type => (
                <option key={type} value={type}>
                  {formatActivityType(type)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="p-6">
        {filteredActivities.length > 0 ? (
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <div
                key={activity.id}
                className={clsx(
                  'flex items-start space-x-4 p-4 rounded-lg border',
                  getActivityColor(activity.type)
                )}
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {formatActivityType(activity.type)}
                    </p>
                    <span className="text-xs text-muted">
                      {formatDate(activity.createdAt)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted mt-1">
                    {activity.description}
                  </p>
                  
                  {showBusinessName && activity.businessId && (
                    <p className="text-xs text-muted mt-2">
                      <User className="h-3 w-3 inline mr-1" />
                      {getBusinessName(activity.businessId)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted">No interactions to display.</p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2"
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default InteractionTimeline 