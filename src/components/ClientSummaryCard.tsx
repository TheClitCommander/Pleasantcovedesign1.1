import React from 'react'
import { Phone, Mail, Building2, Calendar, Star, Tag, User, ExternalLink } from 'lucide-react'
import { clsx } from 'clsx'

interface ClientSummaryCardProps {
  client: {
    id: number
    name: string
    email?: string
    phone: string
    businessType: string
    stage: string
    score?: number
    priority?: string
    tags?: string[]
    notes?: string
    createdAt?: string
    lastContactDate?: string
  }
  mode?: 'compact' | 'expanded' | 'draggable'
  showActions?: boolean
  showScore?: boolean
  showTags?: boolean
  showStage?: boolean
  showContactInfo?: boolean
  showNotes?: boolean
  className?: string
  onClientClick?: (clientId: number) => void
  onActionClick?: (action: string, clientId: number) => void
  draggable?: boolean
  dragData?: any
  children?: React.ReactNode
}

const ClientSummaryCard: React.FC<ClientSummaryCardProps> = ({
  client,
  mode = 'expanded',
  showActions = true,
  showScore = true,
  showTags = true,
  showStage = true,
  showContactInfo = true,
  showNotes = true,
  className = '',
  onClientClick,
  onActionClick,
  draggable = false,
  dragData,
  children
}) => {
  // Get priority-based styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50'
      case 'medium': return 'border-yellow-300 bg-yellow-50'
      case 'low': return 'border-green-300 bg-green-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-800'
      case 'medium': return 'text-yellow-800'
      case 'low': return 'text-green-800'
      default: return 'text-gray-800'
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getScoreBadgeColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-700'
    if (score >= 80) return 'bg-green-100 text-green-700'
    if (score >= 60) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'scraped': return 'bg-gray-100 text-gray-700'
      case 'contacted': return 'bg-blue-100 text-blue-700'
      case 'responded': return 'bg-purple-100 text-purple-700'
      case 'scheduled': return 'bg-green-100 text-green-700'
      case 'quoted': return 'bg-yellow-100 text-yellow-700'
      case 'sold': return 'bg-emerald-100 text-emerald-700'
      case 'in_progress': return 'bg-indigo-100 text-indigo-700'
      case 'delivered': return 'bg-teal-100 text-teal-700'
      case 'paid': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCardClick = () => {
    if (onClientClick) {
      onClientClick(client.id)
    }
  }

  const handleAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onActionClick) {
      onActionClick(action, client.id)
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) return
    console.log('🚀 Drag start detected:', client.name)
    
    const dragPayload = dragData || client
    e.dataTransfer.setData('text/plain', JSON.stringify(dragPayload))
    e.dataTransfer.setData('application/json', JSON.stringify(dragPayload))
    e.dataTransfer.effectAllowed = 'move'
    
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '0.3'
    target.style.transform = 'scale(0.95)'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (!draggable) return
    console.log('🏁 Drag ended:', client.name)
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    target.style.transform = 'scale(1)'
  }

  // Compact mode for lists and dashboards
  if (mode === 'compact') {
    return (
      <div
        className={clsx(
          'p-3 border rounded-lg transition-all duration-200 cursor-pointer select-none',
          getPriorityColor(client.priority || 'medium'),
          'hover:shadow-md hover:border-opacity-70',
          className
        )}
        onClick={handleCardClick}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={clsx(
                'font-semibold text-sm truncate',
                getPriorityTextColor(client.priority || 'medium')
              )}>
                {client.name}
              </h4>
              {onClientClick && <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {client.businessType} • {client.stage}
            </div>
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
            {showScore && client.score && (
              <span className={clsx(
                'px-2 py-1 rounded text-xs font-medium',
                getScoreBadgeColor(client.score)
              )}>
                {client.score}
              </span>
            )}
            {client.priority && (
              <span className={clsx(
                'px-2 py-1 rounded text-xs font-medium',
                getPriorityBadgeColor(client.priority)
              )}>
                {client.priority.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        
        {showTags && client.tags && client.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {client.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md"
              >
                <Tag className="h-2 w-2 mr-1" />
                {tag}
              </span>
            ))}
            {client.tags.length > 3 && (
              <span className="text-xs text-gray-500">+{client.tags.length - 3}</span>
            )}
          </div>
        )}
        
        {children}
      </div>
    )
  }

  // Expanded mode for detailed views
  return (
    <div
      className={clsx(
        'border p-4 rounded-lg transition-all duration-200 select-none',
        getPriorityColor(client.priority || 'medium'),
        onClientClick && 'cursor-pointer hover:shadow-md',
        draggable && 'cursor-grab hover:shadow-md',
        className
      )}
      onClick={onClientClick ? handleCardClick : undefined}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ 
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
    >
      {/* Header Section */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={clsx(
              'font-semibold text-base',
              getPriorityTextColor(client.priority || 'medium')
            )}>
              {client.name}
            </h4>
            {onClientClick && <ExternalLink className="h-4 w-4 text-gray-400" />}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Building2 className="h-3 w-3 text-gray-500" />
            <span className="text-sm text-gray-600 capitalize">{client.businessType}</span>
            {showStage && (
              <>
                <span className="text-gray-400">•</span>
                <span className={clsx(
                  'px-2 py-1 text-xs font-medium rounded-full capitalize',
                  getStageColor(client.stage)
                )}>
                  {client.stage.replace('_', ' ')}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          {client.priority && (
            <span className={clsx(
              'px-2 py-1 rounded text-xs font-medium text-center',
              getPriorityBadgeColor(client.priority)
            )}>
              {client.priority.toUpperCase()}
            </span>
          )}
          {showScore && client.score && (
            <span className={clsx(
              'px-2 py-1 rounded text-xs font-medium text-center',
              getScoreBadgeColor(client.score)
            )}>
              Score: {client.score}
            </span>
          )}
        </div>
      </div>

      {/* Contact Information */}
      {showContactInfo && (
        <div className="space-y-1 mb-3">
          {client.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-500" />
              <a 
                href={`tel:${client.phone}`} 
                className="hover:text-primary-600 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {client.phone}
              </a>
            </div>
          )}
          {client.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-500" />
              <a 
                href={`mailto:${client.email}`} 
                className="hover:text-primary-600 transition-colors truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {client.email}
              </a>
            </div>
          )}
          {(client.createdAt || client.lastContactDate) && (
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>
                {client.lastContactDate ? 
                  `Last contact: ${formatDate(client.lastContactDate)}` : 
                  `Added: ${formatDate(client.createdAt)}`
                }
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {showTags && client.tags && client.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {client.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {showNotes && client.notes && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 italic bg-gray-50 p-2 rounded">
            {client.notes}
          </p>
        </div>
      )}

      {/* Custom children content */}
      {children}

      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
          <button
            onClick={(e) => handleAction('contact', e)}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
          >
            Contact
          </button>
          <button
            onClick={(e) => handleAction('schedule', e)}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
          >
            Schedule
          </button>
          <button
            onClick={(e) => handleAction('notes', e)}
            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
          >
            Notes
          </button>
        </div>
      )}
    </div>
  )
}

export default ClientSummaryCard 