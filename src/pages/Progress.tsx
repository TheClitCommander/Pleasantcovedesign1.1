import React from 'react'
import { DollarSign, Clock, CheckCircle } from 'lucide-react'
import ProgressTracker from '../components/ProgressTracker'

const Progress: React.FC = () => {
  // No mock project data - start with empty state to see real data clearly
  const projects: any[] = []

  const totalRevenue = projects.reduce((sum, project) => sum + project.totalValue, 0)
  const totalPaid = projects.reduce((sum, project) => sum + project.paidAmount, 0)
  const totalPending = projects.reduce((sum, project) => sum + project.nextPayment, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Project Progress</h1>
        <p className="text-muted mt-1">Track your active projects and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Payments Received</p>
              <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Pending Payments</p>
              <p className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-white rounded-xl shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Active Projects</h3>
        </div>
        <div className="p-6">
          {projects.length > 0 ? (
            <div className="space-y-6">
              {projects.map((project) => (
                <ProgressTracker key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="h-16 w-16 mx-auto" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Projects</h4>
              <p className="text-gray-500">Projects will appear here when you start working with clients.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Progress 