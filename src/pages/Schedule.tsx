import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format } from 'date-fns/format';
import { parse } from 'date-fns/parse';
import { startOfWeek } from 'date-fns/startOfWeek';
import { getDay } from 'date-fns/getDay';
import { enUS } from 'date-fns/locale/en-US';
import { useSearchParams } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import ProjectAwareClientModal from '../components/ProjectAwareClientModal';
import type { Company, Project } from '../../shared/schema';

// Setup the localizer for React Big Calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Create the drag and drop calendar with error boundary protection
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface Appointment {
  id?: number;
  companyId?: number;
  projectId?: number;
  businessId?: number;
  datetime: string;
  status: string;
  notes: string;
  isAutoScheduled?: boolean;
  squarespaceId?: string;
  client_name?: string;
  phone?: string;
  email?: string;
  businessType?: string;
  clientStage?: string;
  clientScore?: number;
  clientPriority?: string;
  companyName?: string;
  projectTitle?: string;
  projectType?: string;
}

interface PendingAppointment {
  id: string;
  client_id: number;
  client_name: string;
  phone: string;
  email: string;
  notes: string;
  businessType: string;
  stage: string;
  score: number;
  priority: string;
  status: 'pending';
}

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    appointmentId: number;
    companyId?: number;
    projectId?: number;
    businessId?: number;
    status?: string;
    notes: string;
    clientName: string;
    phone: string;
    email: string;
    businessType: string;
    clientStage: string;
    clientScore: number;
    clientPriority: string;
    isAutoScheduled?: boolean;
    squarespaceId?: string;
    companyName?: string;
    projectTitle?: string;
    projectType?: string;
  };
}

interface AppointmentModalData {
  id?: number;
  title: string;
  start: string;
  end: string;
  notes: string;
  clientName: string;
  phone: string;
  email: string;
  client_id?: number;
  isEdit: boolean;
}

