'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  Warning,
  CheckCircle,
  VideoCamera,
  MapPin,
  ArrowRight
} from '@phosphor-icons/react';

interface AvailableSlot {
  id: string;
  admin_user_id: string;
  start_time: string;
  end_time: string;
  meeting_platform: string;
  location?: string;
  max_concurrent_sessions: number;
  current_bookings: number;
  admin: {
    id: string;
    email: string;
    full_name?: string;
    role: string;
  };
}

interface MyBooking {
  id: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  title: string;
  description?: string;
  is_trial_required: boolean;
  trial_deadline?: string;
  meeting_platform: string;
  meeting_link?: string;
  admin: {
    id: string;
    email: string;
    full_name?: string;
  };
  license?: {
    license_type: string;
  };
}

interface SlotsByDate {
  [date: string]: AvailableSlot[];
}

export default function OnboardingSchedulePage() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState<{
    upcoming: MyBooking[];
    suggested: MyBooking[];
    requiresAction: MyBooking[];
  }>({
    upcoming: [],
    suggested: [],
    requiresAction: []
  });
  const [availableSlots, setAvailableSlots] = useState<SlotsByDate>({});
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<AvailableSlot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch my bookings
      const bookingsResponse = await fetch('/api/onboarding/my-bookings');
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setMyBookings({
          upcoming: bookingsData.upcoming || [],
          suggested: bookingsData.suggested || [],
          requiresAction: bookingsData.requiresAction || []
        });

        // Set the first suggested booking's license as default
        if (bookingsData.suggested?.[0]?.license?.id) {
          setSelectedLicense(bookingsData.suggested[0].license.id);
        }
      }

      // Fetch available slots (next 30 days)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const slotsResponse = await fetch(`/api/onboarding/available-slots?end_date=${endDate.toISOString()}`);
      if (slotsResponse.ok) {
        const slotsData = await slotsResponse.json();
        setAvailableSlots(slotsData.slotsByDate || {});
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async () => {
    if (!bookingSlot) return;

    try {
      const response = await fetch('/api/onboarding/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability_slot_id: bookingSlot.id,
          license_key_id: selectedLicense || undefined,
          title: `Onboarding Session with ${bookingSlot.admin.full_name || bookingSlot.admin.email}`
        })
      });

      if (response.ok) {
        await fetchData();
        setShowBookingModal(false);
        setBookingSlot(null);
        alert('Session booked successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error booking session:', error);
      alert('Failed to book session');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const response = await fetch(`/api/onboarding/${bookingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: 'Cancelled by user'
        })
      });

      if (response.ok) {
        await fetchData();
        alert('Booking cancelled successfully');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openBookingModal = (slot: AvailableSlot) => {
    setBookingSlot(slot);
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Schedule Onboarding Session
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Book a session with our team to get started with Lyceum
            </p>
          </div>

          {/* Urgent Action Required Banner */}
          {myBookings.requiresAction.length > 0 && (
            <Card className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex items-start">
                <ExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                <div className="ml-3 flex-1">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                    Action Required: Schedule Your Trial Onboarding
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    Your trial license requires that you schedule an onboarding session within 14 days. Failure to do so will result in license revocation.
                  </p>
                  {myBookings.requiresAction.map((booking) => (
                    <div key={booking.id} className="mt-3 text-sm text-red-700 dark:text-red-300">
                      <strong>Deadline:</strong> {formatDate(booking.trial_deadline!)}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* My Bookings Section */}
          {(myBookings.upcoming.length > 0 || myBookings.suggested.length > 0) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                My Sessions
              </h2>

              {/* Suggested Sessions */}
              {myBookings.suggested.map((booking) => (
                <Card key={booking.id} className="p-6 mb-4 border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ExclamationTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Suggested - Not Yet Scheduled
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {booking.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Please select a time slot below to schedule this session
                      </p>
                      {booking.is_trial_required && booking.trial_deadline && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">
                          <strong>Must be scheduled by:</strong> {formatDate(booking.trial_deadline)}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {/* Upcoming Scheduled Sessions */}
              {myBookings.upcoming.map((booking) => (
                <Card key={booking.id} className="p-6 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Scheduled
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {booking.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {formatDate(booking.scheduled_start_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {formatTime(booking.scheduled_start_time)} - {formatTime(booking.scheduled_end_time)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <User className="h-4 w-4" />
                            <span className="text-sm">
                              {booking.admin.full_name || booking.admin.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mt-2">
                            <VideoCamera className="h-4 w-4" />
                            <span className="text-sm capitalize">
                              {booking.meeting_platform}
                            </span>
                          </div>
                        </div>
                      </div>
                      {booking.meeting_link && (
                        <div className="mt-4">
                          <a
                            href={booking.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                          >
                            Join Meeting →
                          </a>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelBooking(booking.id)}
                      className="ml-4"
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Available Time Slots */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Available Time Slots
            </h2>

            {Object.keys(availableSlots).length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No available slots
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please check back later for available onboarding sessions.
                </p>
              </Card>
            ) : (
              Object.entries(availableSlots)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, slots]) => (
                  <div key={date} className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {formatDate(date)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {slots.map((slot) => (
                        <Card key={slot.id} className="p-4 hover:shadow-lg transition-shadow">
                          <div className="flex flex-col h-full">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                            </div>

                            <div className="space-y-2 mb-4 flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <User className="h-4 w-4" />
                                <span>{slot.admin.full_name || slot.admin.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <VideoCamera className="h-4 w-4" />
                                <span className="capitalize">{slot.meeting_platform}</span>
                              </div>
                              {slot.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <MapPin className="h-4 w-4" />
                                  <span>{slot.location}</span>
                                </div>
                              )}
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {slot.max_concurrent_sessions - slot.current_bookings} spot(s) available
                              </div>
                            </div>

                            <Button
                              onClick={() => openBookingModal(slot)}
                              className="w-full"
                              size="sm"
                            >
                              Book This Slot
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Booking Confirmation Modal */}
          {showBookingModal && bookingSlot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="max-w-lg w-full">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Confirm Booking
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Date & Time</div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDate(bookingSlot.start_time)}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        {formatTime(bookingSlot.start_time)} - {formatTime(bookingSlot.end_time)}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Admin</div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {bookingSlot.admin.full_name || bookingSlot.admin.email}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Platform</div>
                      <div className="font-medium text-gray-900 dark:text-white capitalize">
                        {bookingSlot.meeting_platform}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleBookSession} className="flex-1">
                      Confirm Booking
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingSlot(null);
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
