/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/admin/cars/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation'; // useRouter for navigation, useSearchParams for reading query params
import { Car, CarCategory } from '@prisma/client'; // Import necessary types
import { 
    FiSearch, FiEdit2, FiTrash2, FiEye, FiCheckCircle, FiXCircle, 
    FiPower, FiList, FiChevronLeft, 
    FiChevronRight, FiImage, FiAlertTriangle, FiBox
} from 'react-icons/fi';

// Interface for car data from API, including owner
interface AdminCarView extends Omit<Car, 'owner'> {
  owner: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count?: { // Optional counts
    bookings?: number;
    reviews?: number;
  };
}

interface FetchCarsResponse {
  cars: AdminCarView[];
  currentPage: number;
  totalPages: number;
  totalCars: number;
}

// Reusable Filter Dropdown Component
const FilterDropdown = ({ id, label, value, onChange, options, placeholder, disabled = false }: { 
    id: string, 
    label?: string, // Made label optional
    value: string, 
    onChange: (e: ChangeEvent<HTMLSelectElement>) => void, 
    options: {value: string, label: string}[], 
    placeholder: string,
    disabled?: boolean
}) => (
    <div>
        {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select id={id} value={value} onChange={onChange} className="select-form w-full" disabled={disabled}>
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

// Skeleton Loader for Table
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

export default function AdminCarsPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // For reading initial query params

  const [cars, setCars] = useState<AdminCarView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCars, setTotalCars] = useState(0);
  
  // Filters State - initialize from query params if they exist
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [ownerIdFilter, setOwnerIdFilter] = useState(searchParams.get('ownerId') || '');
  const [verificationFilter, setVerificationFilter] = useState<'true' | 'false' | ''>(searchParams.get('isVerified') as any || '');
  const [listedFilter, setListedFilter] = useState<'true' | 'false' | ''>(searchParams.get('isListed') as any || '');
  const [activeFilter, setActiveFilter] = useState<'true' | 'false' | ''>(searchParams.get('isActive') as any || '');
  const [categoryFilter, setCategoryFilter] = useState<CarCategory | ''>(searchParams.get('category') as any || '');
  const [makeFilter, setMakeFilter] = useState(searchParams.get('make') || '');
  
  // Modal/Action States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCarId, setDeletingCarId] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState<Record<string, boolean>>({}); // For individual button loading

  const fetchCars = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const currentFilters: Record<string, string> = {
        ...(ownerIdFilter && { ownerId: ownerIdFilter }),
        ...(verificationFilter && { isVerified: verificationFilter }),
        ...(listedFilter && { isListed: listedFilter }),
        ...(activeFilter && { isActive: activeFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(makeFilter && { make: makeFilter }),
    };

    const queryParams = new URLSearchParams({
      page: String(currentPage),
      search: searchTerm,
      ...currentFilters
    }).toString();

    // Update URL with current filters without full page reload
    router.replace(`/admin/cars?${queryParams}`, { scroll: false });

    try {
      const response = await fetch(`/api/admin/cars?${queryParams}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: "Failed to fetch cars." }));
        throw new Error(errData.message);
      }
      const data: FetchCarsResponse = await response.json();
      setCars(data.cars);
      setTotalPages(data.totalPages);
      setTotalCars(data.totalCars);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, ownerIdFilter, verificationFilter, listedFilter, activeFilter, categoryFilter, makeFilter, router]); // Removed fetchCars from dependencies

  useEffect(() => {
    fetchCars();
  }, [fetchCars]); // fetchCars is now stable due to useCallback wrapping

  // Handlers for search and filter changes
  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    // fetchCars will be called by its own useEffect due to dependency changes.
    // Or call fetchCars() directly if you remove it from its own useEffect's deps
  };
  
  // Call this after setting a filter state
  useEffect(() => {
    handleFilterChange();
  }, [searchTerm, ownerIdFilter, verificationFilter, listedFilter, activeFilter, categoryFilter, makeFilter]);


  const clearFilters = () => {
    setSearchTerm(''); setOwnerIdFilter(''); setVerificationFilter('');
    setListedFilter(''); setActiveFilter(''); setCategoryFilter(''); setMakeFilter('');
    setCurrentPage(1); // This will trigger fetchCars via useEffect
  };
  
  const handleStatusToggle = async (carId: string, field: 'isVerified' | 'isListed' | 'isActive', currentValue: boolean) => {
    setIsProcessingAction(prev => ({...prev, [`${field}-${carId}`]: true}));
    try {
        const payload = { [field]: !currentValue };
        const response = await fetch(`/api/admin/cars/${carId}`, { // Assuming PUT handles partial status updates
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const updatedCarData = await response.json();
        if (!response.ok) throw new Error(updatedCarData.message || `Failed to update ${field} status.`);
        
        setCars(prev => prev.map(c => c.id === carId ? { ...c, ...updatedCarData } : c));
        // alert(`Car ${field} status updated successfully.`); // Consider toast notifications
    } catch (err: any) {
        alert(`Error: ${err.message}`);
        setError(err.message);
    } finally {
        setIsProcessingAction(prev => ({...prev, [`${field}-${carId}`]: false}));
    }
  };

  const confirmDeleteCar = (carId: string) => {
    setDeletingCarId(carId);
    setShowDeleteConfirm(true);
  };

  const executeDeleteCar = async () => {
    if (!deletingCarId) return;
    setIsProcessingAction(prev => ({...prev, [`delete-${deletingCarId}`]: true}));
    try {
        const response = await fetch(`/api/admin/cars/${deletingCarId}`, { method: 'DELETE' });
        const data = await response.json(); // Expect { message: '...' }
        if (!response.ok) throw new Error(data.message || 'Failed to delete car.');
        
        alert(data.message || 'Car deleted successfully.');
        fetchCars(); // Re-fetch after delete
    } catch (err: any) {
        alert(`Error: ${err.message}`);
        setError(err.message);
    } finally {
        setShowDeleteConfirm(false);
        setDeletingCarId(null);
        setIsProcessingAction(prev => ({...prev, [`delete-${deletingCarId}`]: false}));
    }
  };
  
  const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">Car Management</h1>
        {/* <Link href="/admin/cars/new" className="btn-primary text-sm mt-3 sm:mt-0">
            <FiPlusCircle className="mr-2 h-4 w-4"/> Add New Car
        </Link> */}
      </div>

      <div className="mb-6 p-4 bg-white rounded-lg shadow-md space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <div className="lg:col-span-2 xl:col-span-1">
                <label htmlFor="searchCars" className="label-form">Search Cars</label>
                <div className="relative">
                    <input type="text" id="searchCars" placeholder="Title, make, model, owner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-form w-full pr-10"/>
                    <span className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400"><FiSearch /></span>
                </div>
            </div>
            <FilterDropdown id="verificationFilter" label="Verification" value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value as any)}
                options={[{value: 'true', label: 'Verified'}, {value: 'false', label: 'Not Verified'}]} placeholder="All Verification" />
            <FilterDropdown id="listedFilter" label="Listing" value={listedFilter} onChange={(e) => setListedFilter(e.target.value as any)}
                options={[{value: 'true', label: 'Listed'}, {value: 'false', label: 'Not Listed'}]} placeholder="All Listing" />
            <FilterDropdown id="activeFilter" label="Activity" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as any)}
                options={[{value: 'true', label: 'Active'}, {value: 'false', label: 'Inactive'}]} placeholder="All Activity" />
            <FilterDropdown id="categoryFilter" label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}
                options={Object.values(CarCategory).map(c => ({value: c, label: c.replace(/_/g, ' ')}))} placeholder="All Categories" />
            <div>
                <label htmlFor="makeFilter" className="label-form">Make</label>
                <input type="text" id="makeFilter" placeholder="e.g., Toyota" value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)} className="input-form w-full"/>
            </div>
             <div className="flex items-end space-x-2">
                {/* Removed explicit apply button, filtering happens on change via useEffect */}
                <button type="button" onClick={clearFilters} className="btn-secondary py-2 text-sm flex-grow sm:flex-grow-0 flex items-center justify-center">
                    <FiXCircle className="mr-1.5 h-4 w-4"/> Clear Filters
                </button>
            </div>
        </div>
      </div>
      
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm flex items-center"><FiAlertTriangle className="mr-2 h-5 w-5"/>{error}</div>}

      <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
        {isLoading ? <TableSkeletonLoader /> : cars.length === 0 ? (
            <p className="text-center text-gray-500 py-16">
                <FiBox className="h-12 w-12 mx-auto text-gray-400 mb-3"/>
                No cars found matching your criteria. <br/>
                Try adjusting your filters or <button onClick={clearFilters} className="text-blue-600 hover:underline font-medium">clear all filters</button>.
            </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-100">
              <tr>
                <th className="th-table w-20">Image</th>
                <th className="th-table">Car Details</th>
                <th className="th-table">Owner</th>
                <th className="th-table text-center">Verified</th>
                <th className="th-table text-center">Listed</th>
                <th className="th-table text-center">Active</th>
                <th className="th-table">Price/Day</th>
                <th className="th-table">Created</th>
                <th className="th-table text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cars.map((car) => (
                <tr key={car.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="td-table px-4 py-3">
                    {car.images && car.images.length > 0 ? (
                      <Image src={car.images[0]} alt={car.title || `${car.make} ${car.model}`} className="h-10 w-14 object-cover rounded shadow-sm" onError={(e) => (e.currentTarget.src = '/placeholder-car.svg')} />
                    ) : (
                      <div className="h-10 w-14 bg-gray-100 rounded flex items-center justify-center text-gray-400"><FiImage className="h-5 w-5" /></div>
                    )}
                  </td>
                  <td className="td-table">
                    <Link href={`/admin/cars/${car.id}/details`} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline block truncate max-w-xs" title={car.title || 'N/A'}>
                        {car.title || 'N/A'}
                    </Link>
                    <div className="text-xs text-gray-500">{car.make} {car.model} ({car.year})</div>
                    <div className="text-xs text-gray-400">{car.id.substring(0,12)}...</div>
                  </td>
                  <td className="td-table">
                    <div>{car.owner?.name || 'N/A'}</div>
                    <div className="text-xs text-gray-500" title={car.owner?.email}>{car.owner?.email ? car.owner.email.substring(0,20) + (car.owner.email.length > 20 ? '...' : '') : 'N/A'}</div>
                  </td>
                  <td className="td-table text-center">
                    <button onClick={() => handleStatusToggle(car.id, 'isVerified', car.isVerified)} disabled={isProcessingAction[`verify-${car.id}`]}
                        className={`p-1.5 rounded-full transition-opacity ${isProcessingAction[`verify-${car.id}`] ? 'opacity-50 cursor-wait' : (car.isVerified ? 'hover:bg-red-100' : 'hover:bg-green-100')}`} 
                        title={car.isVerified ? 'Mark as Not Verified' : 'Mark as Verified'}>
                        {car.isVerified ? <FiCheckCircle className="text-green-500 h-5 w-5"/> : <FiXCircle className="text-red-500 h-5 w-5"/>}
                    </button>
                  </td>
                  <td className="td-table text-center">
                     <button onClick={() => handleStatusToggle(car.id, 'isListed', car.isListed)} disabled={isProcessingAction[`list-${car.id}`]}
                        className={`p-1.5 rounded-full transition-opacity ${isProcessingAction[`list-${car.id}`] ? 'opacity-50 cursor-wait' : (car.isListed ? 'hover:bg-red-100' : 'hover:bg-green-100')}`}
                        title={car.isListed ? 'Unlist Car' : 'List Car'}>
                        {car.isListed ? <FiList className="text-green-500 h-5 w-5"/> : <FiList className="text-gray-400 h-5 w-5 line-through"/>}
                    </button>
                  </td>
                  <td className="td-table text-center">
                    <button onClick={() => handleStatusToggle(car.id, 'isActive', car.isActive)} disabled={isProcessingAction[`active-${car.id}`]}
                        className={`p-1.5 rounded-full transition-opacity ${isProcessingAction[`active-${car.id}`] ? 'opacity-50 cursor-wait' : (car.isActive ? 'hover:bg-red-100' : 'hover:bg-green-100')}`}
                        title={car.isActive ? 'Deactivate Car' : 'Activate Car'}>
                        {car.isActive ? <FiPower className="text-green-500 h-5 w-5"/> : <FiPower className="text-red-500 h-5 w-5"/>}
                    </button>
                  </td>
                  <td className="td-table font-medium text-gray-800">KES {car.pricePerDay.toLocaleString()}</td>
                  <td className="td-table text-gray-500">{formatTimestamp(car.createdAt)}</td>
                  <td className="td-table text-right whitespace-nowrap space-x-1">
                    <Link href={`/admin/cars/${car.id}/details`} className="action-icon text-blue-600 hover:text-blue-800" title="View Details"><FiEye /></Link>
                    <Link href={`/admin/cars/${car.id}/edit`} className="action-icon text-indigo-600 hover:text-indigo-800" title="Edit Car"><FiEdit2 /></Link>
                    <button onClick={() => confirmDeleteCar(car.id)} className="action-icon text-red-600 hover:text-red-800" title="Delete Car" disabled={isProcessingAction[`delete-${car.id}`]}><FiTrash2 /></button>
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
            Page {currentPage} of {totalPages} (Total: {totalCars} cars)
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

      {showDeleteConfirm && deletingCarId && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><FiAlertTriangle className="text-red-500 mr-2 h-6 w-6"/>Confirm Deletion</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this car listing? This action cannot be undone and may affect existing bookings.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary py-2 px-4" disabled={isProcessingAction[`delete-${deletingCarId}`]}>Cancel</button>
              <button onClick={executeDeleteCar} className="btn-danger py-2 px-4 disabled:opacity-50" disabled={isProcessingAction[`delete-${deletingCarId}`]}>
                {isProcessingAction[`delete-${deletingCarId}`] ? 'Deleting...' : 'Yes, Delete Car'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add FiPlusCircle to react-icons import if used in "Add New Car" button like this:
// import { ..., FiPlusCircle } from 'react-icons/fi';

// Add to globals.css or relevant stylesheet:
/*
.label-form { @apply block text-sm font-medium text-gray-700 mb-1; }
.input-form { @apply block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-400; }
.select-form { @apply block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md; }

.th-table { @apply px-3 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider; }
.td-table { @apply px-3 py-3 whitespace-nowrap text-sm text-gray-700; } // Adjusted padding for consistency
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full; }

.pagination-btn { @apply inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed; }
.action-icon { @apply p-1.5 rounded-md hover:bg-gray-100 text-gray-500; } // Consistent icon button style

.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 py-2 px-4 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2; }
.btn-secondary { @apply px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500; }
.btn-danger { @apply bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 py-2 px-4 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2; }
*/