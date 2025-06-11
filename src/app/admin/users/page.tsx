// src/app/admin/users/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, useCallback, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@prisma/client';
import { 
    FiEdit2, 
    FiChevronLeft, 
    FiChevronRight, 
    FiCheckCircle, 
    FiXCircle, 
    FiShield, 
    FiShieldOff, 
    FiAlertTriangle,
    FiEye,
    FiXCircle as FiCloseIcon // For modal close button
} from 'react-icons/fi';

// Type for user data received from API (with counts)
interface AdminUserView extends Omit<User, 'password' | 'accounts' | 'sessions'> {
  _count?: {
    cars?: number;
    bookings?: number;
    reviewsGiven?: number;
  };
  // isBlocked?: boolean; // Add if you implement this field
}

interface FetchUsersResponse {
  users: AdminUserView[];
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  itemsPerPage: number; // Added to sync with API
}

const DEFAULT_USERS_PER_PAGE_CLIENT = 10; // Consistent with API default if not overridden

const TableSkeletonLoader = ({ rows = DEFAULT_USERS_PER_PAGE_CLIENT }) => (
    <div className="animate-pulse">
        {[...Array(rows)].map((_, i) => (
            <div key={i} className="flex space-x-4 p-4 border-b border-gray-200 h-[65px] items-center">
                <div className="h-4 w-[5%] bg-gray-300 rounded"></div> {/* # */}
                <div className="h-4 w-[25%] bg-gray-300 rounded"></div> {/* User Name/ID */}
                <div className="h-4 w-[25%] bg-gray-200 rounded"></div> {/* Email */}
                <div className="h-4 w-[10%] bg-gray-200 rounded"></div> {/* Role */}
                <div className="h-4 w-[5%] bg-gray-200 rounded"></div> {/* Trusted */}
                <div className="h-4 w-[5%] bg-gray-200 rounded"></div> {/* Verified */}
                <div className="h-4 w-[10%] bg-gray-200 rounded"></div> {/* Joined */}
                <div className="h-4 w-[5%] bg-gray-200 rounded"></div> {/* Stats */}
                <div className="h-4 w-[10%] bg-gray-200 rounded"></div> {/* Actions */}
            </div>
        ))}
    </div>
);


