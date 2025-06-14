"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react'; // To ensure admin access
import { User, UserRole } from '@prisma/client'; // Import necessary types
import { FiArrowLeft, FiShield, FiShieldOff, FiCheckCircle, FiXCircle, FiPhone, FiAlertTriangle } from 'react-icons/fi';

// Extended type for user details, including counts and potentially recent items
interface UserDetailsView extends Omit<User, 'password' | 'accounts' | 'sessions'> {
  _count?: {
    cars?: number;
    bookings?: number;
    reviewsGiven?: number;
  };
  // For more detail, you might fetch recent cars/bookings/reviews here too
  // cars: Pick<Car, 'id' | 'title' | 'make' | 'model'>[]; 
  // bookings: Pick<Booking, 'id' | 'startDate' | 'status'>[];
}

const DetailItem = ({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            {icon && <span className="mr-2 text-gray-400">{icon}</span>}
            {label}
        </dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || 'N/A'}</dd>
    </div>
);

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userId = params?.userId as string;

  const [user, setUser] = useState<UserDetailsView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'loading' || !userId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (sessionStatus === 'unauthenticated' || (session && (session.user as any).role !== UserRole.ADMIN)) {
      router.replace('/admin/users?error=unauthorized'); // Or to a general access denied page
      return;
    }

    const fetchUserDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/users/${userId}`); // API endpoint created in Step 1.2
        if (!response.ok) {
          const errData = await response.json().catch(() => ({ message: "Failed to fetch user details." }));
          throw new Error(errData.message);
        }
        setUser(await response.json());
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserDetails();
  }, [userId, sessionStatus, session, router]);
  
  const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };


  if (isLoading || sessionStatus === 'loading') {
    return <div className="text-center py-10"><p className="text-xl">Loading user details...</p></div>; // Add a better skeleton loader
  }
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error} <br/> <Link href="/admin/users" className="text-blue-600 hover:underline">Back to User List</Link></div>;
  }
  if (!user) {
    return <div className="text-center py-10">User not found. <br/> <Link href="/admin/users" className="text-blue-600 hover:underline">Back to User List</Link></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/users" className="inline-flex items-center text-blue-600 hover:text-blue-800 group">
          <FiArrowLeft className="mr-2 h-5 w-5 transition-transform group-hover:-translate-x-1" />
          Back to User List
        </Link>
      </div>

      <div className="bg-white shadow-xl rounded-lg overflow-hidden">
        <div className="p-6 md:p-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-center sm:space-x-6">
                <Image
                    className="h-24 w-24 rounded-full object-cover shadow-md mb-4 sm:mb-0"
                    src={user.image || '/default-avatar.png'}
                    alt={user.name || 'User Avatar'}
                    width={96}
                    height={96}
                    priority
                />
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{user.name || 'Unnamed User'}</h1>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <span className={`mt-2 inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium ${
                        user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                        user.role === UserRole.OWNER ? 'bg-sky-100 text-sky-700' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                        {user.role}
                    </span>
                </div>
                <div className="sm:ml-auto mt-4 sm:mt-0">
                    {/* <button onClick={() => router.push(`/admin/users/edit/${user.id}`)} // Or open modal
                        className="btn-secondary py-2 px-4 flex items-center">
                        <FiEdit2 className="mr-2 h-4 w-4"/> Edit User
                    </button> */}
                    {/* The edit modal is on the main users list page, for now. */}
                </div>
            </div>
        </div>

        <div className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Account Information</h2>
            <dl className="divide-y divide-gray-200">
                <DetailItem label="User ID" value={user.id} />
                <DetailItem label="Email Verified" value={user.emailVerified ? 
                    <span className="flex items-center text-green-600"><FiCheckCircle className="mr-1.5"/> Verified on {formatTimestamp(user.emailVerified)}</span> : 
                    <span className="flex items-center text-red-600"><FiXCircle className="mr-1.5"/> Not Verified</span>} 
                />
                <DetailItem 
                    label="Phone Number" 
                    value={
                        user.phoneNumber ? (
                            <div className="flex items-center">
                                <span>{user.phoneNumber}</span>
                                {user.phoneVerified ? (
                                    <span className="ml-2 text-green-600 flex items-center">
                                        <FiCheckCircle className="mr-1.5"/> Verified
                                    </span>
                                ) : (
                                    <span className="ml-2 text-orange-500 flex items-center">
                                        <FiAlertTriangle className="mr-1.5"/> Not Verified
                                    </span>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-500">Not provided</span>
                        )
                    }
                    icon={<FiPhone />}
                />
                <DetailItem 
                    label="Trusted Owner Status" 
                    value={ (user.role === UserRole.OWNER || user.role === UserRole.ADMIN) ? 
                        (user.isTrustedOwner ? 
                            <span className="flex items-center text-green-600"><FiShield className="mr-1.5"/> Trusted</span> : 
                            <span className="flex items-center text-gray-500"><FiShieldOff className="mr-1.5"/> Not Trusted</span>
                        ) : "N/A for this role"
                    } 
                />
                {/* Add isBlocked if implemented
                <DetailItem label="Account Status" value={user.isBlocked ? 
                    <span className="text-red-600 font-medium">Blocked</span> : 
                    <span className="text-green-600 font-medium">Active</span>} 
                /> */}
                <DetailItem label="Joined On" value={formatTimestamp(user.createdAt)} />
                <DetailItem label="Last Updated" value={formatTimestamp(user.updatedAt)} />
            </dl>
        </div>
        
        {/* Placeholder sections for related data */}
        {(user.role === UserRole.OWNER || user.role === UserRole.ADMIN) && user._count?.cars !== undefined && user._count.cars > 0 && (
            <div className="p-6 md:p-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Cars Listed ({user._count.cars})</h2>
                <p className="text-sm text-gray-500">Detailed list of cars coming soon...</p>
                {/* TODO: Fetch and display a few recent cars or link to a filtered car list */}
            </div>
        )}
        {user._count?.bookings !== undefined && user._count.bookings > 0 && (
            <div className="p-6 md:p-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Booking History ({user._count.bookings})</h2>
                <p className="text-sm text-gray-500">Detailed booking history coming soon...</p>
                {/* TODO: Fetch and display a few recent bookings or link to a filtered booking list */}
            </div>
        )}
         {user._count?.reviewsGiven !== undefined && user._count.reviewsGiven > 0 && (
            <div className="p-6 md:p-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-700 mb-4">Reviews Given ({user._count.reviewsGiven})</h2>
                <p className="text-sm text-gray-500">Detailed review history coming soon...</p>
            </div>
        )}

      </div>
    </div>
  );
}

// Ensure these CSS classes (input-form, select-form, th-table etc.) are defined in your globals.css