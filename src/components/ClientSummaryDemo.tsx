import React from 'react'
import ClientSummaryCard from './ClientSummaryCard'

const ClientSummaryDemo: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <div className="h-16 w-16 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
            📋
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Demo Component</h2>
        <p className="text-gray-500">This demo component has been cleared to show real data more clearly.</p>
      </div>
    </div>
  )
}

export default ClientSummaryDemo 