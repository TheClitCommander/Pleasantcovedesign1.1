import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import api from '../api'
import { Calendar, Clock, User, Phone, Mail, MapPin, X, Plus } from 'lucide-react'

interface Appointment {
  id: number
  businessId: number
  datetime: string
  status: string
  notes?: string
  isAutoScheduled?: boolean
  squarespaceId?: string
  createdAt?: string
}

interface Business {
  id: number
  name: string
  email?: string
  phone: string
  businessType: string
  stage: string
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  backgroundColor?: string
  borderColor?: string
  extendedProps: {
    appointment: Appointment
    business?: Business
  }
}

const Schedule: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appointmentsRes, businessesRes] = await Promise.all([
          api.get<Appointment[]>('/appointments'),
          api.get<Business[]>('/businesses'),
        ])

        const appointmentsData = appointmentsRes.data
        const businessesData = businessesRes.data

        setAppointments(appointmentsData)
        setBusinesses(businessesData)

        // Create calendar events
        const calendarEvents: CalendarEvent[] = appointmentsData.map((appt) => {
          const business = businessesData.find(b => b.id === appt.businessId)
          const startDate = new Date(appt.datetime)
          const endDate = new Date(startDate.getTime() + 25 * 60 * 1000) // 25 minute duration

          return {
            id: appt.id.toString(),
            title: business ? business.name : `Business #${appt.businessId}`,
            start: appt.datetime,
            end: endDate.toISOString(),
            backgroundColor: appt.isAutoScheduled ? '#3b82f6' : '#10b981',
            borderColor: appt.isAutoScheduled ? '#2563eb' : '#059669',
            extendedProps: {
              appointment: appt,
              business
            }
          }
        })

        setEvents(calendarEvents)
      } catch (err) {
        setError('Failed to load calendar data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleEventClick = (clickInfo: any) => {
    const event = events.find(e => e.id === clickInfo.event.id)
    if (event) {
      setSelectedEvent(event)
      setShowEventModal(true)
    }
  }

  const formatDateTime = (datetime: string) => {
    return new Date(datetime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) return <div>Loading calendar…</div>
  if (error) return <div className="text-error">{error}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center">
            <Calendar className="h-6 w-6 mr-2" />
            Appointments
          </h1>
          <p className="text-muted mt-1">Available slots: 8:30 AM & 9:00 AM daily (25 min each)</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span>Squarespace Bookings</span>
          </div>
          <div className="flex items-center text-sm">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Manual Bookings</span>
          </div>
        </div>
      </div>

      {/* Availability Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900">Appointment Availability</h3>
            <p className="text-blue-700 text-sm mt-1">
              Two 25-minute consultation slots available every day:
            </p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1">
              <li>• <strong>Morning Slot:</strong> 8:30 AM - 8:55 AM</li>
              <li>• <strong>Early Slot:</strong> 9:00 AM - 9:25 AM</li>
            </ul>
            <p className="text-blue-600 text-xs mt-2">
              Appointments available 7 days a week, all year round via Squarespace Scheduling
            </p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Appointment Calendar</h3>
          <div className="text-sm text-muted">
            Click appointments to view details
          </div>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          }}
          events={events}
          eventClick={handleEventClick}
          height={600}
          eventDisplay="block"
          dayMaxEvents={true}
          moreLinkClick="popover"
          slotMinTime="08:00:00"
          slotMaxTime="10:00:00"
          slotDuration="00:25:00"
          slotLabelInterval="00:30:00"
          allDaySlot={false}
        />
      </div>

      {/* Appointment Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowEventModal(false)}></div>
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Appointment Details</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Client Info */}
                <div>
                  <div className="flex items-center mb-2">
                    <User className="h-4 w-4 mr-2 text-primary-600" />
                    <span className="font-medium">{selectedEvent.extendedProps.business?.name || 'Unknown Client'}</span>
                  </div>
                  {selectedEvent.extendedProps.business?.email && (
                    <div className="flex items-center text-sm text-muted mb-1">
                      <Mail className="h-3 w-3 mr-2" />
                      <a href={`mailto:${selectedEvent.extendedProps.business.email}`} className="hover:text-primary-600">
                        {selectedEvent.extendedProps.business.email}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-muted">
                    <Phone className="h-3 w-3 mr-2" />
                    <a href={`tel:${selectedEvent.extendedProps.business?.phone}`} className="hover:text-primary-600">
                      {selectedEvent.extendedProps.business?.phone}
                    </a>
                  </div>
                </div>

                {/* Appointment Time */}
                <div>
                  <div className="flex items-center mb-2">
                    <Clock className="h-4 w-4 mr-2 text-primary-600" />
                    <span className="font-medium">Date & Time</span>
                  </div>
                  <p className="text-sm text-muted pl-6">
                    {formatDateTime(selectedEvent.extendedProps.appointment.datetime)}
                  </p>
                </div>

                {/* Appointment Notes */}
                {selectedEvent.extendedProps.appointment.notes && (
                  <div>
                    <div className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 mr-2 text-primary-600" />
                      <span className="font-medium">Notes</span>
                    </div>
                    <p className="text-sm text-muted pl-6">
                      {selectedEvent.extendedProps.appointment.notes}
                    </p>
                  </div>
                )}

                {/* Booking Source */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Booking Source:</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedEvent.extendedProps.appointment.isAutoScheduled 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedEvent.extendedProps.appointment.isAutoScheduled ? 'Squarespace' : 'Manual'}
                    </span>
                  </div>
                  {selectedEvent.extendedProps.appointment.squarespaceId && (
                    <p className="text-xs text-muted mt-1">
                      ID: {selectedEvent.extendedProps.appointment.squarespaceId}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4">
                  <button className="btn-primary flex-1">
                    View Client Details
                  </button>
                  <button className="btn-secondary">
                    Reschedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-muted">Total Appointments</p>
              <p className="text-lg font-semibold text-foreground">{appointments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-muted">This Week</p>
              <p className="text-lg font-semibold text-foreground">
                {appointments.filter(a => {
                  const appointmentDate = new Date(a.datetime)
                  const now = new Date()
                  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
                  return appointmentDate >= now && appointmentDate <= weekFromNow
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-border p-4">
          <div className="flex items-center">
            <div className="bg-purple-100 p-2 rounded-lg">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-muted">Squarespace Bookings</p>
              <p className="text-lg font-semibold text-foreground">
                {appointments.filter(a => a.isAutoScheduled).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Schedule 