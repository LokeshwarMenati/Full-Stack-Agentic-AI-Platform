import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Booking } from '../types';
import {
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';

interface BookingsPageProps {
  onNewBookingClick: (prompt?: string) => void;
}

export const BookingsPage: React.FC<BookingsPageProps> = ({ onNewBookingClick }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const bookingData = await api.getBookings();
      setBookings(bookingData);
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch bookings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? The slot will be freed immediately.')) {
      return;
    }
    setIsCancelling(true);
    setActionError(null);
    try {
      await api.cancelBooking(bookingId);
      await fetchBookings();
    } catch (err: any) {
      setActionError(err.message || 'Failed to cancel appointment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.appointment_type.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#080c14] p-4 md:p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Calendar className="h-6 w-6 text-indigo-400" />
              <span>Transactional Bookings Engine</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Authoritative appointment records committed to the persistent SQLite database.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchBookings}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onNewBookingClick()}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-md shadow-indigo-600/20 hover:brightness-110 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Book with Assistant</span>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by reference, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
            {(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.charAt(0) + st.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-slate-500">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No appointments found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter options.'
                : 'You have not scheduled any appointments yet. Use the Assistant Workspace to book one now.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredBookings.map((b) => {
              const isConfirmed = b.status === 'CONFIRMED';

              return (
                <div
                  key={b.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isConfirmed
                          ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-400'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isConfirmed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          {b.booking_reference}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            isConfirmed
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="font-medium text-slate-300">{b.appointment_type}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-cyan-400" />
                          <span>{b.formatted_time || 'Confirmed Slot'}</span>
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Attendee: <strong className="text-slate-400">{b.full_name}</strong></span>
                        <span>({b.email})</span>
                      </div>
                    </div>
                  </div>

                  {isConfirmed && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={isCancelling}
                        className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/40 hover:border-rose-500/60 transition-colors"
                      >
                        Cancel Slot
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
