import React from 'react';
import AppointmentScheduler from '../components/AppointmentScheduler';

export default function BookAppointment() {
  const handleAppointmentBooked = (appointment: any) => {
    console.log('Appointment booked:', appointment);
    // Could add additional handling here like redirecting to a thank you page
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Book Your Consultation
          </h1>
          <p className="text-lg text-gray-600">
            Schedule a consultation with Ben Dickinson to discuss your design needs
          </p>
        </div>
        
        <AppointmentScheduler 
          onAppointmentBooked={handleAppointmentBooked}
          className="mx-auto"
        />
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Having trouble booking? Contact us at{' '}
            <a href="mailto:hello@pleasantcovedesign.com" className="text-blue-600 hover:text-blue-700">
              hello@pleasantcovedesign.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 