// Error Boundary Component
class DragDropErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.warn('🛡️ DragDrop Error Boundary caught:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🛡️ DragDrop Error Boundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Reset error state after a delay
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 1000);
      
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">⚠️ Drag operation interrupted. Refreshing...</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Schedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProjectAwareModal, setShowProjectAwareModal] = useState(false);
  const [pendingSlotData, setPendingSlotData] = useState<{start: string; end: string} | null>(null);
  const [modalData, setModalData] = useState<AppointmentModalData>({
    title: '',
    start: '',
    end: '',
    notes: '',
    clientName: '',
    phone: '',
    email: '',
    isEdit: false
  });
  
  const [draggedAppointment, setDraggedAppointment] = useState<PendingAppointment | null>(null);
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(null);
  
  // URL parameters handling for client pre-selection
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get('client');
  
  // Refs for DOM manipulation safety
  const calendarRef = useRef<HTMLDivElement>(null);
  const pendingContainerRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightedClientRef = useRef<HTMLDivElement>(null);

  // Handle URL parameter for client highlighting
  useEffect(() => {
    if (clientIdFromUrl && pendingAppointments.length > 0) {
      const targetClient = pendingAppointments.find(
        apt => apt.client_id.toString() === clientIdFromUrl
      );
      
      if (targetClient) {
        setHighlightedClientId(targetClient.id);
        
        // Scroll to highlighted client after a brief delay
        setTimeout(() => {
          if (highlightedClientRef.current) {
            highlightedClientRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 500);
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
          setHighlightedClientId(null);
        }, 5000);
      }
    }
  }, [clientIdFromUrl, pendingAppointments]);

  // Valid time slots
  const validTimeSlots = [
    { time: '08:30:00', label: '8:30 AM' },
    { time: '09:00:00', label: '9:00 AM' }
  ];

  // Fetch appointments with error handling
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await fetch('/api/appointments?token=pleasantcove2024admin');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const appointments = await response.json();
      
      const mapped: CalendarEvent[] = await Promise.all(
        appointments.map(async (apt: any) => {
          let companyName = apt.client_name || 'Unknown Company';
          let projectTitle = '';
          let projectType = '';

          if (apt.projectId) {
            try {
              const projectResponse = await fetch(`/api/projects/${apt.projectId}?token=pleasantcove2024admin`);
              if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                projectTitle = projectData.title || '';
                projectType = projectData.type || '';
                companyName = projectData.company?.name || companyName;
              }
            } catch (error) {
              console.warn('Failed to fetch project details for appointment:', apt.id);
            }
          }

          const title = projectTitle 
            ? `${projectTitle} – ${companyName}`
            : apt.client_name || apt.notes || 'Appointment';

          return {
            id: apt.id.toString(),
            title,
            start: new Date(apt.datetime),
            end: new Date(new Date(apt.datetime).getTime() + 25 * 60000),
            resource: {
              appointmentId: apt.id,
              companyId: apt.companyId,
              projectId: apt.projectId,
              businessId: apt.businessId,
              status: apt.status,
              notes: apt.notes,
              clientName: companyName,
              phone: apt.phone || 'No phone',
              email: apt.email || '',
              businessType: apt.businessType || 'unknown',
              clientStage: apt.clientStage || 'unknown',
              clientScore: apt.clientScore || 0,
              clientPriority: apt.clientPriority || 'medium',
              isAutoScheduled: apt.isAutoScheduled,
              squarespaceId: apt.squarespaceId,
              companyName,
              projectTitle,
              projectType
            }
          };
        })
      );
      
      setEvents(mapped);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, []);

  // Fetch pending appointments with error handling
  const fetchPendingAppointments = useCallback(async () => {
    try {
      const response = await fetch('/api/appointments/pending?token=pleasantcove2024admin');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setPendingAppointments(data);
    } catch (err) {
      console.error("Failed to fetch pending appointments:", err);
      setPendingAppointments([]);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAppointments(),
        fetchPendingAppointments()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchAppointments, fetchPendingAppointments]);

  // Cleanup effects
  useEffect(() => {
    return () => {
      setDraggedAppointment(null);
      setIsDragging(false);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // Time slot utilities
  const isValidTimeSlot = useCallback((dateTime: Date) => {
    const time = dateTime.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    return validTimeSlots.some(slot => slot.time === time);
  }, []);

  const snapToValidSlot = useCallback((dateTime: Date) => {
    const date = new Date(dateTime);
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    if (hour < 9 || (hour === 8 && minute < 45)) {
      date.setHours(8, 30, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    
    return date;
  }, []);

  const isSlotBooked = useCallback((dateTime: Date) => {
    const targetTime = snapToValidSlot(dateTime);
    return events.some((event) => {
      return event.start.getTime() === targetTime.getTime();
    });
  }, [events, snapToValidSlot]);

  // Handle slot selection for new appointments
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const snappedStart = snapToValidSlot(start);
    
    if (isSlotBooked(snappedStart)) {
      alert('This time slot is already booked. Please choose another time.');
      return;
    }
    
    const snappedEnd = new Date(snappedStart.getTime() + 30 * 60000);
    
    setPendingSlotData({
      start: snappedStart.toISOString(),
      end: snappedEnd.toISOString()
    });
    setShowProjectAwareModal(true);
  }, [snapToValidSlot, isSlotBooked]);

  // Handle project selection from modal
  const handleProjectSelect = useCallback(async (company: Company, project: Project) => {
    if (!pendingSlotData) return;

    try {
      const appointmentData = {
        companyId: company.id,
        projectId: project.id,
        datetime: pendingSlotData.start,
        status: 'scheduled',
        notes: `${project.title} consultation with ${company.name}`,
        isAutoScheduled: false
      };

      const response = await fetch('/api/appointments?token=pleasantcove2024admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create appointment: ${response.status} ${errorText}`);
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      alert(`Appointment scheduled successfully for ${project.title} – ${company.name}!`);
    } catch (error) {
      console.error('❌ Failed to create appointment:', error);
      alert(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPendingSlotData(null);
      setShowProjectAwareModal(false);
    }
  }, [pendingSlotData, fetchAppointments, fetchPendingAppointments]);

  // Handle clicking on existing event
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setModalData({
      id: event.resource?.appointmentId,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      notes: event.resource?.notes || '',
      clientName: event.resource?.clientName || '',
      phone: event.resource?.phone || '',
      email: event.resource?.email || '',
      client_id: event.resource?.businessId,
      isEdit: true
    });
    setShowModal(true);
  }, []);

  // Enhanced drag handlers with error protection
  const handleDragStart = useCallback((apt: PendingAppointment, e: React.DragEvent) => {
    try {
      setIsDragging(true);
      setDraggedAppointment(apt);
      
      e.dataTransfer.setData('text/plain', JSON.stringify(apt));
      e.dataTransfer.setData('application/json', JSON.stringify(apt));
      e.dataTransfer.effectAllowed = 'move';
      
      // Safe style updates
      const target = e.currentTarget as HTMLElement;
      if (target) {
        target.style.opacity = '0.5';
        target.style.transform = 'scale(0.98)';
      }
      
      console.log('🚀 Drag started:', apt.client_name);
    } catch (error) {
      console.error('Error in drag start:', error);
      setIsDragging(false);
      setDraggedAppointment(null);
    }
  }, []);

  const handleDragEnd = useCallback((apt: PendingAppointment, e: React.DragEvent) => {
    try {
      // Safe style restoration
      const target = e.currentTarget as HTMLElement;
      if (target) {
        target.style.opacity = '1';
        target.style.transform = 'scale(1)';
      }
      
      // Clear drag state after a delay to ensure drop handler completes
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(false);
        if (draggedAppointment?.id === apt.id) {
          setDraggedAppointment(null);
        }
      }, 1000);
      
      console.log('🏁 Drag ended:', apt.client_name);
    } catch (error) {
      console.error('Error in drag end:', error);
      setIsDragging(false);
      setDraggedAppointment(null);
    }
  }, [draggedAppointment]);

  // Handle external drop with robust error handling
  const handleDropFromOutside = useCallback(async (args: any) => {
    if (!draggedAppointment || !isDragging) {
      console.warn('❌ No valid drag data for drop');
      return;
    }

    try {
      const { start } = args;
      if (!start || !draggedAppointment.client_id) {
        throw new Error('Invalid drop data');
      }

      const dropDate = new Date(start);
      const snappedStart = snapToValidSlot(dropDate);
      
      if (isSlotBooked(snappedStart)) {
        alert('This time slot is already booked. Please choose another time.');
        return;
      }

      const newAppointmentData = {
        client_id: draggedAppointment.client_id,
        datetime: snappedStart.toISOString(),
        notes: draggedAppointment.notes || `Consultation with ${draggedAppointment.client_name}`,
        status: 'scheduled',
        isAutoScheduled: false
      };

      const response = await fetch('/api/appointments?token=pleasantcove2024admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointmentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create appointment: ${response.status} ${errorText}`);
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      alert(`Appointment scheduled successfully for ${draggedAppointment.client_name}!`);
      
    } catch (error) {
      console.error('❌ Failed to schedule appointment:', error);
      alert(`Failed to schedule appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDragging(false);
      setDraggedAppointment(null);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    }
  }, [draggedAppointment, isDragging, snapToValidSlot, isSlotBooked, fetchAppointments, fetchPendingAppointments]);

  // Handle moving existing events
  const handleEventDrop = useCallback(async (args: any) => {
    try {
      const { event, start } = args;
      const snappedStart = snapToValidSlot(new Date(start));
      
      const isNewSlotBooked = events.some(e => 
        e.id !== event.id && e.start.getTime() === snappedStart.getTime()
      );
      
      if (isNewSlotBooked) {
        alert('This time slot is already booked. Please choose another time.');
        await fetchAppointments();
        return;
      }

      const calendarEvent = events.find(e => e.id === event.id);
      if (!calendarEvent?.resource?.appointmentId) {
        console.error('Could not find appointment ID for event:', event);
        return;
      }

      const appointmentData = {
        datetime: snappedStart.toISOString(),
        status: calendarEvent.resource.status || 'scheduled',
        notes: calendarEvent.resource.notes || ''
      };

      const response = await fetch(`/api/appointments/${calendarEvent.resource.appointmentId}?token=pleasantcove2024admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update appointment: ${response.status} ${errorText}`);
      }

      await fetchAppointments();
    } catch (error) {
      console.error('❌ Failed to move appointment:', error);
      alert(`Failed to move appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await fetchAppointments();
    }
  }, [events, snapToValidSlot, fetchAppointments]);

  // Prevent event resizing
  const handleEventResize = useCallback(async () => {
    alert('Appointments have a fixed 25-minute duration and cannot be resized.');
    await fetchAppointments();
  }, [fetchAppointments]);

  // Priority color utilities
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  }, []);

  const getPriorityTextColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-800';
      case 'medium': return 'text-yellow-800';
      case 'low': return 'text-green-800';
      default: return 'text-gray-800';
    }
  }, []);

  // Save appointment
  const handleSaveAppointment = useCallback(async () => {
    if (!modalData.clientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    try {
      const appointmentData = {
        datetime: modalData.start,
        notes: modalData.notes || modalData.clientName,
        status: 'scheduled',
        isAutoScheduled: false
      };

      if (!modalData.isEdit || typeof modalData.id !== 'number') {
        alert('Please use the project-aware modal to create new appointments');
        return;
      }

      const response = await fetch(`/api/appointments/${modalData.id}?token=pleasantcove2024admin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        throw new Error('Failed to save appointment');
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      setShowModal(false);
      setModalData({
        title: '',
        start: '',
        end: '',
        notes: '',
        clientName: '',
        phone: '',
        email: '',
        isEdit: false
      });
    } catch (error) {
      console.error('Failed to save appointment:', error);
      alert('Failed to save appointment. Please try again.');
    }
  }, [modalData, fetchAppointments, fetchPendingAppointments]);

  // Delete appointment
  const handleDeleteAppointment = useCallback(async () => {
    if (!modalData.id || typeof modalData.id !== 'number') return;

    const eventToMove = events.find((event) => 
      event.resource?.appointmentId === modalData.id || event.id === modalData.id!.toString()
    );

    if (!eventToMove) {
      alert('Error: Could not find the appointment on the calendar.');
      return;
    }

    const clientName = eventToMove.resource?.clientName || eventToMove.title || 'Unknown Client';
    
    if (!confirm(`Delete ${clientName}'s appointment?`)) return;

    try {
      const response = await fetch(`/api/appointments/${modalData.id}?token=pleasantcove2024admin`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete appointment: ${errorText}`);
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      setShowModal(false);
      alert(`${clientName}'s appointment has been deleted.`);
    } catch (error) {
      console.error('❌ Failed to delete appointment:', error);
      alert(`Failed to delete appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [modalData.id, events, fetchAppointments, fetchPendingAppointments]);

  // Event style getter
  const eventStyleGetter = useCallback((event: any) => {
    const backgroundColor = event.resource?.isAutoScheduled ? '#3b82f6' : '#10b981';
    const borderColor = event.resource?.status === 'scheduled' ? '#059669' : '#dc2626';
    
    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white'
      }
    };
  }, []);

  // Slot prop getter
  const slotPropGetter = useCallback((date: Date) => {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const isValidSlot = (hour === 8 && minute === 30) || (hour === 9 && minute === 0);
    
    if (!isValidSlot) {
      return {
        style: {
          backgroundColor: '#f3f4f6',
          pointerEvents: 'none' as const,
          opacity: 0.5
        }
      };
    }
    
    return {};
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 p-4 border-r bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-xl font-bold text-blue-600 mb-4">📅 Schedule & Appointments</h1>
          <div className="bg-white p-8 rounded shadow text-center">
            <div className="text-gray-600">Loading appointments...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen">
        <div className="w-64 p-4 border-r bg-gray-50">
          <div className="text-red-600">Error</div>
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-xl font-bold text-red-600 mb-4">🚨 Schedule Error</h1>
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <p className="text-red-800">Error loading appointments: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Pending Appointments Sidebar */}
      <div className="w-64 p-4 border-r bg-white">
        <h3 className="font-bold mb-4 text-gray-800">📋 Pending Appointments ({pendingAppointments.length})</h3>
        
        <div ref={pendingContainerRef} className="space-y-2">
          {pendingAppointments.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No pending appointments.<br />All leads have been scheduled!
            </div>
          ) : (
            pendingAppointments.map((apt) => (
              <div
                key={`pending-${apt.id}-${apt.client_id}`}
                ref={highlightedClientId === apt.id ? highlightedClientRef : undefined}
                className={`pending-appointment border p-3 rounded-lg cursor-grab hover:shadow-md transition-all select-none ${getPriorityColor(apt.priority)} ${
                  highlightedClientId === apt.id 
                    ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-100 border-blue-500' 
                    : ''
                }`}
                title="Drag to schedule this appointment"
                draggable={!isDragging}
                style={{ 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                onDragStart={(e) => handleDragStart(apt, e)}
                onDragEnd={(e) => handleDragEnd(apt, e)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`font-medium text-sm pointer-events-none ${getPriorityTextColor(apt.priority)} ${
                    highlightedClientId === apt.id ? 'text-blue-900' : ''
                  }`}>
                    {apt.client_name}
                    {highlightedClientId === apt.id && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                        Selected from Lead
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      apt.priority === 'high' ? 'bg-red-100 text-red-700' : 
                      apt.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {apt.priority.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                      Score: {apt.score}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 pointer-events-none space-y-1">
                  {apt.phone && <div>📞 {apt.phone}</div>}
                  {apt.email && <div>📧 {apt.email}</div>}
                  {apt.businessType && <div>🏢 {apt.businessType}</div>}
                  <div>📊 Stage: {apt.stage}</div>
                </div>
                
                <div className="text-xs text-gray-500 mt-2 pointer-events-none italic">
                  {apt.notes}
                </div>
                
                <div className="text-xs text-blue-600 mt-2 pointer-events-none font-medium">
                  👆 Drag to calendar to schedule
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-sm text-blue-800 mb-2">💡 Instructions:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Click empty time slots to search for clients</li>
            <li>• Drag pending clients to calendar slots</li>
            <li>• Only 8:30 AM & 9:00 AM slots available</li>
            <li>• Click appointments to view/edit details</li>
          </ul>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 p-4">
        <h1 className="text-xl font-bold text-blue-600 mb-4">
          📅 Schedule & Appointments ({events.length} scheduled)
        </h1>

        <DragDropErrorBoundary>
          <div className="bg-white p-4 rounded shadow">
            <div ref={calendarRef} style={{ height: 600 }}>
              <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: any) => event.start}
                endAccessor={(event: any) => event.end}
                style={{ height: '100%' }}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={(event: any) => handleSelectEvent(event as CalendarEvent)}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                onDropFromOutside={handleDropFromOutside}
                selectable
                eventPropGetter={eventStyleGetter}
                slotPropGetter={slotPropGetter}
                view={currentView}
                onView={setCurrentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                views={['week', 'day']}
                min={new Date(0, 0, 0, 8, 30, 0)}
                max={new Date(0, 0, 0, 9, 30, 0)}
                step={30}
                timeslots={1}
                popup
                dragFromOutsideItem={() => draggedAppointment || {}}
              />
            </div>
          </div>
        </DragDropErrorBoundary>
      </div>

      {/* Enhanced Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full">
            <h2 className="text-lg font-bold mb-4">
              {modalData.isEdit ? '✏️ Edit Appointment' : '📅 New Appointment'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name</label>
                <input
                  type="text"
                  className={`w-full border rounded px-3 py-2 ${modalData.isEdit ? 'bg-gray-100' : ''}`}
                  value={modalData.clientName}
                  onChange={(e) => setModalData({...modalData, clientName: e.target.value})}
                  placeholder="Enter client name"
                  readOnly={modalData.isEdit}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2"
                  value={modalData.phone}
                  onChange={(e) => setModalData({...modalData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
               
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  value={modalData.email}
                  onChange={(e) => setModalData({...modalData, email: e.target.value})}
                  placeholder="Enter email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Date & Time</label>
                <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {new Date(modalData.start).toLocaleDateString()} at{' '}
                  {new Date(modalData.start).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })} - {new Date(modalData.end).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={modalData.notes}
                  onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                  placeholder="Add any notes or details about the appointment"
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <div>
                {modalData.isEdit && (
                  <button
                    onClick={handleDeleteAppointment}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mr-2"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAppointment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  {modalData.isEdit ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project-Aware Client Modal */}
      {showProjectAwareModal && (
        <ProjectAwareClientModal
          isOpen={showProjectAwareModal}
          onClose={() => setShowProjectAwareModal(false)}
          onProjectSelect={handleProjectSelect}
          datetime={pendingSlotData?.start || ''}
        />
      )}
    </div>
  );
}