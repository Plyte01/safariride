"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Car, UserRole, CarCategory, TransmissionType, FuelType } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2 } from 'lucide-react';

// Define a more specific type if the API returns nested data
interface CarDataToEdit extends Omit<Car, 'createdAt' | 'updatedAt' | 'ownerId' | 'averageRating' | 'totalRatings'> {
    features: string[]; // Must always be a string array to match Car
    // any other specific fields for edit form
}


export default function EditCarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const carId = params?.carId as string;

  const [carData, setCarData] = useState<Partial<CarDataToEdit>>({});
  const [initialCarData, setInitialCarData] = useState<Partial<CarDataToEdit>>({}); // To compare for changes
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [featuresInput, setFeaturesInput] = useState('');


  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true for fetching car data
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push(`/auth/login?callbackUrl=/dashboard/my-cars/edit/${carId}`);
      return;
    }
    type SessionUser = typeof session.user;
    interface SessionUserWithRole extends SessionUser {
      role: UserRole;
      id: string;
    }
    const userRole = (session.user as SessionUserWithRole).role;
    if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
      setError("Access Denied: You are not authorized to edit this car.");
      setIsLoading(false);
      return;
    }

    if (carId && session) { // Ensure carId and session are available
      const fetchCarData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await fetch(`/api/cars/${carId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch car data for editing.');
          }
          const data: Car = await response.json();

          // Authorization: Check if the logged-in user is the owner (admin can bypass)
          if (userRole !== UserRole.ADMIN && data.ownerId !== session.user?.id) {
             setError("Access Denied: You do not own this car.");
             setIsLoading(false);
             return;
          }

          setCarData({
            make: data.make,
            model: data.model,
            year: data.year,
            pricePerDay: data.pricePerDay,
            pricePerHour: data.pricePerHour,
            location: data.location,
            description: data.description,
            seats: data.seats,
            transmission: data.transmission,
            fuelType: data.fuelType,
            category: data.category,
            isListed: data.isListed,
            title: data.title, // from your schema
            color: data.color, // from your schema
            licensePlate: data.licensePlate, // from your schema
            availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined, // Store as Date object
            availableTo: data.availableTo ? new Date(data.availableTo) : undefined, // Store as Date object
            isActive: data.isActive, // from your schema
          });
          setImageUrls(data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : ['']);
          setFeaturesInput(data.features ? data.features.join(', ') : '');
          setInitialCarData({ ...data }); // Store initial data

        } catch (err: unknown) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred.');
          }
        } finally {
          setIsLoading(false);
        }
      };
      fetchCarData();
    }
  }, [carId, session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
        setCarData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }));
    } else if (type === 'date') {
        setCarData(prev => ({ ...prev, [name]: value ? new Date(value) : null }));
    } else {
        setCarData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: keyof CarDataToEdit) => (value: string) => {
    let typedValue: string | CarCategory | TransmissionType | FuelType = value;
    if (name === 'category') {
      typedValue = value as CarCategory;
    } else if (name === 'transmission') {
      typedValue = value as TransmissionType;
    } else if (name === 'fuelType') {
      typedValue = value as FuelType;
    }
    setCarData(prev => ({ ...prev, [name]: typedValue }));
  };

  const handleCheckboxChange = (name: keyof CarDataToEdit) => (checked: boolean) => {
    setCarData(prev => ({ ...prev, [name]: checked }));
  };

  // Handle image URL inputs
  const handleImageUrlChange = (index: number, value: string) => {
    const newImageUrls = [...imageUrls];
    newImageUrls[index] = value;
    setImageUrls(newImageUrls);
  };

  const addImageUrlField = () => {
    setImageUrls([...imageUrls, '']);
  };

  const removeImageUrlField = (index: number) => {
    if (imageUrls.length > 1 || (imageUrls.length === 1 && imageUrls[0] !== '')) {
      const newImageUrls = imageUrls.filter((_, i) => i !== index);
      if (newImageUrls.length === 0) {
          setImageUrls(['']); // Keep at least one empty field if all are removed
      } else {
          setImageUrls(newImageUrls);
      }
    }
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const validImageUrls = imageUrls.filter(url => url.trim() !== '');
    if (validImageUrls.length === 0) {
        setError('Please provide at least one valid image URL.');
        setIsSubmitting(false);
        return;
    }

    const featuresArray = featuresInput.split(',').map(f => f.trim()).filter(f => f);

    const updatedData = {
      ...carData,
      year: carData.year ? Number(carData.year) : undefined,
      pricePerDay: carData.pricePerDay ? Number(carData.pricePerDay) : undefined,
      pricePerHour: carData.pricePerHour !== undefined && carData.pricePerHour !== null ? Number(carData.pricePerHour) : null,
      seats: carData.seats ? Number(carData.seats) : undefined,
      availableFrom: carData.availableFrom ? new Date(carData.availableFrom).toISOString() : null,
      availableTo: carData.availableTo ? new Date(carData.availableTo).toISOString() : null,
      imageUrls: validImageUrls,
      features: featuresArray,
    };

    // Remove fields that shouldn't be sent or are undefined if they weren't changed
    // For a PUT request, only send fields that have actually changed or all fields if your API expects that
    // This logic can be more sophisticated to only send changed fields.
    // For simplicity, we send all editable fields.

    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to update car.');
      } else {
        setSuccess('Car updated successfully!');
        setInitialCarData({ ...data }); // Update initial data to new state
        // Optionally, redirect after a delay
        setTimeout(() => {
            setSuccess(null); // Clear success message
            // router.push('/dashboard/my-cars');
        }, 2000);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading car data for editing...</div>;
  }

  if (error && !Object.keys(carData).length) { // Show full page error if carData couldn't be loaded
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500 bg-red-100 p-4 rounded-md">{error}</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/my-cars"><ArrowLeft className="mr-2 h-4 w-4"/> Back to My Cars</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8">
      <Button asChild variant="outline" className="mb-6">
        <Link href="/dashboard/my-cars">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Cars
        </Link>
      </Button>
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Edit Car: {initialCarData.make} {initialCarData.model}</h1>

      {/* Display general error if carData loaded but submission failed etc. */}
      {error && Object.keys(carData).length > 0 && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-3xl mx-auto">
        {/* Replicate form fields from ListYourCarPage, but populate with carData */}
        {/* Example for Make and Model */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="title">Listing Title <span className="text-red-500">*</span></Label>
                <Input id="title" name="title" value={carData.title || ''} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="make">Make <span className="text-red-500">*</span></Label>
                <Input id="make" name="make" value={carData.make || ''} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="model">Model <span className="text-red-500">*</span></Label>
                <Input id="model" name="model" value={carData.model || ''} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="year">Year <span className="text-red-500">*</span></Label>
                <Input id="year" name="year" type="number" value={carData.year || ''} onChange={handleChange} required />
            </div>
             <div>
                <Label htmlFor="color">Color <span className="text-red-500">*</span></Label>
                <Input id="color" name="color" value={carData.color || ''} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="licensePlate">License Plate</Label>
                <Input id="licensePlate" name="licensePlate" value={carData.licensePlate || ''} onChange={handleChange} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="pricePerDay">Price per Day (KES) <span className="text-red-500">*</span></Label>
                <Input id="pricePerDay" name="pricePerDay" type="number" value={carData.pricePerDay || ''} onChange={handleChange} required min="0" step="0.01" />
            </div>
            <div>
                <Label htmlFor="pricePerHour">Price per Hour (KES)</Label>
                <Input id="pricePerHour" name="pricePerHour" type="number" value={carData.pricePerHour === null ? '' : carData.pricePerHour || ''} onChange={handleChange} min="0" step="0.01" />
            </div>
        </div>
         <div>
            <Label htmlFor="location">Location (City/Area) <span className="text-red-500">*</span></Label>
            <Input id="location" name="location" value={carData.location || ''} onChange={handleChange} required />
        </div>
        <div>
            <Label htmlFor="seats">Seats <span className="text-red-500">*</span></Label>
            <Input id="seats" name="seats" type="number" value={carData.seats || ''} onChange={handleChange} required min="1" />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Select name="category" value={carData.category || ''} onValueChange={handleSelectChange('category')}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                        {Object.values(CarCategory).map(cat => <SelectItem key={cat} value={cat}>{cat.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="transmission">Transmission <span className="text-red-500">*</span></Label>
                 <Select name="transmission" value={carData.transmission || ''} onValueChange={handleSelectChange('transmission')}>
                    <SelectTrigger><SelectValue placeholder="Select transmission" /></SelectTrigger>
                    <SelectContent>
                        {Object.values(TransmissionType).map(type => <SelectItem key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="fuelType">Fuel Type <span className="text-red-500">*</span></Label>
                <Select name="fuelType" value={carData.fuelType || ''} onValueChange={handleSelectChange('fuelType')}>
                    <SelectTrigger><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                    <SelectContent>
                        {Object.values(FuelType).map(type => <SelectItem key={type} value={type}>{type.charAt(0) + type.slice(1).toLowerCase()}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div>
          <Label htmlFor="features">Features (comma-separated)</Label>
          <Input id="features" value={featuresInput} onChange={(e) => setFeaturesInput(e.target.value)} placeholder="e.g., Air Conditioning, Sunroof" />
        </div>

        <div>
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" name="description" value={carData.description || ''} onChange={handleChange} required rows={4} />
        </div>

        <div className="space-y-2">
            <Label>Image URLs (at least one required) <span className="text-red-500">*</span></Label>
            {imageUrls.map((url, index) => (
                <div key={index} className="flex items-center space-x-2">
                    <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={url}
                        onChange={(e) => handleImageUrlChange(index, e.target.value)}
                        required={index === 0 && url.trim() === ''}
                    />
                    {index > 0 || (imageUrls.length > 1 && index === 0) ? ( // Show remove button if not the only field, or if it's the first of multiple
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeImageUrlField(index)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    ) : <div className="w-9 h-9"></div> /* Placeholder for alignment */ }
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addImageUrlField}>
                + Add Image URL
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Label htmlFor="availableFrom">Available From</Label>
                <Input id="availableFrom" name="availableFrom" type="date" value={carData.availableFrom ? (carData.availableFrom instanceof Date ? carData.availableFrom.toISOString().split('T')[0] : String(carData.availableFrom)) : ''} onChange={handleChange} />
            </div>
            <div>
                <Label htmlFor="availableTo">Available To</Label>
                <Input id="availableTo" name="availableTo" type="date" value={carData.availableTo ? (carData.availableTo instanceof Date ? carData.availableTo.toISOString().split('T')[0] : String(carData.availableTo)) : ''} onChange={handleChange} />
            </div>
        </div>


        <div className="flex items-center space-x-2">
            <Checkbox id="isListed" name="isListed" checked={carData.isListed || false} onCheckedChange={handleCheckboxChange('isListed')} />
            <Label htmlFor="isListed" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Make this car listing active? (Listed)
            </Label>
        </div>
         <div className="flex items-center space-x-2">
            <Checkbox id="isActive" name="isActive" checked={carData.isActive || false} onCheckedChange={handleCheckboxChange('isActive')} />
            <Label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Is this car generally active and available for booking? (Active)
            </Label>
        </div>


        <div className="pt-2">
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Updating Car...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}