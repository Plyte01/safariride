import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale'; // ✅ CORRECT
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { BookingStatus } from '@prisma/client';

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

interface Booking {
  id: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
  user: {
    name: string | null;
    email: string;
  };
}

interface CarAvailabilityCalendarProps {
  carId?: string;
  bookings: Booking[];
  onDateSelect?: (start: Date, end: Date) => void;
  readOnly?: boolean;
}

export default function CarAvailabilityCalendar({
  //carId,
  bookings,
  onDateSelect,
  readOnly = false,
}: CarAvailabilityCalendarProps) {
  const [events, setEvents] = useState<
    Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      status: BookingStatus;
    }>
  >([]);

  useEffect(() => {
    const formattedEvents = bookings.map((booking) => ({
      id: booking.id,
      title: `${booking.user.name || 'Anonymous'} - ${booking.status}`,
      start: new Date(booking.startDate),
      end: new Date(booking.endDate),
      status: booking.status,
    }));
    setEvents(formattedEvents);
  }, [bookings]);

  const eventStyleGetter = (event: { status: BookingStatus }) => {
    let backgroundColor = '#e2e8f0';
    switch (event.status) {
      case BookingStatus.CONFIRMED:
        backgroundColor = '#ef4444';
        break;
      case BookingStatus.PENDING:
      case BookingStatus.AWAITING_PAYMENT:
      case BookingStatus.ON_DELIVERY_PENDING:
        backgroundColor = '#f59e0b';
        break;
      case BookingStatus.CANCELLED:
      case BookingStatus.PAYMENT_FAILED:
        backgroundColor = '#6b7280';
        break;
      case BookingStatus.COMPLETED:
        backgroundColor = '#10b981';
        break;
      case BookingStatus.NO_SHOW:
        backgroundColor = '#8b5cf6';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0',
        display: 'block',
      },
    };
  };

  return (
    <div className="h-[600px] bg-white rounded-lg shadow p-4">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventStyleGetter}
        selectable={!readOnly}
        onSelectSlot={(slotInfo: { start: Date; end: Date }) =>
          onDateSelect?.(slotInfo.start, slotInfo.end)
        }
        views={['month', 'week', 'day']}
        defaultView="month"
        popup
        tooltipAccessor={(event) => event.title}
      />
    </div>
  );
}
