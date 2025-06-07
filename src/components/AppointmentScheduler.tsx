import React, { useState, useEffect } from 'react';

interface TimeSlot {
  time: string;
  available: boolean;
  datetime: string;
}

interface AppointmentSchedulerProps {
  projectToken?: string;
  onAppointmentBooked?: (appointment: any) => void;
  className?: string;
}

// Simple icon components
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function AppointmentScheduler({ 
  projectToken, 
  onAppointmentBooked,
  className = "" 
}: AppointmentSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<'select' | 'confirm' | 'success'>('select');

  // Generate available time slots for a given date
  const generateTimeSlots = (date: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    const slotDuration = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = new Date(date);
        time.setHours(hour, minute, 0, 0);
        
        // Skip past times for today
        const now = new Date();
        if (time <= now) continue;
        
        // Skip weekends
        if (time.getDay() === 0 || time.getDay() === 6) continue;
        
        // Format time string
        const timeString = time.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        slots.push({
          time: timeString,
          available: Math.random() > 0.3, // Simulate availability
          datetime: time.toISOString()
        });
      }
    }

    return slots;
  };

  // Get week days for navigation
  const getWeekDays = (startDate: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Initialize with current week
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
    setCurrentWeekStart(startOfWeek);
    setSelectedDate(today);
  }, []);

  // Update available slots when date changes
  useEffect(() => {
    setAvailableSlots(generateTimeSlots(selectedDate));
  }, [selectedDate]);

  const weekDays = getWeekDays(currentWeekStart);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (date: Date) => {
    return date.toDateString() === tomorrow.toDateString();
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    setSelectedTime(slot.datetime);
    setBookingStep('confirm');
  };

  const handleBookAppointment = async () => {
    if (!selectedTime) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datetime: selectedTime,
          status: 'scheduled',
          notes: 'Consultation appointment booked via custom scheduler',
          projectToken: projectToken,
          serviceType: 'Design Consultation',
          duration: 30
        }),
      });

      if (response.ok) {
        const appointment = await response.json();
        setBookingStep('success');
        onAppointmentBooked?.(appointment);
      } else {
        console.error('Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
  };

  if (bookingStep === 'success') {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Appointment Confirmed!</h3>
          <p className="text-gray-600 mb-4">
            Your consultation is scheduled for {selectedTime && new Date(selectedTime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </p>
          <button
            onClick={() => {
              setBookingStep('select');
              setSelectedTime(null);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  if (bookingStep === 'confirm') {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Confirm Your Appointment</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <UserIcon className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-medium">Consultation with Ben Dickinson</span>
            </div>
            <div className="flex items-center justify-center mb-2">
              <ClockIcon className="w-5 h-5 text-gray-600 mr-2" />
              <span>30 minutes</span>
            </div>
            <div className="text-lg font-semibold text-blue-600">
              {selectedTime && new Date(selectedTime).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setBookingStep('select')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleBookAppointment}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Service Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Consultation with Ben Dickinson
        </h2>
        <p className="text-sm text-gray-600 mb-4">25 minutes</p>
        
        <p className="text-gray-700 mb-4">
          This 30-minute consultation is designed to help you take the first step 
          toward building or improving your online presence. Whether you need a new 
          website, want to revamp your brand, or just have questions, we'll dive 
          into your goals and...
        </p>
        
        <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
          SHOW ALL
        </button>
      </div>

      {/* Time Zone */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <p className="text-center text-sm font-medium text-gray-600">
          TIME ZONE: EASTERN TIME (GMT-04:00)
        </p>
      </div>

      {/* Date Navigation */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1 grid grid-cols-2 gap-8 text-center">
            <div>
              <p className="text-sm text-gray-500 mb-1">TOMORROW</p>
              <p className="font-semibold text-gray-900">
                {formatDate(tomorrow)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">NEXT WEEK</p>
              <p className="font-semibold text-gray-900">
                {formatDate(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000))}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Time Slots Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Tomorrow's slots */}
          <div>
            <div className="space-y-2">
              {generateTimeSlots(tomorrow).slice(0, 3).map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleTimeSelect(slot)}
                  disabled={!slot.available}
                  className={`w-full p-3 text-center border rounded-md transition-colors ${
                    slot.available
                      ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>

          {/* Next week's slots */}
          <div>
            <div className="space-y-2">
              {generateTimeSlots(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)).slice(0, 2).map((slot, index) => (
                <button
                  key={index}
                  onClick={() => handleTimeSelect(slot)}
                  disabled={!slot.available}
                  className={`w-full p-3 text-center border rounded-md transition-colors ${
                    slot.available
                      ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 text-gray-900'
                      : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Show more time slots */}
        <div className="mt-6 text-center">
          <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Show more times
          </button>
        </div>
      </div>
    </div>
  );
} 