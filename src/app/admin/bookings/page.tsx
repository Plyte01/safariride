/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, ChangeEvent, useCallback, FormEvent } from 'react';
import Link from 'next/link';
import { Booking, BookingStatus, PaymentMethod as PrismaPaymentMethod, PaymentStatus as PrismaPaymentStatus } from '@prisma/client';
import { FiEdit2, FiEye, FiAlertTriangle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Extended type for display
interface AdminBookingView extends Omit<Booking, 'car' | 'user' | 'payment' | 'review'> {
  car: { id: string; title: string | null; make: string; model: string; images: string[]; owner: {id: string; name: string | null; email: string}};
  user: { id: string; name: string | null; email: string }; // Renter
  payment: { id: string; status: PrismaPaymentStatus; paymentMethod: PrismaPaymentMethod; amount: number; } | null;
}
interface FetchBookingsResponse {
  bookings: AdminBookingView[];
  currentPage: number;
  totalPages: number;
  totalBookings: number;
}

// Reusable components (can move to shared file)
const TableSkeletonLoader = ({ rows = 7, cols = 10 }) => (
    <div className="animate-pulse">
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex space-x-4 p-4 border-b border-gray-200 h-[80px] items-center">
                <div className="h-12 w-16 bg-gray-300 rounded-md flex-shrink-0"></div> {/* Image placeholder */}
                <div className="space-y-2 flex-grow">
                    <div className="h-4 w-3/4 bg-gray-300 rounded"></div> {/* Title/ID */}
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div> {/* Owner */}
                </div>
                <div className="h-4 w-1/6 bg-gray-200 rounded flex-shrink-0"></div> {/* Make/Model */}
                {[...Array(cols - 3)].map((_, j) => ( // Remaining cols
                    <div key={j} className="h-4 w-10 bg-gray-200 rounded flex-shrink-0"></div>
                ))}
            </div>
        ))}
    </div>
);
const FilterInput = ({ id, label, value, onChange, placeholder, type = "text", options }: { id: string; label: string; value: string; onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; placeholder?: string; type?: string; options?: { value: string; label: string }[] }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {type === 'select' && options ? (
            <select id={id} value={value} onChange={onChange} className="select-form w-full">
                <option value="">{placeholder || `All ${label}`}</option>
                {(options || []).map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        ) : (
            <input type={type} id={id} value={value} onChange={onChange} placeholder={placeholder} className="input-form w-full" />
        )}
    </div>
);

// Helper formatters (can move to shared file)
const formatDate = (dateStr: string | Date | null) => dateStr ? new Date(dateStr).toLocaleDateString('en-CA') : 'N/A'; // YYYY-MM-DD
const formatDateTime = (dateStr: string | Date | null) => dateStr ? new Date(dateStr).toLocaleString() : 'N/A';
const formatEnum = (val?: string) => val ? val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
const getBookingStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.CONFIRMED: return 'bg-green-100 text-green-800';
      case BookingStatus.PENDING:
      case BookingStatus.AWAITING_PAYMENT:
      case BookingStatus.ON_DELIVERY_PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case BookingStatus.CANCELLED: // Assuming one "CANCELLED" status from your schema
      case BookingStatus.PAYMENT_FAILED:
        return 'bg-red-100 text-red-800';
      case BookingStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case BookingStatus.NO_SHOW:
        return 'bg-purple-100 text-purple-800'; // Added NO_SHOW styling
      default: return 'bg-gray-100 text-gray-800';
    }
};

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBookingView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [carIdFilter, setCarIdFilter] = useState('');
  const [renterIdFilter, setRenterIdFilter] = useState('');
  const [ownerIdFilter, setOwnerIdFilter] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AdminBookingView | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchBookingsData = useCallback(async (page = 1, search = '', filters: Record<string, string> = {}) => {
    setIsLoading(true); setError(null);
    try {
      const queryParams = new URLSearchParams({ page: String(page), search: search, ...filters });
      const response = await fetch(`/api/admin/bookings?${queryParams.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({message: "Failed to fetch bookings."}));
        throw new Error(errData.message);
      }
      const data: FetchBookingsResponse = await response.json();
      setBookings(data.bookings);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
      setTotalBookings(data.totalBookings);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    const currentFilters = {
        ...(statusFilter && { status: statusFilter }),
        ...(dateFromFilter && { dateFrom: dateFromFilter }),
        ...(dateToFilter && { dateTo: dateToFilter }),
        ...(carIdFilter && { carId: carIdFilter }),
        ...(renterIdFilter && { userId: renterIdFilter }),
        ...(ownerIdFilter && { ownerId: ownerIdFilter }),
    };
    fetchBookingsData(currentPage, searchTerm, currentFilters);
  }, [currentPage, searchTerm, statusFilter, dateFromFilter, dateToFilter, carIdFilter, renterIdFilter, ownerIdFilter, fetchBookingsData]);

  const handleFilterSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    setCurrentPage(1); // Reset to first page on new filter/search
  };
  const clearFilters = () => {
    setSearchTerm(''); setStatusFilter(''); setDateFromFilter(''); setDateToFilter('');
    setCarIdFilter(''); setRenterIdFilter(''); setOwnerIdFilter('');
    setCurrentPage(1);
  };
  
  const openEditModal = (booking: AdminBookingView) => {
    setEditingBooking(booking);
    // Pre-fill modal state if using separate state for modal form
    // For now, modal will directly use editingBooking and local state for new status/notes
    setShowEditModal(true);
  };
  const closeEditModal = () => { setShowEditModal(false); setEditingBooking(null); };

  const handleBookingUpdate = async (bookingId: string, updates: Partial<Pick<Booking, 'status' | 'notes' | 'totalPrice'>>) => {
    if (!bookingId) return;
    setIsUpdating(true);
    try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`, { // Assuming PATCH on this route
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const updatedBookingData = await response.json();
        if (!response.ok) throw new Error(updatedBookingData.message || "Failed to update booking.");
        
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...updatedBookingData } : b));
        closeEditModal();
        alert("Booking updated successfully!");
    } catch (err: any) {
        alert(`Error: ${err.message}`);
        // Potentially set an error state for the modal
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-6">Booking Management</h1>

      {/* Filters Section */}
      <form onSubmit={handleFilterSubmit} className="mb-6 p-4 bg-white rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <FilterInput id="searchTerm" label="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Booking ID, Car, User..." />
            <FilterInput id="statusFilter" label="Booking Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BookingStatus | '')} type="select"
                options={Object.values(BookingStatus).map(s => ({value: s, label: formatEnum(s)}))} placeholder="All Statuses"/>
            <FilterInput id="dateFromFilter" label="Date From" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} type="date"/>
            <FilterInput id="dateToFilter" label="Date To" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} type="date"/>
            <FilterInput id="carIdFilter" label="Car ID" value={carIdFilter} onChange={(e) => setCarIdFilter(e.target.value)} placeholder="Enter Car ID"/>
            <FilterInput id="renterIdFilter" label="Renter ID" value={renterIdFilter} onChange={(e) => setRenterIdFilter(e.target.value)} placeholder="Enter Renter User ID"/>
            <FilterInput id="ownerIdFilter" label="Owner ID" value={ownerIdFilter} onChange={(e) => setOwnerIdFilter(e.target.value)} placeholder="Enter Owner User ID"/>
            <div className="flex items-end space-x-2 pt-5">
                <button type="submit" className="btn-primary py-2 text-sm flex-grow sm:flex-grow-0">Apply</button>
                <button type="button" onClick={clearFilters} className="btn-secondary py-2 text-sm flex-grow sm:flex-grow-0">Clear</button>
            </div>
        </div>
      </form>

      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm flex items-center"><FiAlertTriangle className="mr-2"/>{error}</div>}

      <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
        {isLoading ? <TableSkeletonLoader cols={9}/> : bookings.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No bookings found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th-table">ID / Car</th>
                <th className="th-table">Renter</th>
                <th className="th-table">Owner</th>
                <th className="th-table">Dates</th>
                <th className="th-table">Total Price</th>
                <th className="th-table">Booking Status</th>
                <th className="th-table">Payment</th>
                <th className="th-table">Created</th>
                <th className="th-table">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="td-table">
                    <Link href={`/admin/bookings/${booking.id}/details`} className="font-medium text-indigo-600 hover:underline">{booking.id.substring(0,8)}...</Link>
                    <div className="text-xs text-gray-500">{booking.car.title || `${booking.car.make} ${booking.car.model}`}</div>
                  </td>
                  <td className="td-table">
                      <div>{booking.user.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{booking.user.email}</div>
                  </td>
                  <td className="td-table">
                      <div>{booking.car.owner?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{booking.car.owner?.email}</div>
                  </td>
                  <td className="td-table text-xs">
                    {formatDate(booking.startDate)} <br/>to {formatDate(booking.endDate)}
                  </td>
                  <td className="td-table">KES {booking.totalPrice.toLocaleString()}</td>
                  <td className="td-table">
                    <span className={`status-badge ${getBookingStatusColor(booking.status)}`}>{formatEnum(booking.status)}</span>
                  </td>
                  <td className="td-table text-xs">
                    {booking.payment ? `${formatEnum(booking.payment.paymentMethod)} - ${formatEnum(booking.payment.status)}` : 'No Payment Info'}
                  </td>
                  <td className="td-table text-gray-600 text-xs">{formatDateTime(booking.createdAt)}</td>
                  <td className="td-table whitespace-nowrap space-x-2">
                    <Link href={`/admin/bookings/${booking.id}/details`} className="action-icon text-blue-600" title="View Details"><FiEye/></Link>
                    <button onClick={() => openEditModal(booking)} className="action-icon text-indigo-600" title="Edit/Manage Status"><FiEdit2/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {!isLoading && totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} (Total: {totalBookings} bookings)
          </span>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1 || isLoading} className="pagination-btn">
                <FiChevronLeft className="h-4 w-4 mr-1" /> Previous
            </button>
            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || isLoading} className="pagination-btn">
                Next <FiChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditModal && editingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex items-center justify-center p-4" onClick={closeEditModal}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold mb-4">Manage Booking: {editingBooking.id.substring(0,8)}...</h3>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newStatus = formData.get('newStatus') as BookingStatus;
                    const adminNotes = formData.get('adminNotes') as string;
                    // const newTotalPrice = formData.get('newTotalPrice') as string; // If allowing price edit

                    const updates: any = { status: newStatus };
                    if (adminNotes) updates.notes = adminNotes; // API appends admin notes
                    // if (newTotalPrice && !isNaN(parseFloat(newTotalPrice))) updates.totalPrice = parseFloat(newTotalPrice);

                    handleBookingUpdate(editingBooking.id, updates);
                }}>
                    <div className="space-y-4">
                        <FilterInput
                            id="newStatus"
                            label="New Booking Status"
                            value={editingBooking.status as string} // Default to current
                            onChange={() => {}} // This select will be controlled by form data
                            type="select"
                            options={Object.values(BookingStatus).map(s => ({ value: s, label: formatEnum(s) }))}
                        />
                        <div>
                            <label htmlFor="adminNotes" className="label-form">Admin Notes (will be appended)</label>
                            <textarea id="adminNotes" name="adminNotes" rows={3} className="input-form w-full" placeholder="Reason for status change or other notes..."></textarea>
                        </div>
                        {/* Optionally allow editing totalPrice by admin
                        <FilterInput id="newTotalPrice" label="Adjust Total Price (KES)" defaultValue={editingBooking.totalPrice.toString()} type="number" name="newTotalPrice" />
                        */}
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button type="button" onClick={closeEditModal} className="btn-secondary">Cancel</button>
                        <button type="submit" disabled={isUpdating} className="btn-primary disabled:opacity-50">
                            {isUpdating ? "Saving..." : "Update Booking"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

// Ensure CSS classes (input-form, select-form, th-table, etc.) are in globals.css