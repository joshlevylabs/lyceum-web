'use client'

import { useState, useMemo } from 'react'
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
  parseISO
} from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface OnboardingSession {
  id: string
  title: string
  scheduled_at?: string
  duration_minutes: number
  is_mandatory: boolean
  plugin_id: string
}

interface OnboardingCalendarProps {
  sessions: OnboardingSession[]
  onSessionClick?: (session: OnboardingSession) => void
}

export default function OnboardingCalendar({ sessions, onSessionClick }: OnboardingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const dateFormat = 'MMMM yyyy'
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, OnboardingSession[]> = {}
    sessions.forEach(session => {
      if (session.scheduled_at) {
        const dateKey = format(parseISO(session.scheduled_at), 'yyyy-MM-dd')
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(session)
      }
    })
    return grouped
  }, [sessions])

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const getSessionsForDay = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd')
    return sessionsByDate[dateKey] || []
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, dateFormat)}
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {/* Day Names */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="bg-gray-50 dark:bg-gray-800 px-2 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((day, dayIdx) => {
          const daySessions = getSessionsForDay(day)
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isDayToday = isToday(day)

          return (
            <div
              key={dayIdx}
              className={`
                bg-white dark:bg-gray-800 min-h-[100px] p-2
                ${!isCurrentMonth ? 'opacity-40' : ''}
              `}
            >
              <div
                className={`
                  text-sm font-medium mb-1
                  ${isDayToday 
                    ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white' 
                    : isCurrentMonth 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-400 dark:text-gray-500'
                  }
                `}
              >
                {format(day, 'd')}
              </div>

              {/* Sessions for this day */}
              <div className="space-y-1">
                {daySessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => onSessionClick?.(session)}
                    className={`
                      w-full text-left text-xs px-2 py-1 rounded truncate
                      ${session.is_mandatory
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/70'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/70'
                      }
                    `}
                    title={`${session.title} - ${format(parseISO(session.scheduled_at!), 'h:mm a')}`}
                  >
                    <div className="font-medium truncate">{session.title}</div>
                    <div className="text-xs opacity-75">
                      {format(parseISO(session.scheduled_at!), 'h:mm a')}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700"></div>
          <span className="text-gray-600 dark:text-gray-400">Required</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"></div>
          <span className="text-gray-600 dark:text-gray-400">Optional</span>
        </div>
      </div>
    </div>
  )
}

