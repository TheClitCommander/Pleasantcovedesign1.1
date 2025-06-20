import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, Plus, Building2 } from 'lucide-react'
import EntitySummaryCard from '../components/EntitySummaryCard'
import api from '../api'
import type { Company, Project } from '../../shared/schema'

interface Tag {
  id: number;
  name: string;
  color: string;
  count: number;
}

interface CompanyWithProjects extends Company {
  projects: Project[]
  totalPaid: number
  expandedProjects?: boolean
}

const Leads: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('all')
  const [companies, setCompanies] = useState<CompanyWithProjects[]>([])
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, projectsRes, tagsRes] = await Promise.all([
          api.get<Company[]>('/companies'),
          api.get<Project[]>('/projects'),
          api.get<Tag[]>('/tags')
        ])
        
        const projectsByCompany = projectsRes.data.reduce((acc, project) => {
          if (!acc[project.companyId]) {
            acc[project.companyId] = []
          }
          acc[project.companyId].push(project)
          return acc
        }, {} as Record<number, Project[]>)

        const companiesWithProjects: CompanyWithProjects[] = companiesRes.data.map(company => {
          const companyProjects = projectsByCompany[company.id!] || []
          const totalPaid = companyProjects.reduce((sum, project) => sum + (project.paidAmount || 0), 0)
          
          return {
            ...company,
            projects: companyProjects,
            totalPaid,
            expandedProjects: false
          }
        })

        setCompanies(companiesWithProjects)
        setAvailableTags(tagsRes.data)
      } catch (err) {
        console.error('Failed to fetch data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter === 'high-priority') {
      setPriorityFilter('high')
    }
  }, [searchParams])

  const toggleCompanyExpansion = (companyId: number) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(companyId)) {
        newSet.delete(companyId)
      } else {
        newSet.add(companyId)
      }
      return newSet
    })
  }

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (company.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.projects.some(project => 
                           project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.type.toLowerCase().includes(searchTerm.toLowerCase())
                         )
    
    const matchesPriority = priorityFilter === 'all' || company.priority === priorityFilter
    
    const companyTags = company.tags || [];
    const matchesTag = tagFilter === 'all' || companyTags.includes(tagFilter);

    const matchesStage = stageFilter === 'all' || 
                        company.projects.some(project => project.stage === stageFilter)

    const matchesProjectType = projectTypeFilter === 'all' ||
                              company.projects.some(project => project.type === projectTypeFilter)
    
    return matchesSearch && matchesPriority && matchesTag && matchesStage && matchesProjectType
  })

  const getFilteredProjects = (company: CompanyWithProjects): Project[] => {
    return company.projects.filter(project => {
      const matchesStage = stageFilter === 'all' || project.stage === stageFilter
      const matchesProjectType = projectTypeFilter === 'all' || project.type === projectTypeFilter
      const matchesSearch = searchTerm === '' || 
                           project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesStage && matchesProjectType && matchesSearch
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Companies & Projects</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredCompanies.length} companies, {filteredCompanies.reduce((sum, c) => sum + c.projects.length, 0)} total projects
          </p>
        </div>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <button className="btn-secondary">
            <Building2 className="h-4 w-4 mr-2" />
            Add Company
          </button>
          <button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search companies & projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="scraped">Scraped</option>
              <option value="contacted">Contacted</option>
              <option value="responded">Responded</option>
              <option value="scheduled">Scheduled</option>
              <option value="quoted">Quoted</option>
              <option value="sold">Sold</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
              <option value="paid">Paid</option>
            </select>
          </div>

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

          <div>
            <select
              value={projectTypeFilter}
              onChange={(e) => setProjectTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Project Types</option>
              <option value="website">Website</option>
              <option value="seo">SEO</option>
              <option value="ecommerce">E-commerce</option>
              <option value="branding">Branding</option>
              <option value="consultation">Consultation</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setSearchTerm('')
              setStageFilter('all')
              setPriorityFilter('all')
              setTagFilter('all')
              setProjectTypeFilter('all')
            }}
            className="btn-secondary"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Companies & Projects ({filteredCompanies.length} companies)
          </h3>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted">Loading companies and projects...</p>
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompanies.map((company) => {
                const isExpanded = expandedCompanies.has(company.id!)
                const filteredProjects = getFilteredProjects(company)
                
                return (
                  <div key={company.id} className="space-y-2">
                    <EntitySummaryCard
                      type="company"
                      data={company}
                      expanded={isExpanded}
                      onExpandClick={() => toggleCompanyExpansion(company.id!)}
                      projectCount={company.projects.length}
                      totalPaid={company.totalPaid}
                      mode="expanded"
                      showActions={true}
                      onContact={() => console.log('Contact company:', company.name)}
                      onSchedule={() => console.log('Schedule with company:', company.name)}
                      onNotes={() => console.log('View notes for company:', company.name)}
                    />
                    
                    {isExpanded && filteredProjects.length > 0 && (
                      <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                        {filteredProjects.map((project) => (
                          <EntitySummaryCard
                            key={project.id}
                            type="project"
                            data={project}
                            companyName={company.name}
                            mode="expanded"
                            showActions={true}
                            onContact={() => console.log('Update project:', project.title)}
                            onSchedule={() => console.log('Schedule for project:', project.title)}
                            onNotes={() => console.log('View notes for project:', project.title)}
                          />
                        ))}
                      </div>
                    )}
                    
                    {isExpanded && filteredProjects.length === 0 && company.projects.length === 0 && (
                      <div className="ml-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                        <p className="text-gray-500">No projects yet</p>
                        <button className="btn-secondary mt-2 text-sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add First Project
                        </button>
                      </div>
                    )}
                    
                    {isExpanded && filteredProjects.length === 0 && company.projects.length > 0 && (
                      <div className="ml-4 p-4 border border-gray-200 rounded-lg text-center bg-gray-50">
                        <p className="text-gray-500 text-sm">
                          {company.projects.length} project{company.projects.length !== 1 ? 's' : ''} hidden by filters
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted">No companies found matching your criteria.</p>
              <button className="btn-primary mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Company
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leads 