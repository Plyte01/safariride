"use client"; // This layout will use client-side hooks for session and navigation

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { UserRole } from '@prisma/client';

interface SessionUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: UserRole;
}

// Example Icons (install react-icons: npm install react-icons)
import { 
    FiHome, FiUsers, FiBox, FiCalendar, FiSettings, FiFileText, FiLogOut, FiMenu, FiX} from 'react-icons/fi';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  href: string;
  icon: ReactNode;
  label: string;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const userRole = session?.user ? (session.user as SessionUser).role : undefined;

    if (!session) {
      router.replace(`/auth/login?callbackUrl=${pathname}`); // Redirect to login if not authenticated
      return;
    }

    if (userRole !== UserRole.ADMIN) {
      // router.replace('/?error=unauthorized'); // Redirect to homepage or an error page if not admin
      // For now, let's render an access denied message directly within the layout space
      // This prevents layout flashes if redirect is slow.
    }
  }, [session, status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading Admin Panel...</div>
        {/* Add a spinner here if desired */}
      </div>
    );
  }

  if (!session || (session.user as SessionUser).role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-6 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-700 mb-6">You do not have permission to access this area.</p>
        <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Go to Homepage
        </Link>
      </div>
    );
  }

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', icon: <FiHome className="h-5 w-5" />, label: 'Dashboard' },
    { href: '/admin/users', icon: <FiUsers className="h-5 w-5" />, label: 'Users' },
    { href: '/admin/cars', icon: <FiBox className="h-5 w-5" />, label: 'Cars' },
    { href: '/admin/bookings', icon: <FiCalendar className="h-5 w-5" />, label: 'Bookings' },
    //{ href: '/admin/reviews', icon: <FiStar className="h-5 w-5" />, label: 'Reviews' }, // Example
    { href: '/admin/settings', icon: <FiSettings className="h-5 w-5" />, label: 'Platform Settings' },
    { href: '/admin/content/faqs', icon: <FiFileText className="h-5 w-5" />, label: 'Manage FAQs' },
    //{ href: '/admin/analytics', icon: <FiBarChart2 className="h-5 w-5" />, label: 'Analytics' }, // Example
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-gray-100 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <Link href="/admin/dashboard" className="text-xl font-bold text-white">SafariRide Admin</Link>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 text-gray-400 hover:text-white">
            <FiX className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-grow px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile nav click
              className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                ${pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-gray-700">
          <Link href="/api/auth/signout" 
            className="flex items-center w-full px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
            onClick={(e) => {
                e.preventDefault();
                // signOut({ callbackUrl: '/' }); // NextAuth signOut
                router.push('/'); // Or a custom logout handling
                alert("Logout functionality to be fully implemented with NextAuth signOut");
            }}
            >
            <FiLogOut className="h-5 w-5" />
            <span className="ml-3">Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar for mobile nav toggle and user info (optional) */}
        <header className="md:hidden flex items-center justify-between h-16 px-6 bg-white border-b">
            <button onClick={() => setIsSidebarOpen(true)} className="p-1 text-gray-600 hover:text-gray-800">
                <FiMenu className="h-6 w-6" />
            </button>
            <span className="text-lg font-semibold">Admin Panel</span>
            {/* Add user avatar or name here if needed */}
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;