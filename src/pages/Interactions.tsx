import React from 'react'
import { Clock, MessageCircle } from 'lucide-react'
import InteractionTimeline from '../components/InteractionTimeline'

const Interactions: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interaction Timeline</h1>
          <p className="text-muted">Track all client interactions and activities</p>
        </div>
      </div>

      {/* Timeline */}
      <InteractionTimeline limit={100} showBusinessName={true} />

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Activity Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <span className="font-medium">Lead Management:</span>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Lead received</li>
                  <li>• Business created</li>
                  <li>• Response received</li>
                </ul>
              </div>
              <div>
                <span className="font-medium">Scheduling:</span>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Appointment scheduled</li>
                  <li>• Appointment updated</li>
                  <li>• Squarespace bookings</li>
                </ul>
              </div>
              <div>
                <span className="font-medium">Outreach:</span>
                <ul className="mt-1 ml-4 space-y-1">
                  <li>• Campaign sent</li>
                  <li>• Phone calls</li>
                  <li>• Bot interactions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Interactions 