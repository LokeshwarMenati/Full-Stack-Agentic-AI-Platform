import React, { useState } from 'react';
import { CheckCircle, Calendar, Mail, User, Bookmark, CalendarPlus, XCircle, Loader2 } from 'lucide-react';
import type { ConfirmedBooking } from '../../types';
import { api } from '../../services/api';

interface BookingConfirmationCardProps {
  booking: ConfirmedBooking;
  onViewBookings?: () => void;
  onCancelled?: (bookingId: string) => void;
}

export const BookingConfirmationCard: React.FC<BookingConfirmationCardProps> = ({
  booking,
  onViewBookings,
  onCancelled,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(booking.status || 'CONFIRMED');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const isCancelled = currentStatus === 'CANCELLED';

  const handleCancel = async () => {
    if (!window.confirm(`Are you sure you want to cancel appointment ${booking.booking_reference}? Your slot will be freed immediately.`)) {
      return;
    }

    setIsCancelling(true);
    setCancelError(null);
    try {
      const targetId = booking.id || booking.booking_reference;
      await api.cancelBooking(targetId);
      setCurrentStatus('CANCELLED');
      if (onCancelled) onCancelled(targetId);
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadICS = () => {
    const title = `${booking.appointment_type} - NEXUS AI`;
    const desc = `Appointment Reference: ${booking.booking_reference}\\nAttendee: ${booking.full_name}\\nEmail: ${booking.email}\\nOrganized by NEXUS AI Enterprise Assistant.`;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NEXUS AI//Enterprise Intelligent Assistant//EN',
      'BEGIN:VEVENT',
      `UID:${booking.booking_reference}@nexus.ai`,
      `DTSTAMP:${now}`,
      `DTSTART:${now}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `STATUS:${isCancelled ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${booking.booking_reference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`mt-3 overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all ${
      isCancelled
        ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/30 via-slate-900/80 to-slate-900/90'
        : 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-900/90'
    }`}>
      <div className={`flex items-center gap-2.5 border-b pb-3 ${
        isCancelled ? 'border-rose-500/20' : 'border-emerald-500/20'
      }`}>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
          isCancelled
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
        }`}>
          {isCancelled ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
        </div>
        <div>
          <h4 className={`text-sm font-semibold ${isCancelled ? 'text-rose-300' : 'text-emerald-300'}`}>
            {isCancelled ? 'Appointment Cancelled' : 'Appointment Confirmed'}
          </h4>
          <p className="text-xs text-slate-400">
            {isCancelled ? 'Database reservation released & slot freed' : 'Database transaction committed & slot reserved'}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-slate-950/50 p-2 border border-slate-800">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Bookmark className={`h-3.5 w-3.5 ${isCancelled ? 'text-rose-400' : 'text-emerald-400'}`} /> Reference
          </span>
          <span className={`font-mono font-bold ${isCancelled ? 'text-rose-400 line-through' : 'text-emerald-400'}`}>
            {booking.booking_reference}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-950/50 p-2 border border-slate-800">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-cyan-400" /> Time
          </span>
          <span className="font-medium text-slate-200">{booking.formatted_time || 'Scheduled Slot'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-950/50 p-2 border border-slate-800">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <User className="h-3 w-3 text-indigo-400" /> Attendee
            </span>
            <div className="truncate font-medium text-slate-200">{booking.full_name}</div>
          </div>
          <div className="rounded-lg bg-slate-950/50 p-2 border border-slate-800">
            <span className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
              <Mail className="h-3 w-3 text-indigo-400" /> Email
            </span>
            <div className="truncate font-medium text-slate-200">{booking.email}</div>
          </div>
        </div>
      </div>

      {cancelError && (
        <div className="mt-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 rounded-lg p-2">
          {cancelError}
        </div>
      )}

      <div className="mt-3.5 flex flex-col sm:flex-row gap-2">
        {!isCancelled && (
          <button
            onClick={handleDownloadICS}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600/20 py-2 text-center text-xs font-medium text-cyan-300 border border-cyan-500/30 transition-all hover:bg-cyan-600/30 hover:text-cyan-200 active:scale-98"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Add to Calendar (.ics)</span>
          </button>
        )}

        {!isCancelled ? (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-rose-600/20 py-2 text-center text-xs font-medium text-rose-300 border border-rose-500/30 transition-all hover:bg-rose-600/30 hover:text-rose-200 active:scale-98 disabled:opacity-50"
          >
            {isCancelling ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5" />
                <span>Cancel Appointment</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex-1 py-1.5 text-center text-xs font-medium text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg">
            Status: CANCELLED
          </div>
        )}

        {onViewBookings && (
          <button
            onClick={onViewBookings}
            className="flex-1 rounded-lg bg-slate-800/60 py-2 text-center text-xs font-medium text-slate-300 border border-slate-700 transition-all hover:bg-slate-800 hover:text-white"
          >
            View in Bookings Dashboard →
          </button>
        )}
      </div>
    </div>
  );
};
