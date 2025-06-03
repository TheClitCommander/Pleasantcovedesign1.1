import React from 'react'
import { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

interface StatCardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon 
}) => {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {change && (
            <p className={clsx(
              "text-sm font-medium mt-1",
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-error',
              changeType === 'neutral' && 'text-muted'
            )}>
              {change}
            </p>
          )}
        </div>
        <div className="ml-4">
          <Icon className="h-8 w-8 text-primary-500" />
        </div>
      </div>
    </div>
  )
}

export default StatCard 