import React, { useState } from 'react'
import { Save, Phone, Mail, MapPin, FileText, Zap } from 'lucide-react'
import ClientNote from '../components/ClientNote'
import QuickAction from '../components/QuickAction'

const Settings: React.FC = () => {
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Pleasant Cove Design',
    email: 'hello@pleasantcovedesign.com',
    phone: '555-0987',
    address: '123 Design Street, Creative City, CC 12345',
    website: 'https://pleasantcovedesign.com',
  })

  const [notes, setNotes] = useState([
    {
      id: '1',
      title: 'Client Onboarding Process',
      content: 'Updated onboarding flow to include brand questionnaire and timeline discussion.',
      createdAt: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      title: 'Project Pricing Updates',
      content: 'Increased pricing for complex e-commerce sites by 20% to account for additional features.',
      createdAt: '2024-01-14T14:20:00Z',
    },
  ])

  const quickActions = [
    {
      id: '1',
      title: 'Export Leads',
      description: 'Download CSV of all leads',
      icon: FileText,
      action: () => alert('Export functionality coming soon!'),
    },
    {
      id: '2',
      title: 'Send Follow-up Emails',
      description: 'Bulk email to inactive leads',
      icon: Mail,
      action: () => alert('Email functionality coming soon!'),
    },
    {
      id: '3',
      title: 'Generate Reports',
      description: 'Monthly performance report',
      icon: Zap,
      action: () => alert('Reports functionality coming soon!'),
    },
  ]

  const handleBusinessInfoChange = (field: string, value: string) => {
    setBusinessInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveBusinessInfo = () => {
    // TODO: Implement save functionality
    alert('Business information saved!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted mt-1">Manage your business information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Information */}
        <div className="bg-white rounded-xl shadow-sm border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Business Information</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Business Name
              </label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => handleBusinessInfoChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                value={businessInfo.email}
                onChange={(e) => handleBusinessInfoChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={businessInfo.phone}
                onChange={(e) => handleBusinessInfoChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Address
              </label>
              <textarea
                value={businessInfo.address}
                onChange={(e) => handleBusinessInfoChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Website
              </label>
              <input
                type="url"
                value={businessInfo.website}
                onChange={(e) => handleBusinessInfoChange('website', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSaveBusinessInfo}
              className="btn-primary w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              {quickActions.map((action) => (
                <QuickAction key={action.id} action={action} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Business Notes</h3>
            </div>
            <div className="p-6 space-y-4">
              {notes.map((note) => (
                <ClientNote key={note.id} note={note} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 