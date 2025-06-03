import React from 'react'
import { LucideIcon, ArrowRight } from 'lucide-react'

interface Action {
  id: string
  title: string
  description: string
  icon: LucideIcon
  action: () => void
}

interface QuickActionProps {
  action: Action
}

const QuickAction: React.FC<QuickActionProps> = ({ action }) => {
  const Icon = action.icon

  return (
    <button
      onClick={action.action}
      className="w-full text-left p-4 border border-border rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-primary-100 rounded-lg mr-3 group-hover:bg-primary-200 transition-colors">
            <Icon className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{action.title}</h4>
            <p className="text-sm text-muted">{action.description}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary-600 transition-colors" />
      </div>
    </button>
  )
}

export default QuickAction 