export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter(); 

  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_USERS_PER_PAGE_CLIENT); // For calculating row number
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [trustFilter, setTrustFilter] = useState<'' | 'trusted' | 'untrusted'>('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserView | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [modalSelectedRole, setModalSelectedRole] = useState<UserRole | ''>('');
  const [modalIsTrusted, setModalIsTrusted] = useState(false);
  const [modalEmailVerified, setModalEmailVerified] = useState(false);

  const fetchUsers = useCallback(async (page = 1, search = '', roleF = '', trustF = '') => {
    setIsLoading(true); setError(null);
    try {
      const queryParams = new URLSearchParams({ 
        page: String(page), 
        limit: String(itemsPerPage), // Send itemsPerPage to API
        search, 
        ...(roleF && { role: roleF }), 
        ...(trustF && { trust: trustF }), 
      }).toString();
      const response = await fetch(`/api/admin/users?${queryParams}`);
      if (!response.ok) { const d = await response.json().catch(() => ({})); throw new Error(d.message || "Failed to fetch users."); }
      const data: FetchUsersResponse = await response.json();
      setUsers(data.users); 
      setCurrentPage(data.currentPage); 
      setTotalPages(data.totalPages); 
      setTotalUsers(data.totalUsers);
      setItemsPerPage(data.itemsPerPage || DEFAULT_USERS_PER_PAGE_CLIENT); // Update itemsPerPage from API response
    } catch (err) { 
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } 
    finally { setIsLoading(false); }
  }, [itemsPerPage]); // Add itemsPerPage as dependency

  useEffect(() => { fetchUsers(currentPage, searchTerm, roleFilter, trustFilter); }, [currentPage, searchTerm, roleFilter, trustFilter, fetchUsers]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleRoleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => { setRoleFilter(e.target.value as UserRole | ''); setCurrentPage(1); };
  const handleTrustFilterChange = (e: ChangeEvent<HTMLSelectElement>) => { setTrustFilter(e.target.value as '' | 'trusted' | 'untrusted'); setCurrentPage(1); };

  const openEditModal = (user: AdminUserView) => {
    setModalError(null);
    setEditingUser(JSON.parse(JSON.stringify(user)));
    setModalSelectedRole(user.role);
    setModalIsTrusted(user.role === UserRole.ADMIN || user.isTrustedOwner);
    setModalEmailVerified(!!user.emailVerified);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setModalError(null);
  }

  const handleUserUpdateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser || !session?.user) return;
    setModalError(null);
    const updates: Partial<Pick<AdminUserView, 'role' | 'isTrustedOwner' | 'emailVerified'>> = {};

    if (modalSelectedRole && modalSelectedRole !== editingUser.role) {
      if (session.user.id === editingUser.id && editingUser.role === UserRole.ADMIN && modalSelectedRole !== UserRole.ADMIN) {
        setModalError('You cannot change your own role from Admin.'); return;
      }
      if (editingUser.role === UserRole.ADMIN && modalSelectedRole !== UserRole.ADMIN && editingUser.id !== session.user.id) { // Also check not editing self if admin
        setModalError("An Admin's role cannot be changed to a non-Admin role here."); return;
      }
      updates.role = modalSelectedRole;
    }
    const effectiveRoleForTrust = updates.role || editingUser.role;
    let finalIsTrusted = modalIsTrusted;
    if (effectiveRoleForTrust === UserRole.ADMIN) {
      finalIsTrusted = true;
      if (modalIsTrusted === false && modalIsTrusted !== editingUser.isTrustedOwner) { // Only error if explicitly trying to untrust an admin
          setModalError('Admins are inherently trusted and cannot be marked as not trusted.'); return;
      }
    } else if (effectiveRoleForTrust === UserRole.RENTER) {
      finalIsTrusted = false;
    }
    if (finalIsTrusted !== editingUser.isTrustedOwner || (updates.role && (updates.role === UserRole.ADMIN || updates.role === UserRole.RENTER))) {
      updates.isTrustedOwner = finalIsTrusted;
    }
    
    if (modalEmailVerified !== !!editingUser.emailVerified) {
      updates.emailVerified = modalEmailVerified ? new Date() : null;
    }
    if (Object.keys(updates).length === 0) {
      alert("No changes detected."); closeEditModal(); return;
    }
    setIsUpdating(true);
    try {
        const response = await fetch(`/api/admin/users/${editingUser.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        const updatedUserData = await response.json();
        if (!response.ok) throw new Error(updatedUserData.message || "Failed to update user.");
        setUsers(prevUsers => prevUsers.map(u => u.id === editingUser.id ? { ...u, ...updatedUserData } : u));
        closeEditModal();
        alert("User updated successfully!");
    } catch (err: unknown) { 
        if (err instanceof Error) {
            setModalError(err.message);
        } else {
            setModalError('An unknown error occurred.');
        }
    } 
    finally { setIsUpdating(false); }
  };
  
  const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const viewUserDetails = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">User Management</h1>
      </div>

      <div className="mb-6 p-4 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="search" className="label-form">Search Users</label>
            <input type="text" id="search" placeholder="Search by name or email..." value={searchTerm} onChange={handleSearchChange} className="input-form w-full"/>
          </div>
          <div>
            <label htmlFor="roleFilter" className="label-form">Filter by Role</label>
            <select id="roleFilter" value={roleFilter} onChange={handleRoleFilterChange} className="select-form w-full">
              <option value="">All Roles</option>
              {Object.values(UserRole).map(role => (<option key={role} value={role}>{role}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="trustFilter" className="label-form">Filter by Trust</label>
            <select id="trustFilter" value={trustFilter} onChange={handleTrustFilterChange} className="select-form w-full">
              <option value="">All Trust Statuses</option><option value="trusted">Trusted</option><option value="untrusted">Not Trusted</option>
            </select>
          </div>
        </div>
      </div>
      
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4 text-sm flex items-center"><FiAlertTriangle className="mr-2 h-5 w-5"/>{error}</div>}

      <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
        {isLoading ? <TableSkeletonLoader rows={itemsPerPage} /> : users.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No users found matching your criteria.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="th-table w-[5%]">#</th>
                <th className="th-table w-[25%]">User</th>
                <th className="th-table w-[25%]">Email</th>
                <th className="th-table w-[10%]">Role</th>
                <th className="th-table w-[10%] text-center">Trusted</th>
                <th className="th-table w-[10%] text-center">Email Verified</th>
                <th className="th-table w-[10%]">Joined</th>
                <th className="th-table w-[5%] text-center">Stats</th>
                <th className="th-table w-[10%]">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="td-table text-gray-500">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="td-table">
                    <div>
                        <button onClick={() => viewUserDetails(user.id)} className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left">
                            {user.name || 'N/A'}
                        </button>
                        <div className="text-xs text-gray-500">{user.id.substring(0,12)}...</div>
                    </div>
                  </td>
                  <td className="td-table text-gray-600 break-all">{user.email}</td>
                  <td className="td-table"><span className={`status-badge ${ user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : user.role === UserRole.OWNER ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'}`}>{user.role}</span></td>
                  <td className="td-table text-center">{(user.role === UserRole.OWNER || user.role === UserRole.ADMIN) ? (user.isTrustedOwner ? <FiShield className="text-green-500 h-5 w-5 mx-auto" title="Trusted"/> : <FiShieldOff className="text-gray-400 h-5 w-5 mx-auto" title="Not Trusted"/>) : <span className="text-gray-400">-</span> }</td>
                  <td className="td-table text-center">{user.emailVerified ? <FiCheckCircle className="text-green-500 h-5 w-5 mx-auto" title={`Verified: ${formatTimestamp(user.emailVerified)}`}/> : <FiXCircle className="text-red-500 h-5 w-5 mx-auto" title="Not Verified"/>}</td>
                  <td className="td-table text-gray-600">{formatTimestamp(user.createdAt)}</td>
                  <td className="td-table text-center text-xs text-gray-500">
                    {user.role === UserRole.OWNER || user.role === UserRole.ADMIN ? `C:${user._count?.cars ?? 0}` : ''}
                    {user.role === UserRole.RENTER ? `B:${user._count?.bookings ?? 0}` : ''}</td>
                  <td className="td-table whitespace-nowrap space-x-1 sm:space-x-2">
                    <button onClick={() => viewUserDetails(user.id)} className="action-icon-button text-blue-600 hover:text-blue-800" title="View User Details">
                      <FiEye className="h-4 w-4"/>
                    </button>
                    <button onClick={() => openEditModal(user)} className="action-icon-button text-indigo-600 hover:text-indigo-800" title="Edit User">
                      <FiEdit2 className="h-4 w-4"/>
                    </button>
                  </td>
                </tr>))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          <p className="text-sm text-gray-700">Showing <span className="font-medium">{Math.max(1, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalUsers)}</span> of <span className="font-medium">{totalUsers}</span> results</p>
          <div className="flex space-x-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn"><FiChevronLeft className="h-5 w-5" /></button>
            <span className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn"><FiChevronRight className="h-5 w-5" /></button>
          </div></div>)}

      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm overflow-y-auto h-full w-full z-40 flex items-center justify-center p-4" onClick={closeEditModal}>
          <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-lg transform transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 pb-3 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Edit User: {editingUser.name || editingUser.email}</h2>
                <button onClick={closeEditModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><FiCloseIcon className="h-6 w-6" /></button>
            </div>
            {modalError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm flex items-center"><FiAlertTriangle className="mr-2 h-5 w-5"/>{modalError}</div>}
            <form onSubmit={handleUserUpdateSubmit}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="modalEditRole" className="label-form">Role</label>
                  <select id="modalEditRole" name="role" value={modalSelectedRole || ''} 
                    onChange={(e) => {
                        const newRoleVal = e.target.value as UserRole;
                        setModalSelectedRole(newRoleVal);
                        if (newRoleVal === UserRole.ADMIN) setModalIsTrusted(true);
                        else if (newRoleVal === UserRole.RENTER) setModalIsTrusted(false);
                    }} 
                    className="select-form w-full"
                    disabled={(editingUser.role === UserRole.ADMIN && editingUser.id === session?.user?.id) || (editingUser.role === UserRole.ADMIN && editingUser.id !== session?.user?.id)}
                  >
                    {Object.values(UserRole).map(rVal => (
                      <option key={rVal} value={rVal}
                        disabled={editingUser.role === UserRole.ADMIN && editingUser.id === session?.user?.id && rVal !== UserRole.ADMIN}
                      >{rVal}</option>))}
                  </select>
                  {(editingUser.role === UserRole.ADMIN) && 
                    <p className="help-text">{editingUser.id === session?.user?.id ? "You cannot change your own role from Admin." : "Changing another Admin's role is restricted here."}</p>
                  }
                </div>
                
                {(modalSelectedRole === UserRole.OWNER || modalSelectedRole === UserRole.ADMIN) && (
                    <div className="checkbox-group">
                        <input type="checkbox" id="modalEditIsTrustedOwner" name="isTrustedOwner" 
                            checked={modalSelectedRole === UserRole.ADMIN || modalIsTrusted} 
                            onChange={(e) => setModalIsTrusted(e.target.checked)}
                            disabled={modalSelectedRole === UserRole.ADMIN} className="form-checkbox"/>
                        <label htmlFor="modalEditIsTrustedOwner" className="ml-2 text-sm font-medium text-gray-700">
                            Mark as Trusted Owner
                            {modalSelectedRole === UserRole.ADMIN && <span className="text-xs text-gray-500 ml-1">(Admins are inherently trusted)</span>}
                        </label>
                    </div>
                )}
                <div className="checkbox-group">
                    <input type="checkbox" id="modalEditEmailVerified" name="emailVerified" checked={modalEmailVerified} onChange={(e) => setModalEmailVerified(e.target.checked)} className="form-checkbox"/>
                    <label htmlFor="modalEditEmailVerified" className="ml-2 text-sm font-medium text-gray-700">Email Verified</label>
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-3">
                <button type="button" onClick={closeEditModal} className="btn-secondary py-2 px-4">Cancel</button>
                <button type="submit" disabled={isUpdating} className="btn-primary py-2 px-4 disabled:opacity-50">
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Add/Update CSS in globals.css (ensure these classes match your global style definitions)
/*
.label-form { @apply block text-sm font-medium text-gray-700 mb-1; }
.input-form { @apply mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-400; }
.select-form { @apply mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md; }
.th-table { @apply px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap; }
.td-table { @apply px-4 py-3 text-sm text-gray-700; } // Removed whitespace-nowrap to allow wrapping for long emails if needed
.status-badge { @apply px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full; }
.pagination-btn { @apply inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed; }
.form-checkbox { @apply h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-offset-0 focus:ring-blue-500; }
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 py-2 px-4 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2; }
.btn-secondary { @apply px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500; }
.abs-icon-left { @apply absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none; }
.icon-sm { @apply h-5 w-5 text-gray-400; }
.checkbox-group { @apply flex items-center space-x-3 p-3 bg-slate-50 rounded-md border border-slate-200; }
.help-text { @apply text-xs text-gray-500 mt-1; }
.action-icon-button { @apply p-1.5 rounded-md transition-colors; } // For consistent icon button padding & hover
*/