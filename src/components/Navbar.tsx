"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react'; // useEffect might not be needed directly here anymore
import { UserRole } from '@prisma/client'; // Assuming your enum is named UserRole
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // For mobile menu
import {
  Menu, CarFront, PlusCircle, UserCircle, LayoutDashboard, ListOrdered, LogOut, Shield, Sun, Moon, User // Added User icon for profile
} from 'lucide-react';
import { useTheme } from "next-themes";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const themeContext = useTheme();
  const theme = themeContext?.theme ?? 'light';
  const setTheme = themeContext?.setTheme ?? (() => {});

  const navLinks = [
    { href: "/browse-cars", label: "Browse Cars", icon: <CarFront className="mr-2 h-4 w-4" /> },
    // Add more common links here like About, How it Works, FAQ if not in footer only
    { href: "/how-it-works", label: "How It Works", icon: <CarFront className="mr-2 h-4 w-4" /> }, // Example
    { href: "/faq", label: "FAQ", icon: <CarFront className="mr-2 h-4 w-4" /> }, // Example
  ];

  // Links specific to authenticated users (can be further refined by role)
  const userSpecificLinks = [
    { href: "/profile", label: "My Profile", icon: <User className="mr-2 h-4 w-4" /> },
    { href: "/my-bookings", label: "My Bookings", icon: <ListOrdered className="mr-2 h-4 w-4" /> },
  ];

  const ownerLinks = [
    { href: "/owner/dashboard", label: "Owner Dashboard", icon: <LayoutDashboard className="mr-2 h-4 w-4" /> },
    { href: "/list-your-car", label: "List New Car", icon: <PlusCircle className="mr-2 h-4 w-4" /> },
    // Consider if "/dashboard/my-cars" is distinct from "/owner/dashboard" or part of it.
    // For simplicity, often Owner Dashboard is the main entry for their cars.
  ];

  const adminLinks = [
    { href: "/admin/dashboard", label: "Admin Dashboard", icon: <Shield className="mr-2 h-4 w-4" /> }, // Changed icon
    // Other admin links can be in admin layout's sidebar rather than here to keep user dropdown cleaner
  ];

  const userRole = session?.user?.role as UserRole | undefined;

  const UserAvatar = () => (
    <Avatar className="h-8 w-8 cursor-pointer"> {/* Added cursor-pointer */}
      <AvatarImage src={session?.user?.image || undefined} alt={session?.user?.name || "User"} />
      <AvatarFallback>
        {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
      </AvatarFallback>
    </Avatar>
  );

  const DesktopNavLinks = () => (
    <>
      {navLinks.map(link => (
        <Button key={link.href} variant="ghost" asChild className="text-sm font-medium text-muted-foreground hover:text-primary">
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
      {session && (userRole === UserRole.OWNER || userRole === UserRole.ADMIN) && (
        <Button variant="ghost" asChild className="text-sm font-medium text-muted-foreground hover:text-primary">
            <Link href="/list-your-car">List a Car</Link>
        </Button>
      )}
    </>
  );

  const MobileNavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="grid gap-1 text-base font-medium"> {/* Reduced gap for tighter mobile list */}
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold mb-4 px-3 py-2" onClick={onLinkClick}>
        <Image className="h-7 w-7" src="/logo.svg" alt="SafariRide Logo" width={28} height={28} priority /> {/* Use Next.js Image for optimization */}
        <span className="text-xl">SafariRide</span>
      </Link>
      {navLinks.map(link => (
        <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted" onClick={onLinkClick}>
          {link.icon} {link.label}
        </Link>
      ))}
      {/* Common links for logged-in users */}
      {session && userSpecificLinks.map(link => (
         <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted" onClick={onLinkClick}>
            {link.icon} {link.label}
         </Link>
      ))}

      {/* Owner specific links */}
      {session && (userRole === UserRole.OWNER || userRole === UserRole.ADMIN) && (
        <>
          <DropdownMenuSeparator className="my-2 mx-3" />
          <p className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Owner Tools</p>
          {ownerLinks.map(link => (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted" onClick={onLinkClick}>
              {link.icon} {link.label}
            </Link>
          ))}
        </>
      )}

      {/* Admin specific links */}
      {session && userRole === UserRole.ADMIN && (
        <>
          <DropdownMenuSeparator className="my-2 mx-3" />
          <p className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Admin Area</p>
          {adminLinks.map(link => (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted" onClick={onLinkClick}>
                {link.icon} {link.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 mr-6"> {/* Added gap and mr */}
            <Image className="h-7 w-7" src="/logo.svg" alt="SafariRide Logo" width={28} height={28} priority />
            <span className="font-bold text-xl text-foreground">SafariRide</span> {/* Use foreground for theme compatibility */}
          </Link>
          <nav className="hidden md:flex items-center space-x-1">
            <DesktopNavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {typeof setTheme === "function" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          )}

          {status === 'loading' ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0"> {/* Slightly larger avatar trigger */}
                  <UserAvatar />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60"> {/* Slightly wider dropdown */}
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1 p-1">
                    <p className="text-sm font-medium leading-none truncate">{session.user?.name || "Valued User"}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">{session.user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* --- USER SPECIFIC LINKS --- */}
                {userSpecificLinks.map(link => (
                    <DropdownMenuItem key={link.href} asChild>
                        <Link href={link.href} className="flex items-center w-full"> {/* Ensure link takes full width */}
                            {link.icon} {link.label}
                        </Link>
                    </DropdownMenuItem>
                ))}

                {(userRole === UserRole.OWNER || userRole === UserRole.ADMIN) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs px-2 py-1.5 font-semibold uppercase text-muted-foreground tracking-wider">Owner Tools</DropdownMenuLabel>
                    {ownerLinks.map(link => (
                       <DropdownMenuItem key={link.href} asChild>
                         <Link href={link.href} className="flex items-center w-full">{link.icon} {link.label}</Link>
                       </DropdownMenuItem>
                    ))}
                  </>
                )}

                {userRole === UserRole.ADMIN && (
                  <>
                    <DropdownMenuSeparator />
                     <DropdownMenuLabel className="text-xs px-2 py-1.5 font-semibold uppercase text-muted-foreground tracking-wider">Admin Panel</DropdownMenuLabel>
                    {adminLinks.map(link => ( // Only show the main admin dashboard link here
                       <DropdownMenuItem key={link.href} asChild>
                         <Link href={link.href} className="flex items-center w-full">{link.icon} {link.label}</Link>
                       </DropdownMenuItem>
                    ))}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild className="bg-sky-500 hover:bg-sky-600">
                <Link href="/auth/signup">Sign Up</Link>
              </Button>
            </div>
          )}

          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[320px] p-0 pt-6"> {/* Adjusted padding */}
                {/* SheetHeader removed, title is part of MobileNavLinks */}
                <MobileNavLinks onLinkClick={() => setIsMobileMenuOpen(false)} />
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background"> {/* Ensure bg for mobile auth */}
                  {status === 'loading' ? (
                    // Loading placeholder
                    <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
                  ) : session ? (
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <UserAvatar />
                            <span className="text-sm font-medium truncate">{session.user?.name || "User"}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => {signOut({ callbackUrl: '/' }); setIsMobileMenuOpen(false);}}>
                            <LogOut className="h-5 w-5"/>
                        </Button>
                    </div>
                  ) : (
                     <div className="grid gap-2">
                        <Button asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Link href="/auth/login">Login</Link>
                        </Button>
                        <Button variant="outline" asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                            <Link href="/auth/signup">Sign Up</Link>
                        </Button>
                    </div> 
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}