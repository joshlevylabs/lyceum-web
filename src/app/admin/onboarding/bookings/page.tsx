'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Warning,
  MapPin,
  VideoCamera
} from '@phosphor-icons/react';

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
      scheduled: { color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', icon: Calendar },
      confirmed: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
      completed: { color: 'bg-foreground/10 text-foreground/60 border-foreground/20', icon: CheckCircle },
      cancelled: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      suggested: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Warning }
    };

    const badge = badges[status as keyof typeof badges] || badges.scheduled;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" weight="fill" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderBookingCard = (booking: Booking) => (
    <div key={booking.id} className="glass-card p-6 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {booking.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="h-4 w-4 text-cyan-400" weight="duotone" />
                <span className="text-sm text-foreground/60">
                  {formatTime(booking.scheduled_start_time)} - {formatTime(booking.scheduled_end_time)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <div className="text-sm text-foreground/60">User</div>
              <div className="flex items-center gap-2 mt-1">
                <User className="h-4 w-4 text-cyan-400" weight="duotone" />
                <span className="font-medium text-foreground">
                  {booking.user.full_name || booking.user.email}
                </span>
              </div>
              <div className="text-xs text-foreground/60 mt-0.5">
                {booking.user.email}
              </div>
            </div>

            <div>
              <div className="text-sm text-foreground/60">Platform</div>
              <div className="flex items-center gap-2 mt-1">
                <VideoCamera className="h-4 w-4 text-cyan-400" weight="duotone" />
                <span className="font-medium text-foreground capitalize">
                  {booking.meeting_platform}
                </span>
              </div>
              {booking.meeting_link && (
                <a
                  href={booking.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline mt-0.5 block transition-colors"
                >
                  Join Meeting
                </a>
              )}
            </div>

            <div>
              <div className="text-sm text-foreground/60">License Type</div>
              <div className="font-medium text-foreground mt-1 capitalize">
                {booking.license?.license_type || 'N/A'}
              </div>
            </div>
          </div>

          {booking.description && (
            <div className="mt-4 text-sm text-foreground/60">
              {booking.description}
            </div>
          )}

          {booking.availability_slot?.location && (
            <div className="flex items-center gap-2 mt-3 text-sm text-foreground/60">
              <MapPin className="h-4 w-4 text-cyan-400" weight="duotone" />
              {booking.availability_slot.location}
            </div>
          )}

          {booking.is_trial_required && booking.trial_deadline && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Warning className="h-4 w-4 text-amber-400" weight="fill" />
              <span className="text-amber-400">
                Trial deadline: {formatDate(booking.trial_deadline)}
              </span>
            </div>
          )}
        </div>

        <div className="ml-4">
          {getStatusBadge(booking.status)}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/20 border-t-cyan-500"></div>
          <span className="text-sm text-foreground/60">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Onboarding Session Bookings
          </h1>
          <p className="mt-2 text-foreground/60">
            View and manage all onboarding sessions
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-cyan-500/10">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`${
                activeTab === 'upcoming'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-foreground/50 hover:text-cyan-400 hover:border-cyan-500/30'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Upcoming ({Object.values(upcomingByDate).flat().length})
            </button>
            <button
              onClick={() => setActiveTab('attention')}
              className={`${
                activeTab === 'attention'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-foreground/50 hover:text-cyan-400 hover:border-cyan-500/30'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Needs Attention ({requiresAttention.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`${
                activeTab === 'past'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-foreground/50 hover:text-cyan-400 hover:border-cyan-500/30'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Past ({pastBookings.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'upcoming' && (
          <div>
            {Object.keys(upcomingByDate).length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-foreground/40 mb-4" weight="duotone" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No upcoming bookings
                </h3>
                <p className="text-foreground/60">
                  Bookings will appear here once users schedule their onboarding sessions.
                </p>
              </div>
            ) : (
              Object.entries(upcomingByDate)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, dateBookings]) => (
                  <div key={date} className="mb-8">
                    <h2 className="text-xl font-bold text-foreground mb-4">
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
              <div className="glass-card p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-4" weight="duotone" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  All caught up!
                </h3>
                <p className="text-foreground/60">
                  No sessions require immediate attention.
                </p>
              </div>
            ) : (
              requiresAttention.map(renderBookingCard)
            )}
          </div>
        )}

        {activeTab === 'past' && (
          <div>
            {pastBookings.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-foreground/40 mb-4" weight="duotone" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No past bookings
                </h3>
                <p className="text-foreground/60">
                  Completed sessions will appear here.
                </p>
              </div>
            ) : (
              pastBookings.map(renderBookingCard)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
