import React from 'react'
import { DollarSign, Clock, CheckCircle } from 'lucide-react'
import ProgressTracker from '../components/ProgressTracker'

const Progress: React.FC = () => {
  // Mock project data
  const projects = [
    {
      id: '1',
      clientName: 'Coastal Electric',
      projectName: 'Business Website Development',
      stage: 'Design',
      progress: 75,
      totalValue: 5000,
      paidAmount: 2500,
      nextPayment: 1250,
      dueDate: '2024-02-15',
      status: 'on-track' as const,
      timeline: [
        { phase: 'Discovery', completed: true, date: '2024-01-10' },
        { phase: 'Design', completed: false, date: '2024-01-20' },
        { phase: 'Development', completed: false, date: '2024-02-01' },
        { phase: 'Launch', completed: false, date: '2024-02-15' },
      ]
    },
    {
      id: '2',
      clientName: 'Harbor Plumbing',
      projectName: 'Website Redesign',
      stage: 'Development',
      progress: 45,
      totalValue: 3500,
      paidAmount: 1750,
      nextPayment: 875,
      dueDate: '2024-02-28',
      status: 'at-risk' as const,
      timeline: [
        { phase: 'Discovery', completed: true, date: '2024-01-05' },
        { phase: 'Design', completed: true, date: '2024-01-15' },
        { phase: 'Development', completed: false, date: '2024-02-01' },
        { phase: 'Launch', completed: false, date: '2024-02-28' },
      ]
    },
    {
      id: '3',
      clientName: 'Bay Construction',
      projectName: 'Brand & Website Package',
      stage: 'Discovery',
      progress: 25,
      totalValue: 8000,
      paidAmount: 2000,
      nextPayment: 2000,
      dueDate: '2024-03-15',
      status: 'on-track' as const,
      timeline: [
        { phase: 'Discovery', completed: false, date: '2024-01-25' },
        { phase: 'Design', completed: false, date: '2024-02-10' },
        { phase: 'Development', completed: false, date: '2024-02-25' },
        { phase: 'Launch', completed: false, date: '2024-03-15' },
      ]
    },
  ]

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
        <div className="p-6 space-y-6">
          {projects.map((project) => (
            <ProgressTracker key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Progress 