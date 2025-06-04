import React from 'react'
import { useNavigate } from 'react-router-dom'
import ClientSummaryCard from './ClientSummaryCard'

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
  tags?: string[]
  created_at: string
}

interface LeadCardProps {
  lead: Lead
}

const LeadCard: React.FC<LeadCardProps> = ({ lead }) => {
  const navigate = useNavigate()

  const handleClientClick = (clientId: number) => {
    navigate(`/admin/client/${clientId}`)
  }

  const handleAction = (action: string, clientId: number) => {
    switch (action) {
      case 'contact':
        // Navigate to project messaging for this client's projects, or offer contact options
        if (lead.email) {
          // Open email client
          window.location.href = `mailto:${lead.email}?subject=Pleasant Cove Design - Following up on your project`
        } else if (lead.phone) {
          // Open phone dialer
          window.location.href = `tel:${lead.phone}`
        } else {
          // Navigate to client profile for contact options
          navigate(`/admin/client/${clientId}`)
        }
        break
      case 'schedule':
        // Navigate to schedule page with this client pre-selected
        navigate(`/schedule?client=${clientId}`)
        break
      case 'notes':
        // Navigate to admin client profile where notes can be viewed/edited
        navigate(`/admin/client/${clientId}#notes`)
        break
    }
  }

  // Convert lead to client format for the standardized card
  const clientData = {
    id: parseInt(lead.id),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    businessType: lead.business_type,
    stage: lead.stage,
    score: lead.score,
    priority: lead.priority,
    tags: lead.tags,
    notes: lead.message,
    createdAt: lead.created_at
  }

  return (
    <ClientSummaryCard
      client={clientData}
      mode="expanded"
      onClientClick={handleClientClick}
      onActionClick={handleAction}
      showActions={true}
      showScore={true}
      showTags={true}
      showStage={true}
      showContactInfo={true}
      showNotes={true}
      className="lead-card"
    />
  )
}

export default LeadCard 