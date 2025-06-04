import React from 'react';
import { User, Building2, Phone, Mail, Globe, CreditCard, ChevronRight, ChevronDown, FolderOpen, Calendar, DollarSign, Activity, Star } from 'lucide-react';
import type { Company, Project } from '../../shared/schema';

interface EntitySummaryCardProps {
  type: 'company' | 'project';
  data: Company | Project;
  expanded?: boolean;
  onExpandClick?: () => void;
  projectCount?: number; // for companies
  totalPaid?: number; // for companies
  lastActivity?: string; // for projects
  companyName?: string; // for projects
  mode?: 'compact' | 'expanded' | 'draggable';
  showActions?: boolean;
  onContact?: () => void;
  onSchedule?: () => void;
  onNotes?: () => void;
}

const EntitySummaryCard: React.FC<EntitySummaryCardProps> = ({
  type,
  data,
  expanded = false,
  onExpandClick,
  projectCount = 0,
  totalPaid = 0,
  lastActivity,
  companyName,
  mode = 'compact',
  showActions = true,
  onContact,
  onSchedule,
  onNotes
}) => {
  // Helper to get priority styling
  const getPriorityStyles = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50 hover:bg-red-100';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100';
      case 'low':
        return 'border-green-300 bg-green-50 hover:bg-green-100';
      default:
        return 'border-gray-300 bg-white hover:bg-gray-50';
    }
  };

  // Helper to get stage badge color
  const getStageColor = (stage?: string) => {
    switch (stage) {
      case 'scraped': return 'bg-gray-100 text-gray-800';
      case 'contacted': return 'bg-blue-100 text-blue-800';
      case 'responded': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      case 'quoted': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-emerald-100 text-emerald-800';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800';
      case 'delivered': return 'bg-teal-100 text-teal-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper to get project type icon and color
  const getProjectTypeStyles = (projectType?: string) => {
    switch (projectType) {
      case 'website':
        return { icon: <Globe className="w-4 h-4" />, color: 'bg-blue-100 text-blue-800' };
      case 'seo':
        return { icon: <Activity className="w-4 h-4" />, color: 'bg-green-100 text-green-800' };
      case 'ecommerce':
        return { icon: <CreditCard className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800' };
      case 'branding':
        return { icon: <Star className="w-4 h-4" />, color: 'bg-pink-100 text-pink-800' };
      case 'consultation':
        return { icon: <FolderOpen className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { icon: <FolderOpen className="w-4 h-4" />, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const baseClasses = `
    border-2 rounded-lg p-4 transition-all duration-200 cursor-pointer
    ${getPriorityStyles(type === 'company' ? (data as Company).priority : undefined)}
    ${mode === 'draggable' ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}
  `;

  if (type === 'company') {
    const company = data as Company;
    
    return (
      <div className={baseClasses}>
        {/* Company Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Building2 className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {company.name}
              </h3>
              <p className="text-sm text-gray-600 capitalize">
                {company.industry}
              </p>
            </div>
          </div>
          
          {/* Expand Button */}
          {onExpandClick && projectCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpandClick();
              }}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </button>
          )}
        </div>

        {/* Contact Info */}
        {mode !== 'compact' && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{company.phone}</span>
            </div>
            {company.email && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{company.email}</span>
              </div>
            )}
            {company.website && (
              <div className="flex items-center text-sm text-gray-600">
                <Globe className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{company.website}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {company.tags && company.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {company.tags.slice(0, mode === 'compact' ? 3 : 5).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
            {company.tags.length > (mode === 'compact' ? 3 : 5) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                +{company.tags.length - (mode === 'compact' ? 3 : 5)}
              </span>
            )}
          </div>
        )}

        {/* Company Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              {projectCount} project{projectCount !== 1 ? 's' : ''}
            </span>
            {totalPaid > 0 && (
              <span className="text-green-600 font-medium">
                <DollarSign className="w-4 h-4 inline mr-1" />
                ${totalPaid.toLocaleString()}
              </span>
            )}
          </div>
          
          {/* Priority Badge */}
          {company.priority && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              company.priority === 'high' ? 'bg-red-100 text-red-800' :
              company.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {company.priority}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && mode !== 'compact' && (
          <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onContact?.();
              }}
              className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              Contact
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule?.();
              }}
              className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-100 transition-colors"
            >
              Schedule
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNotes?.();
              }}
              className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Notes
            </button>
          </div>
        )}
      </div>
    );
  }

  // Project View
  const project = data as Project;
  const typeStyles = getProjectTypeStyles(project.type);

  return (
    <div className={`${baseClasses} ml-4`}> {/* Slight indent for projects */}
      {/* Project Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {typeStyles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-gray-900 truncate">
              {project.title}
            </h4>
            {companyName && (
              <p className="text-sm text-gray-500">
                for {companyName}
              </p>
            )}
          </div>
        </div>
        
        {/* Score */}
        {project.score && project.score > 0 && (
          <div className="flex items-center space-x-1 text-sm">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="font-medium text-gray-700">{project.score}</span>
          </div>
        )}
      </div>

      {/* Project Type & Stage */}
      <div className="flex items-center space-x-2 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeStyles.color}`}>
          {project.type}
        </span>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(project.stage)}`}>
          {project.stage}
        </span>
      </div>

      {/* Project Details */}
      {mode !== 'compact' && (
        <div className="space-y-2 mb-3 text-sm text-gray-600">
          {project.notes && (
            <p className="truncate">{project.notes}</p>
          )}
          {lastActivity && (
            <div className="flex items-center">
              <Activity className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">Last activity: {lastActivity}</span>
            </div>
          )}
        </div>
      )}

      {/* Billing Info */}
      {(project.totalAmount || project.paidAmount) && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            {project.totalAmount && (
              <span className="text-gray-600">
                Total: ${project.totalAmount.toLocaleString()}
              </span>
            )}
            {project.paidAmount && project.paidAmount > 0 && (
              <span className="text-green-600 font-medium">
                Paid: ${project.paidAmount.toLocaleString()}
              </span>
            )}
          </div>
          
          {/* Status Badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
            project.status === 'active' ? 'bg-green-100 text-green-800' :
            project.status === 'archived' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {project.status}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && mode !== 'compact' && (
        <div className="flex space-x-2 mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContact?.();
            }}
            className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            Update
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSchedule?.();
            }}
            className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-100 transition-colors"
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            Schedule
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNotes?.();
            }}
            className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Notes
          </button>
        </div>
      )}
    </div>
  );
};

export default EntitySummaryCard; 