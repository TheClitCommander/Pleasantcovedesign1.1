import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus } from 'lucide-react'
// @ts-ignore
import LeadCard from '../components/LeadCard'
import api from '../api'

interface Business {
  id: number
  name: string
  email?: string
  phone: string
  businessType: string
  stage: string
  priority?: string
  score?: number
  notes?: string
  createdAt?: string
}

const Leads: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const res = await api.get<Business[]>('/businesses')
        setBusinesses(res.data)
      } catch (err) {
        console.error('Failed to fetch leads', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBusinesses()
  }, [])

  // Mock leads data
  const allLeads = [
    {
      id: '1',
      name: 'Coastal Electric',
      email: 'info@coastalelectric.com',
      phone: '555-0123',
      business_type: 'electrical',
      message: 'Need a professional website for our electrical services',
      stage: 'scheduled' as const,
      priority: 'high' as const,
      created_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      name: 'Harbor Plumbing',
      email: 'contact@harborplumbing.com',
      phone: '555-0456',
      business_type: 'plumbing',
      message: 'Looking for a modern website design',
      stage: 'contacted' as const,
      priority: 'high' as const,
      created_at: '2024-01-14T14:20:00Z',
    },
    {
      id: '3',
      name: 'Bay Construction',
      email: 'hello@bayconstruction.com',
      phone: '555-0789',
      business_type: 'construction',
      message: 'Need a complete rebrand and website',
      stage: 'qualified' as const,
      priority: 'medium' as const,
      created_at: '2024-01-13T09:15:00Z',
    },
    {
      id: '4',
      name: 'Sunset Landscaping',
      email: 'info@sunsetlandscaping.com',
      phone: '555-0321',
      business_type: 'landscaping',
      message: 'Portfolio website needed',
      stage: 'scraped' as const,
      priority: 'low' as const,
      created_at: '2024-01-12T16:45:00Z',
    },
  ]

  // Filter leads based on search and filters
  const mappedLeads = businesses.map((b) => ({
    id: b.id.toString(),
    name: b.name,
    email: b.email || '',
    phone: b.phone,
    business_type: b.businessType,
    message: (b.notes || ''),
    stage: b.stage as any,
    priority: (b.priority || 'low') as any,
    created_at: b.createdAt || '',
    score: b.score,
  }))

  const filteredLeads = mappedLeads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.business_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStage = stageFilter === 'all' || lead.stage === stageFilter
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter
    
    return matchesSearch && matchesStage && matchesPriority
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Leads Management</h1>
        <button className="btn-primary mt-4 sm:mt-0">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Stage Filter */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="scraped">Scraped</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('')
              setStageFilter('all')
              setPriorityFilter('all')
            }}
            className="btn-secondary"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Leads ({filteredLeads.length})
          </h3>
        </div>
        <div className="p-6">
          {filteredLeads.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted">No leads found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leads 