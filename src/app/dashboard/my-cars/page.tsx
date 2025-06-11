"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, UserRole } from '@prisma/client';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit3, Trash2, PlusCircle, Eye, EyeOff, CarFront } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Define a type for the car data specific to this page if needed
// (Removed empty OwnerCar interface; use Car directly)

export default function MyCarsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cars, setCars] = useState<Car[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carToDelete, setCarToDelete] = useState<Car | null>(null);
  // Define a type for the session user with a 'role' property
  type SessionUserWithRole = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: UserRole;
  };

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/login?callbackUrl=/dashboard/my-cars');
      return;
    }

    const userRole = (session.user as SessionUserWithRole).role;
    if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
      // Could redirect to an access denied page or show message
      setError("Access Denied: You are not authorized to view this page.");
      setIsLoading(false);
      // router.push('/');
      return;
    }

    const fetchOwnedCars = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/users/my-cars');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch cars: ${response.statusText}`);
        }
        const data: Car[] = await response.json();
        setCars(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      }
    };

    if (session && (userRole === UserRole.OWNER || userRole === UserRole.ADMIN)) {
        fetchOwnedCars();
    }

  }, [session, status, router]);

  const handleDeleteCar = async () => {
    if (!carToDelete) return;
    setIsLoading(true); // You might want a specific loading state for delete
    try {
      const response = await fetch(`/api/cars/${carToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete car.');
      }
      setCars(cars.filter(car => car.id !== carToDelete.id));
      setCarToDelete(null); // Close dialog
      // Add a success toast/notification here
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
      // Add an error toast/notification here
    } finally {
      setIsLoading(false); // Reset general loading or delete specific loading
    }
  };

  if (status === 'loading' || (isLoading && cars.length === 0 && !error) ) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading your cars...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500 bg-red-100 p-4 rounded-md">{error}</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Cars</h1>
        <Button asChild>
          <Link href="/list-your-car">
            <PlusCircle className="mr-2 h-5 w-5" /> List New Car
          </Link>
        </Button>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-10 bg-white shadow-md rounded-lg">
          <CarFront className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No cars listed yet.</h2>
          <p className="text-gray-500 mb-6">Start earning by listing your car on SafariRide!</p>
          <Button asChild size="lg">
            <Link href="/list-your-car">List Your First Car</Link>
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0"> {/* Remove padding for full-width table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] hidden sm:table-cell">Image</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead className="hidden md:table-cell">Year</TableHead>
                  <TableHead>Price/Day</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell className="hidden sm:table-cell">
                      {car.imageUrls && car.imageUrls.length > 0 ? (
                        <Image
                          src={car.imageUrls[0]}
                          alt={`${car.make} ${car.model}`}
                          width={64}
                          height={48}
                          className="h-12 w-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="h-12 w-16 bg-gray-100 rounded-md flex items-center justify-center">
                          <CarFront className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/cars/${car.id}`} className="hover:text-sky-600 hover:underline">
                        {car.make} {car.model}
                      </Link>
                      <div className="text-xs text-gray-500 sm:hidden">{car.year} • {car.location}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{car.year}</TableCell>
                    <TableCell>KES {car.pricePerDay.toLocaleString()}</TableCell>
                    <TableCell className="hidden lg:table-cell">{car.location}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={car.isListed ? "default" : "outline"} className={car.isListed ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-600 border-gray-300"}>
                          {car.isListed ? <Eye className="mr-1 h-3 w-3"/> : <EyeOff className="mr-1 h-3 w-3"/>}
                          {car.isListed ? 'Listed' : 'Unlisted'}
                        </Badge>
                        <Badge variant={car.isVerified ? "default" : "outline"} className={car.isVerified ? "bg-sky-100 text-sky-700 border-sky-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}>
                          {car.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/my-cars/edit/${car.id}`}>
                                <Edit3 className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 focus:text-red-700"
                                onSelect={() => setCarToDelete(car)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {carToDelete && carToDelete.id === car.id && ( // Ensure dialog content renders only for the selected car
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the car
                                 &quot;{carToDelete.make} {carToDelete.model}&quot; and remove its data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setCarToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteCar}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Yes, delete car
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        )}
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}