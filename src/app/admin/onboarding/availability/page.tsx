'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface AvailabilitySlot {
  id: string;
  admin_user_id: string;
  start_time: string;
  end_time: string;
  slot_type: string;
  max_concurrent_sessions: number;
  current_bookings: number;
  is_available: boolean;
  is_recurring: boolean;
  recurrence_pattern?: string;
  recurrence_end_date?: string;
  notes?: string;
  location?: string;
  meeting_platform: string;
  created_at: string;
  updated_at: string;
}

export default function AdminAvailabilityPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    start_time: '',
    end_time: '',
    slot_type: 'onboarding',
    max_concurrent_sessions: 1,
    is_recurring: false,
    recurrence_pattern: '',
    recurrence_end_date: '',
    notes: '',
    location: '',
    meeting_platform: 'zoom'
  });

  useEffect(() => {
    fetchAvailabilitySlots();
  }, []);

  const fetchAvailabilitySlots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/availability');
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      } else {
        console.error('Failed to fetch availability slots');
      }
    } catch (error) {
      console.error('Error fetching availability slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        await fetchAvailabilitySlots();
        setShowCreateModal(false);
        setSelectedDate(null);
        resetForm();

        // Show success message
        if (result.count && result.count > 1) {
          alert(`✅ Success! Created ${result.count} recurring availability slots.`);
        } else {
          alert('✅ Availability slot created successfully!');
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating availability slot:', error);
      alert('Failed to create availability slot');
    }
  };

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    try {
      const response = await fetch(`/api/admin/availability/${editingSlot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchAvailabilitySlots();
        setEditingSlot(null);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating availability slot:', error);
      alert('Failed to update availability slot');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;

    try {
      const response = await fetch(`/api/admin/availability/${slotId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchAvailabilitySlots();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting availability slot:', error);
      alert('Failed to delete availability slot');
    }
  };

  const resetForm = () => {
    setFormData({
      start_time: '',
      end_time: '',
      slot_type: 'onboarding',
      max_concurrent_sessions: 1,
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      notes: '',
      location: '',
      meeting_platform: 'zoom'
    });
  };

  const openEditModal = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setFormData({
      start_time: slot.start_time.slice(0, 16),
      end_time: slot.end_time.slice(0, 16),
      slot_type: slot.slot_type,
      max_concurrent_sessions: slot.max_concurrent_sessions,
      is_recurring: slot.is_recurring,
      recurrence_pattern: slot.recurrence_pattern || '',
      recurrence_end_date: slot.recurrence_end_date?.slice(0, 16) || '',
      notes: slot.notes || '',
      location: slot.location || '',
      meeting_platform: slot.meeting_platform
    });
  };

  const openQuickCreateModal = (date: Date, hour?: number) => {
    const startDate = new Date(date);
    if (hour !== undefined) {
      startDate.setHours(hour, 0, 0, 0);
    } else {
      startDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1); // Default 1 hour duration

    setFormData({
      start_time: startDate.toISOString().slice(0, 16),
      end_time: endDate.toISOString().slice(0, 16),
      slot_type: 'onboarding',
      max_concurrent_sessions: 1,
      is_recurring: false,
      recurrence_pattern: '',
      recurrence_end_date: '',
      notes: '',
      location: '',
      meeting_platform: 'zoom'
    });

    setSelectedDate(date);
    setShowCreateModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  // Calendar generation functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getSlotsForDate = (date: Date | null) => {
    if (!date) return [];

    const dateStr = date.toISOString().split('T')[0];
    return slots.filter(slot => {
      const slotDate = new Date(slot.start_time).toISOString().split('T')[0];
      return slotDate === dateStr;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Availability Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your availability for onboarding sessions
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              onClick={() => setViewMode('calendar')}
              className="flex items-center gap-2"
            >
              <CalendarIcon className="h-5 w-5" />
              Calendar
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2"
            >
              <ClockIcon className="h-5 w-5" />
              List
            </Button>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <Card className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {getDaysInMonth(currentDate).map((date, index) => {
                const daySlots = getSlotsForDate(date);
                const isDateToday = isToday(date);
                const isPast = isPastDate(date);

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[120px] border rounded-lg p-2 transition-all
                      ${date ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-900 border-transparent'}
                      ${isDateToday ? 'ring-2 ring-blue-500' : ''}
                      ${date && !isPast ? 'hover:shadow-md cursor-pointer' : ''}
                      ${isPast && date ? 'opacity-50' : ''}
                    `}
                    onClick={() => date && !isPast && openQuickCreateModal(date)}
                  >
                    {date && (
                      <>
                        <div className={`
                          text-sm font-semibold mb-2
                          ${isDateToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}
                        `}>
                          {date.getDate()}
                        </div>

                        {daySlots.length > 0 && (
                          <div className="space-y-1">
                            {daySlots.slice(0, 3).map((slot) => (
                              <div
                                key={slot.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(slot);
                                }}
                                className={`
                                  text-xs p-1 rounded truncate
                                  ${slot.is_available
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }
                                  hover:opacity-80
                                `}
                                title={`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                              >
                                {formatTime(slot.start_time)}
                              </div>
                            ))}
                            {daySlots.length > 3 && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
                                +{daySlots.length - 3} more
                              </div>
                            )}
                          </div>
                        )}

                        {daySlots.length === 0 && !isPast && (
                          <div className="text-xs text-gray-400 dark:text-gray-600 text-center mt-4">
                            Click to add
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 dark:bg-green-900 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 dark:bg-red-900 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">Full</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 ring-2 ring-blue-500 rounded"></div>
                <span className="text-gray-700 dark:text-gray-300">Today</span>
              </div>
            </div>
          </Card>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <>
            <div className="mb-6">
              <Button
                onClick={() => openQuickCreateModal(new Date())}
                className="flex items-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                Add Availability Slot
              </Button>
            </div>

            <div className="grid gap-4">
              {slots.length === 0 ? (
                <Card className="p-8 text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No availability slots
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first availability slot to allow users to book onboarding sessions.
                  </p>
                </Card>
              ) : (
                slots.map((slot) => (
                  <Card key={slot.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <CalendarIcon className="h-5 w-5 text-blue-600" />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatDate(slot.start_time)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              to {formatTime(slot.end_time)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Type</div>
                            <div className="font-medium text-gray-900 dark:text-white capitalize">
                              {slot.slot_type}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Capacity</div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {slot.current_bookings} / {slot.max_concurrent_sessions}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Platform</div>
                            <div className="font-medium text-gray-900 dark:text-white capitalize">
                              {slot.meeting_platform.replace('_', ' ')}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                            <div className="flex items-center gap-1">
                              {slot.is_available ? (
                                <>
                                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">Available</span>
                                </>
                              ) : (
                                <>
                                  <XCircleIcon className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-600">Full</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {slot.location && (
                          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                            <strong>Location:</strong> {slot.location}
                          </div>
                        )}

                        {slot.notes && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <strong>Notes:</strong> {slot.notes}
                          </div>
                        )}

                        {slot.is_recurring && (
                          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Recurring: {slot.recurrence_pattern}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(slot)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || editingSlot) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {editingSlot ? 'Edit Availability Slot' : 'Create Availability Slot'}
                </h2>

                <form onSubmit={editingSlot ? handleUpdateSlot : handleCreateSlot}>
                  <div className="space-y-4">
                    {/* Start Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Max Concurrent Sessions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Concurrent Sessions
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_concurrent_sessions}
                        onChange={(e) => setFormData({ ...formData, max_concurrent_sessions: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Meeting Platform */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Meeting Platform
                      </label>
                      <select
                        value={formData.meeting_platform}
                        onChange={(e) => setFormData({ ...formData, meeting_platform: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="zoom">Zoom</option>
                        <option value="google_meet">Google Meet</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="phone">Phone</option>
                        <option value="in_person">In Person</option>
                      </select>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Meeting Link/Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., https://zoom.us/j/123456789 or Conference Room A"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        placeholder="Any additional information for this time slot"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    {/* Recurring */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="is_recurring"
                          checked={formData.is_recurring}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFormData({
                              ...formData,
                              is_recurring: isChecked,
                              // Set default end date to 3 months from start time if not set
                              recurrence_end_date: isChecked && !formData.recurrence_end_date
                                ? new Date(new Date(formData.start_time).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
                                : formData.recurrence_end_date
                            });
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Recurring Availability
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                        Create multiple availability slots automatically
                      </p>
                    </div>

                    {formData.is_recurring && (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Note:</strong> This will create multiple availability slots based on your pattern. For example, "Weekly" for 3 months will create approximately 12 slots.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Recurrence Pattern *
                          </label>
                          <select
                            required={formData.is_recurring}
                            value={formData.recurrence_pattern}
                            onChange={(e) => setFormData({ ...formData, recurrence_pattern: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          >
                            <option value="">Select pattern</option>
                            <option value="daily">Daily (Every day)</option>
                            <option value="weekly">Weekly (Same day each week)</option>
                            <option value="monthly">Monthly (Same date each month)</option>
                          </select>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            How often should this availability repeat?
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Recurrence End Date *
                          </label>
                          <input
                            type="datetime-local"
                            required={formData.is_recurring}
                            value={formData.recurrence_end_date}
                            onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            When should the recurring pattern stop? (Recommended: 1-3 months)
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex gap-3 mt-6">
                    <Button type="submit" className="flex-1">
                      {editingSlot ? 'Update Slot' : 'Create Slot'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false);
                        setEditingSlot(null);
                        setSelectedDate(null);
                        resetForm();
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
