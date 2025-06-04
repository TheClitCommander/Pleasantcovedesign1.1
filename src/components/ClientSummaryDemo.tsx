import React from 'react'
import ClientSummaryCard from './ClientSummaryCard'

const ClientSummaryDemo: React.FC = () => {
  // Sample client data
  const sampleClients = [
    {
      id: 1,
      name: "Coastal Electric",
      email: "info@coastalelectric.com",
      phone: "(555) 123-4567",
      businessType: "electrical",
      stage: "contacted",
      score: 85,
      priority: "high" as const,
      tags: ["electrical", "residential", "high-value", "local"],
      notes: "Specializes in residential electrical work. Very interested in website redesign.",
      createdAt: "2024-01-15",
      lastContactDate: "2024-01-20"
    },
    {
      id: 2,
      name: "Bay Construction",
      email: "hello@bayconstruction.com",
      phone: "(555) 234-5678",
      businessType: "construction",
      stage: "quoted",
      score: 65,
      priority: "medium" as const,
      tags: ["construction", "commercial", "new-client"],
      notes: "Looking for modern website with project gallery.",
      createdAt: "2024-01-10"
    },
    {
      id: 3,
      name: "Sunset Landscaping",
      email: "",
      phone: "(555) 345-6789",
      businessType: "landscaping",
      stage: "scraped",
      score: 40,
      priority: "low" as const,
      tags: ["landscaping", "residential"],
      notes: "Basic website needs. Budget-conscious.",
      createdAt: "2024-01-05"
    }
  ]

  const handleClientClick = (clientId: number) => {
    console.log('Navigate to client:', clientId)
  }

  const handleAction = (action: string, clientId: number) => {
    console.log('Action:', action, 'for client:', clientId)
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">ClientSummaryCard Design System Demo</h2>
        <p className="text-gray-600 mb-6">
          Standardized card component used across Leads, Inbox, Schedule, and Progress views.
        </p>
      </div>

      {/* Compact Mode Demo */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🔸 Compact Mode (Dashboard/Lists)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleClients.map((client) => (
            <ClientSummaryCard
              key={client.id}
              client={client}
              mode="compact"
              onClientClick={handleClientClick}
              showActions={false}
              showContactInfo={false}
              showNotes={false}
            />
          ))}
        </div>
      </div>

      {/* Expanded Mode Demo */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🔸 Expanded Mode (Leads Page)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sampleClients.slice(0, 2).map((client) => (
            <ClientSummaryCard
              key={client.id}
              client={client}
              mode="expanded"
              onClientClick={handleClientClick}
              onActionClick={handleAction}
            />
          ))}
        </div>
      </div>

      {/* Draggable Mode Demo */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🔸 Draggable Mode (Schedule Sidebar)</h3>
        <div className="w-64 bg-gray-50 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3 text-gray-800">📋 Pending Appointments</h4>
          <div className="space-y-3">
            {sampleClients.map((client) => (
              <ClientSummaryCard
                key={client.id}
                client={client}
                mode="expanded"
                draggable={true}
                showActions={false}
                showStage={true}
                showScore={true}
                className="text-sm"
              >
                <div className="text-xs text-blue-600 mt-2 font-medium">
                  👆 Drag to calendar to schedule
                </div>
              </ClientSummaryCard>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">✨ Standardized Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-semibold mb-2">🎨 Visual Standards:</h4>
            <ul className="space-y-1 ml-4">
              <li>• Priority-based border colors (red/yellow/green)</li>
              <li>• Consistent score badges</li>
              <li>• Standardized tag styling</li>
              <li>• Hover effects and transitions</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🔧 Functionality:</h4>
            <ul className="space-y-1 ml-4">
              <li>• Compact/Expanded/Draggable modes</li>
              <li>• Configurable sections (toggle any section)</li>
              <li>• Click handlers for navigation</li>
              <li>• Drag & drop support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ClientSummaryDemo 