'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  User,
  VideoCamera,
  EnvelopeSimple,
  Buildings,
  CheckCircle,
  CaretLeft,
  CaretRight,
  ArrowLeft
} from '@phosphor-icons/react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  isBefore,
  startOfDay
} from 'date-fns'

interface AvailableSlot {
  id: string
  start_time: string
  end_time: string
  meeting_platform: string
  location?: string
  max_concurrent_sessions: number
  current_bookings: number
  admin: {
    id: string
    full_name?: string
  }
}

interface SlotsByDate {
  [date: string]: AvailableSlot[]
}

export default function DemoSchedulingPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [availableSlots, setAvailableSlots] = useState<SlotsByDate>({})
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [bookingStep, setBookingStep] = useState<'calendar' | 'form' | 'success'>('calendar')

  // Form state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookingResult, setBookingResult] = useState<any>(null)

  useEffect(() => {
    fetchAvailableSlots()
  }, [currentMonth])

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true)
      const startDate = startOfMonth(currentMonth).toISOString()
      const endDate = endOfMonth(addMonths(currentMonth, 2)).toISOString()

      const response = await fetch(`/api/demo/available-slots?start_date=${startDate}&end_date=${endDate}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slotsByDate || {})
      }
    } catch (error) {
      console.error('Error fetching slots:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookDemo = async () => {
    if (!selectedSlot || !email) return

    try {
      setSubmitting(true)
      const response = await fetch('/api/demo/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selectedSlot.id,
          email,
          name,
          company
        })
      })

      const data = await response.json()

      if (response.ok) {
        setBookingResult(data.booking)
        setBookingStep('success')
      } else {
        alert(data.error || 'Failed to book demo')
      }
    } catch (error) {
      console.error('Error booking demo:', error)
      alert('Failed to book demo. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const hasAvailableSlots = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    return availableSlots[dateKey] && availableSlots[dateKey].length > 0
  }

  const getSlotsForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    return availableSlots[dateKey] || []
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (bookingStep === 'success' && bookingResult) {
    return (
      <div className="min-h-screen bg-background">
        {/* Simple header */}
        <header className="border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <span className="text-lg font-bold text-black">L</span>
              </div>
              <span className="text-xl font-bold text-foreground">Lyceum</span>
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-12 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" weight="fill" />
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              Demo Scheduled!
            </h1>

            <p className="text-foreground/60 mb-8">
              We&apos;ve sent a confirmation to <span className="text-foreground font-medium">{bookingResult.email}</span>
            </p>

            <div className="bg-foreground/5 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-foreground mb-4">Your Demo Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-foreground/70">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <span>{format(new Date(bookingResult.scheduled_start_time), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3 text-foreground/70">
                  <Clock className="w-5 h-5 text-cyan-400" />
                  <span>{formatTime(bookingResult.scheduled_start_time)} - {formatTime(bookingResult.scheduled_end_time)}</span>
                </div>
                <div className="flex items-center gap-3 text-foreground/70">
                  <VideoCamera className="w-5 h-5 text-cyan-400" />
                  <span className="capitalize">{bookingResult.meeting_platform}</span>
                </div>
                <div className="flex items-center gap-3 text-foreground/70">
                  <User className="w-5 h-5 text-cyan-400" />
                  <span>With {bookingResult.admin_name}</span>
                </div>
              </div>
              {bookingResult.meeting_link ? (
                <div className="mt-4 pt-4 border-t border-foreground/10">
                  <p className="text-sm text-foreground/50 mb-2">Meeting Link:</p>
                  <a
                    href={bookingResult.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 break-all"
                  >
                    {bookingResult.meeting_link}
                  </a>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-foreground/10">
                  <p className="text-sm text-foreground/50">
                    You&apos;ll receive the meeting link via email before your scheduled demo.
                  </p>
                </div>
              )}
            </div>

            <Link href="/" className="btn-primary inline-flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
              <span className="text-lg font-bold text-black">L</span>
            </div>
            <span className="text-xl font-bold text-foreground">Lyceum</span>
          </Link>
          <Link href="/" className="text-foreground/60 hover:text-foreground transition-colors flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Schedule a Demo
          </h1>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            See Lyceum in action. Choose a time that works for you and we&apos;ll walk you through how Lyceum can transform your measurement data workflow.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="glass-card p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-xl font-semibold text-foreground">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <CaretLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                  >
                    <CaretRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day Names */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-foreground/50"
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {days.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, monthStart)
                  const isDayToday = isToday(day)
                  const hasSlots = hasAvailableSlots(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isPast = isBefore(day, startOfDay(new Date()))

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (hasSlots && !isPast) {
                          setSelectedDate(day)
                          setSelectedSlot(null)
                          setBookingStep('calendar')
                        }
                      }}
                      disabled={!hasSlots || isPast || !isCurrentMonth}
                      className={`
                        aspect-square p-2 rounded-lg text-sm font-medium transition-all relative
                        ${!isCurrentMonth ? 'opacity-30 cursor-not-allowed' : ''}
                        ${isPast ? 'opacity-30 cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-cyan-500 text-black' : ''}
                        ${hasSlots && !isPast && !isSelected ? 'hover:bg-cyan-500/20 cursor-pointer' : ''}
                        ${isDayToday && !isSelected ? 'ring-2 ring-cyan-500/50' : ''}
                        ${!hasSlots && isCurrentMonth && !isPast ? 'text-foreground/30' : 'text-foreground'}
                      `}
                    >
                      {format(day, 'd')}
                      {hasSlots && !isPast && (
                        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black' : 'bg-cyan-400'}`} />
                      )}
                    </button>
                  )
                })}
              </div>

              {loading && (
                <div className="text-center py-8 text-foreground/50">
                  Loading available times...
                </div>
              )}
            </div>

            {/* Available Slots for Selected Date */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 glass-card p-6"
              >
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Available times for {format(selectedDate, 'EEEE, MMMM d')}
                </h3>

                {getSlotsForDate(selectedDate).length === 0 ? (
                  <p className="text-foreground/50">No available times for this date.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {getSlotsForDate(selectedDate).map((slot) => (
                      <button
                        key={slot.id}
                        onClick={() => {
                          setSelectedSlot(slot)
                          setBookingStep('form')
                        }}
                        className={`
                          p-4 rounded-lg border transition-all text-left
                          ${selectedSlot?.id === slot.id
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-foreground/10 hover:border-cyan-500/50 hover:bg-foreground/5'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <Clock className="w-4 h-4 text-cyan-400" />
                          {formatTime(slot.start_time)}
                        </div>
                        <div className="text-sm text-foreground/50 mt-1">
                          {slot.max_concurrent_sessions - slot.current_bookings} spot(s) left
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Booking Form Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="glass-card p-6 sticky top-6">
              {bookingStep === 'form' && selectedSlot ? (
                <>
                  <h3 className="text-lg font-semibold text-foreground mb-6">
                    Complete Your Booking
                  </h3>

                  {/* Selected time summary */}
                  <div className="bg-foreground/5 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-foreground mb-2">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-foreground/70">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>{formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}</span>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Your Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Smith"
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <div className="relative">
                        <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Acme Corp"
                          className="w-full pl-10 pr-4 py-3 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleBookDemo}
                      disabled={!email || submitting}
                      className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Scheduling...' : 'Schedule Demo'}
                    </button>

                    <button
                      onClick={() => {
                        setBookingStep('calendar')
                        setSelectedSlot(null)
                      }}
                      className="w-full text-center text-foreground/50 hover:text-foreground text-sm"
                    >
                      ← Choose a different time
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Select a Time
                  </h3>
                  <p className="text-foreground/60 text-sm mb-6">
                    Choose an available date from the calendar, then select a time slot to schedule your demo.
                  </p>

                  <div className="space-y-4 text-sm text-foreground/60">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-cyan-400 text-xs font-bold">1</span>
                      </div>
                      <span>Pick a date with available slots (marked with a dot)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-cyan-400 text-xs font-bold">2</span>
                      </div>
                      <span>Select a time slot that works for you</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-cyan-400 text-xs font-bold">3</span>
                      </div>
                      <span>Enter your email to confirm the booking</span>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-foreground/5 rounded-lg">
                    <div className="flex items-center gap-2 text-foreground/70 text-sm">
                      <VideoCamera className="w-4 h-4 text-cyan-400" />
                      <span>30-minute video call via Zoom</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
