import React from 'react'
import { Mail, Phone, Calendar, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  business_type: string
  message: string
  stage: 'scraped' | 'contacted' | 'qualified' | 'scheduled'
  priority: 'high' | 'medium' | 'low'
  score?: number
  created_at: string
}

interface LeadCardProps {
  lead: Lead
}

const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getStageColor = (stage: Lead['stage']) => {
    switch (stage) {
      case 'scraped': return 'bg-gray-100 text-gray-700'
      case 'contacted': return 'bg-blue-100 text-blue-700'
      case 'qualified': return 'bg-yellow-100 text-yellow-700'
      case 'scheduled': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: Lead['priority']) => {
    switch (priority) {
      case 'high': return 'text-error'
      case 'medium': return 'text-warning'
      case 'low': return 'text-muted'
      default: return 'text-muted'
    }
  }

  const getPriorityIcon = (priority: Lead['priority']) => {
    if (priority === 'high') {
      return <AlertCircle className="h-4 w-4" />
    }
    return null
  }

  return (
    <div className="lead-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground">{lead.name}</h4>
          <div className="text-sm text-muted capitalize">{lead.business_type}</div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={clsx(
            getPriorityColor(lead.priority),
            "flex items-center"
          )}>
            {getPriorityIcon(lead.priority)}
          </span>
          <span className={clsx(
            "px-2 py-1 text-xs font-medium rounded-full capitalize",
            getStageColor(lead.stage)
          )}>
            {lead.stage}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center text-sm text-muted">
          <Mail className="h-4 w-4 mr-2" />
          <a href={`mailto:${lead.email}`} className="hover:text-primary-600">
            {lead.email}
          </a>
        </div>
        <div className="flex items-center text-sm text-muted">
          <Phone className="h-4 w-4 mr-2" />
          <a href={`tel:${lead.phone}`} className="hover:text-primary-600">
            {lead.phone}
          </a>
        </div>
        <div className="flex items-center text-sm text-muted">
          <Calendar className="h-4 w-4 mr-2" />
          {formatDate(lead.created_at)}
        </div>
      </div>

      <p className="text-sm text-foreground line-clamp-2">{lead.message}</p>

      {/* Score bar */}
      {lead.score !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">Score</span>
            <span className="font-medium">{lead.score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={clsx(
                'h-2 rounded-full',
                lead.score >= 80 ? 'bg-success' : lead.score >= 60 ? 'bg-warning' : 'bg-error'
              )}
              style={{ width: `${lead.score}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex space-x-2">
        <button className="btn-primary text-xs px-3 py-1">
          Contact
        </button>
        <button className="btn-secondary text-xs px-3 py-1">
          View Details
        </button>
      </div>
    </div>
  )
}

export default LeadCard 