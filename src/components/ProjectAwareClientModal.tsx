import React, { useState, useEffect } from 'react';
import { Building2, FolderOpen, Plus, ChevronRight, Star, Globe, Activity, CreditCard } from 'lucide-react';
import type { Company, Project } from '../../shared/schema';

interface ProjectAwareClient {
  id: number;
  name: string;
  email: string;
  phone: string;
  industry: string;
  priority: string;
  projectCount: number;
}

interface ProjectAwareClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (company: Company, project: Project) => void;
  datetime: string;
}

interface ProjectWithCompany extends Project {
  companyName: string;
}

export default function ProjectAwareClientModal({ 
  isOpen, 
  onClose, 
  onProjectSelect, 
  datetime 
}: ProjectAwareClientModalProps) {
  const [step, setStep] = useState<'search' | 'company-select' | 'project-select' | 'create-company' | 'create-project'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectAwareClient[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyProjects, setCompanyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  
  // New company creation
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    email: '',
    phone: '',
    industry: '',
    address: '',
    city: '',
    state: ''
  });

  // New project creation
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    type: 'website' as const,
    notes: '',
    stage: 'scraped' as const
  });

  // Search for existing companies
  useEffect(() => {
    const searchCompanies = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const [companiesRes, projectsRes] = await Promise.all([
          fetch(`/api/companies?token=pleasantcove2024admin`),
          fetch(`/api/projects?token=pleasantcove2024admin`)
        ]);

        if (companiesRes.ok && projectsRes.ok) {
          const companies: Company[] = await companiesRes.json();
          const projects: Project[] = await projectsRes.json();

          // Filter companies by search query
          const filteredCompanies = companies.filter(company =>
            company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (company.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            company.industry.toLowerCase().includes(searchQuery.toLowerCase())
          );

          // Count projects per company
          const projectCounts = projects.reduce((acc, project) => {
            acc[project.companyId] = (acc[project.companyId] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);

          // Convert to search results format
          const results: ProjectAwareClient[] = filteredCompanies.map(company => ({
            id: company.id!,
            name: company.name,
            email: company.email || '',
            phone: company.phone,
            industry: company.industry,
            priority: company.priority || 'medium',
            projectCount: projectCounts[company.id!] || 0
          }));

          setSearchResults(results);
        }
      } catch (error) {
        console.error('Failed to search companies:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCompanies, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Fetch projects for selected company
  const fetchCompanyProjects = async (companyId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/projects?token=pleasantcove2024admin`);
      if (response.ok) {
        const projects = await response.json();
        setCompanyProjects(projects.filter((p: Project) => p.status === 'active'));
      }
    } catch (error) {
      console.error('Failed to fetch company projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle company selection
  const handleCompanySelect = async (clientData: ProjectAwareClient) => {
    // Get full company data
    try {
      const response = await fetch(`/api/companies/${clientData.id}?token=pleasantcove2024admin`);
      if (response.ok) {
        const company: Company = await response.json();
        setSelectedCompany(company);
        await fetchCompanyProjects(company.id!);
        setStep('project-select');
      }
    } catch (error) {
      console.error('Failed to fetch company details:', error);
    }
  };

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    if (selectedCompany) {
      onProjectSelect(selectedCompany, project);
      handleClose();
    }
  };

  // Create new company
  const handleCreateCompany = async () => {
    if (!newCompanyData.name.trim()) {
      alert('Please enter a company name');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/companies?token=pleasantcove2024admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCompanyData.name,
          email: newCompanyData.email,
          phone: newCompanyData.phone || '(555) 000-0000',
          address: newCompanyData.address || 'To be updated',
          city: newCompanyData.city || 'To be updated',
          state: newCompanyData.state || 'VA',
          industry: newCompanyData.industry || 'consultation',
          priority: 'medium',
          tags: ['new-client']
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create company');
      }

      const newCompany = await response.json();
      setSelectedCompany(newCompany);
      setCompanyProjects([]);
      setStep('create-project');
    } catch (error) {
      console.error('Failed to create company:', error);
      alert('Failed to create company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Create new project
  const handleCreateProject = async () => {
    if (!selectedCompany || !newProjectData.title.trim()) {
      alert('Please enter a project title');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/projects?token=pleasantcove2024admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompany.id,
          title: newProjectData.title,
          type: newProjectData.type,
          stage: newProjectData.stage,
          status: 'active',
          notes: newProjectData.notes || 'Created for appointment scheduling',
          score: 75
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const newProject = await response.json();
      onProjectSelect(selectedCompany, newProject);
      handleClose();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCompany(null);
    setCompanyProjects([]);
    setStep('search');
    setNewCompanyData({ name: '', email: '', phone: '', industry: '', address: '', city: '', state: '' });
    setNewProjectData({ title: '', type: 'website', notes: '', stage: 'scraped' });
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'website': return <Globe className="w-4 h-4" />;
      case 'seo': return <Activity className="w-4 h-4" />;
      case 'ecommerce': return <CreditCard className="w-4 h-4" />;
      case 'branding': return <Star className="w-4 h-4" />;
      default: return <FolderOpen className="w-4 h-4" />;
    }
  };

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'website': return 'bg-blue-100 text-blue-800';
      case 'seo': return 'bg-green-100 text-green-800';
      case 'ecommerce': return 'bg-purple-100 text-purple-800';
      case 'branding': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'scraped': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'responded': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'quoted': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold">
            {step === 'search' && '🏢 Select Company for Appointment'}
            {step === 'company-select' && '🏢 Select Company'}
            {step === 'project-select' && '📁 Select Project'}
            {step === 'create-company' && '➕ Create New Company'}
            {step === 'create-project' && '📁 Create New Project'}
          </h2>
          
          {/* Breadcrumb */}
          <div className="text-sm text-gray-600 mt-1">
            {step === 'project-select' && selectedCompany && (
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>{selectedCompany.name}</span>
                <ChevronRight className="w-4 h-4" />
                <span>Select Project</span>
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mt-2 p-2 bg-blue-50 rounded">
            <strong>Appointment Time:</strong> {new Date(datetime).toLocaleString()}
          </div>
        </div>

        {/* Search Step */}
        {step === 'search' && (
          <>
            <div className="mb-4">
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Search companies by name, email, or industry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto mb-4">
              {loading && (
                <div className="text-center py-4 text-gray-500">Searching...</div>
              )}
              
              {!loading && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No companies found. Try a different search term.
                </div>
              )}
              
              {searchResults.map((client) => (
                <div
                  key={client.id}
                  className="border rounded-lg p-3 mb-2 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleCompanySelect(client)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <h3 className="font-semibold">{client.name}</h3>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="capitalize">📋 {client.industry}</div>
                        {client.email && <div>📧 {client.email}</div>}
                        {client.phone && <div>📞 {client.phone}</div>}
                        <div className="flex items-center space-x-1 mt-1">
                          <FolderOpen className="w-4 h-4" />
                          <span>{client.projectCount} project{client.projectCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 ml-4">
                      <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(client.priority)}`}>
                        {client.priority} priority
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('create-company')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Company</span>
              </button>
              <button
                onClick={handleClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* Project Selection Step */}
        {step === 'project-select' && selectedCompany && (
          <>
            <div className="flex-1 overflow-y-auto mb-4">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading projects...</div>
              ) : companyProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">No active projects for this company</p>
                  <button
                    onClick={() => setStep('create-project')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Project</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {companyProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleProjectSelect(project)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {getProjectTypeIcon(project.type)}
                            <h4 className="font-semibold">{project.title}</h4>
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${getProjectTypeColor(project.type)}`}>
                              {project.type}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${getStageColor(project.stage)}`}>
                              {project.stage}
                            </span>
                            {project.score && (
                              <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                                Score: {project.score}
                              </span>
                            )}
                          </div>
                          {project.notes && (
                            <p className="text-sm text-gray-600 mt-1 truncate">{project.notes}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('create-project')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Project</span>
              </button>
              <div className="space-x-2">
                <button
                  onClick={() => setStep('search')}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  ← Back
                </button>
                <button
                  onClick={handleClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {/* Create Company Step */}
        {step === 'create-company' && (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.name}
                    onChange={(e) => setNewCompanyData({...newCompanyData, name: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Industry</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.industry}
                    onChange={(e) => setNewCompanyData({...newCompanyData, industry: e.target.value})}
                  >
                    <option value="">Select industry</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="hvac">HVAC</option>
                    <option value="roofing">Roofing</option>
                    <option value="construction">Construction</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="consultation">Consultation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.email}
                    onChange={(e) => setNewCompanyData({...newCompanyData, email: e.target.value})}
                    placeholder="contact@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.phone}
                    onChange={(e) => setNewCompanyData({...newCompanyData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.address}
                    onChange={(e) => setNewCompanyData({...newCompanyData, address: e.target.value})}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.city}
                    onChange={(e) => setNewCompanyData({...newCompanyData, city: e.target.value})}
                    placeholder="Norfolk"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={newCompanyData.state}
                    onChange={(e) => setNewCompanyData({...newCompanyData, state: e.target.value})}
                    placeholder="VA"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setStep('search')}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                ← Back to Search
              </button>
              <div className="space-x-2">
                <button
                  onClick={handleClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCompany}
                  disabled={loading || !newCompanyData.name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded"
                >
                  {loading ? 'Creating...' : 'Create Company →'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Create Project Step */}
        {step === 'create-project' && selectedCompany && (
          <>
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium mb-1">Project Title *</label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2"
                  value={newProjectData.title}
                  onChange={(e) => setNewProjectData({...newProjectData, title: e.target.value})}
                  placeholder="e.g., Website Redesign, SEO Campaign"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Type</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={newProjectData.type}
                    onChange={(e) => setNewProjectData({...newProjectData, type: e.target.value as any})}
                  >
                    <option value="website">Website</option>
                    <option value="seo">SEO</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="branding">Branding</option>
                    <option value="consultation">Consultation</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Initial Stage</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={newProjectData.stage}
                    onChange={(e) => setNewProjectData({...newProjectData, stage: e.target.value as any})}
                  >
                    <option value="scraped">Initial Inquiry</option>
                    <option value="contacted">Contacted</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="quoted">Ready to Quote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Project Notes</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={newProjectData.notes}
                  onChange={(e) => setNewProjectData({...newProjectData, notes: e.target.value})}
                  placeholder="Add any notes about this project"
                />
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setStep('project-select')}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
              >
                ← Back to Projects
              </button>
              <div className="space-x-2">
                <button
                  onClick={handleClose}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={loading || !newProjectData.title.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded"
                >
                  {loading ? 'Creating...' : 'Create & Schedule'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 