'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface Booking {
  id: string;
  user_id: string;
  admin_user_id: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  session_type: string;
  title: string;
  description?: string;
  meeting_platform: string;
  meeting_link?: string;
  is_mandatory: boolean;
  is_trial_required: boolean;
  trial_deadline?: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
  availability_slot: {
    id: string;
    location?: string;
  };
  license?: {
    id: string;
    license_type: string;
    status: string;
  };
}

interface BookingsByDate {
  [date: string]: Booking[];
}

export default function AdminBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upcomingByDate, setUpcomingByDate] = useState<BookingsByDate>({});
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [requiresAttention, setRequiresAttention] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'attention'>('upcoming');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/onboarding/bookings');
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
        setUpcomingByDate(data.upcomingByDate || {});
        setPastBookings(data.past || []);
        setRequiresAttention(data.requiresAttention || []);
      } else {
        console.error('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
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
    const date = new Date(dateString);
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const tzStr = date.toLocaleTimeString('en-US', {
      timeZoneName: 'short'
    }).split(' ').pop(); // Gets timezone abbreviation (e.g., "PST", "EST")
    return `${timeStr} ${tzStr}`;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: CalendarIcon },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckCircleIcon },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      suggested: { color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon }
    };

    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderBookingCard = (booking: Booking) => (
    <Card key={booking.id} className="p-6 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {booking.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatTime(booking.scheduled_start_time)} - {formatTime(booking.scheduled_end_time)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">User</div>
              <div className="flex items-center gap-2 mt-1">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  {booking.user.full_name || booking.user.email}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {booking.user.email}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Platform</div>
              <div className="flex items-center gap-2 mt-1">
                <VideoCameraIcon className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {booking.meeting_platform}
                </span>
              </div>
              {booking.meeting_link && (
                <a
                  href={booking.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-0.5 block"
                >
                  Join Meeting
                </a>
              )}
            </div>

            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">License Type</div>
              <div className="font-medium text-gray-900 dark:text-white mt-1 capitalize">
                {booking.license?.license_type || 'N/A'}
              </div>
            </div>
          </div>

          {booking.description && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {booking.description}
            </div>
          )}

          {booking.availability_slot?.location && (
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <MapPinIcon className="h-4 w-4" />
              {booking.availability_slot.location}
            </div>
          )}

          {booking.is_trial_required && booking.trial_deadline && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700 dark:text-yellow-500">
                Trial deadline: {formatDate(booking.trial_deadline)}
              </span>
            </div>
          )}
        </div>

        <div className="ml-4">
          {getStatusBadge(booking.status)}
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Onboarding Session Bookings
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage all onboarding sessions
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`${
                activeTab === 'upcoming'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Upcoming ({Object.values(upcomingByDate).flat().length})
            </button>
            <button
              onClick={() => setActiveTab('attention')}
              className={`${
                activeTab === 'attention'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Needs Attention ({requiresAttention.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`${
                activeTab === 'past'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Past ({pastBookings.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'upcoming' && (
          <div>
            {Object.keys(upcomingByDate).length === 0 ? (
              <Card className="p-8 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No upcoming bookings
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bookings will appear here once users schedule their onboarding sessions.
                </p>
              </Card>
            ) : (
              Object.entries(upcomingByDate)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, dateBookings]) => (
                  <div key={date} className="mb-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      {formatDate(date)}
                    </h2>
                    {dateBookings.map(renderBookingCard)}
                  </div>
                ))
            )}
          </div>
        )}

        {activeTab === 'attention' && (
          <div>
            {requiresAttention.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircleIcon className="h-12 w-12 mx-auto text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  All caught up!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No sessions require immediate attention.
                </p>
              </Card>
            ) : (
              requiresAttention.map(renderBookingCard)
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div>
            {pastBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <ClockIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No past bookings
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Completed sessions will appear here.
                </p>
              </Card>
            ) : (
              pastBookings.map(renderBookingCard)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
