import React from 'react'
import { DollarSign, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { clsx } from 'clsx'

interface TimelineItem {
  phase: string
  completed: boolean
  date: string
}

interface Project {
  id: string
  clientName: string
  projectName: string
  stage: string
  progress: number
  totalValue: number
  paidAmount: number
  nextPayment: number
  dueDate: string
  status: 'on-track' | 'at-risk' | 'delayed'
  timeline: TimelineItem[]
}

interface ProgressTrackerProps {
  project: Project
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ project }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'on-track': return 'text-success'
      case 'at-risk': return 'text-warning'
      case 'delayed': return 'text-error'
      default: return 'text-muted'
    }
  }

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'on-track': return <CheckCircle2 className="h-4 w-4" />
      case 'at-risk': return <AlertTriangle className="h-4 w-4" />
      case 'delayed': return <AlertTriangle className="h-4 w-4" />
      default: return null
    }
  }

  const paymentProgress = (project.paidAmount / project.totalValue) * 100

  return (
    <div className="border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-foreground">{project.projectName}</h4>
          <p className="text-sm text-muted">{project.clientName}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className={clsx(
            "flex items-center text-sm font-medium",
            getStatusColor(project.status)
          )}>
            {getStatusIcon(project.status)}
            <span className="ml-1 capitalize">{project.status.replace('-', ' ')}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Project Progress</span>
          <span className="text-sm text-muted">{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-foreground mb-3">Timeline</h5>
        <div className="flex items-center space-x-4">
          {project.timeline.map((item, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className={clsx(
                "w-3 h-3 rounded-full border-2",
                item.completed 
                  ? "bg-success border-success" 
                  : "bg-white border-gray-300"
              )} />
              <div className="text-xs text-muted mt-1 text-center">
                <div>{item.phase}</div>
                <div>{formatDate(item.date)}</div>
              </div>
              {index < project.timeline.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-300 absolute transform translate-x-6" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
        <div className="text-center">
          <div className="flex items-center justify-center text-muted mb-1">
            <DollarSign className="h-4 w-4 mr-1" />
            Total Value
          </div>
          <div className="font-semibold text-foreground">
            ${project.totalValue.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <div className="text-muted mb-1">Paid</div>
          <div className="font-semibold text-success">
            ${project.paidAmount.toLocaleString()}
          </div>
          <div className="text-xs text-muted">
            {paymentProgress.toFixed(0)}% collected
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center text-muted mb-1">
            <Calendar className="h-4 w-4 mr-1" />
            Next Payment
          </div>
          <div className="font-semibold text-warning">
            ${project.nextPayment.toLocaleString()}
          </div>
          <div className="text-xs text-muted">
            Due {formatDate(project.dueDate)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressTracker 