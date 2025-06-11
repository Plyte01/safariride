/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { UserRole, CarCategory, TransmissionType, FuelType, Car, User, Prisma } from '@prisma/client'; // Added Prisma for input types
import { FiTrash2, FiPlusCircle, FiAlertTriangle, FiCheckCircle, FiImage, FiLoader, FiArrowLeft, FiSave } from 'react-icons/fi';

// Helper functions (same as before)
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const formatEnumForDisplay = (enumKey: string) => enumKey.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

// Reusable Input/Select Components (same as before)
const FormInput = ({ id, label, type = "text", value, onChange, required = false, placeholder = "", min, max, step, children, helpText, className = "", disabled = false }: any) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <input id={id} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder} min={min} max={max} step={step} disabled={disabled}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:bg-gray-100" />
    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    {children}
  </div>
);
const FormSelect = ({ id, label, value, onChange, required = false, children, helpText, className = "", disabled = false }: any) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <select id={id} value={value} onChange={onChange} required={required} disabled={disabled}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 disabled:bg-gray-100">
      {children}
    </select>
    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
  </div>
);

// Interface for client-side image tracking
interface UploadedImage {
  file?: File; previewUrl?: string; cloudinaryUrl?: string; public_id?: string;
  isLoading?: boolean; error?: string; isExisting?: boolean;
}

// Interface for users fetched for owner dropdown
interface SelectableUser extends Pick<User, 'id' | 'name' | 'email'> {}


export default function AdminEditCarPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const carId = params?.carId as string;

  // Form state
  const [title, setTitle] = useState('');
  const [make, setMake] = useState('');
  const [modelName, setModelName] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [transmission, setTransmission] = useState<TransmissionType>(TransmissionType.AUTOMATIC);
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.PETROL);
  const [seats, setSeats] = useState<number | ''>('');
  const [category, setCategory] = useState<CarCategory>(CarCategory.SEDAN);
  const [currentFeaturesInput, setCurrentFeaturesInput] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [pricePerHour, setPricePerHour] = useState<number | ''>('');
  const [pricePerDay, setPricePerDay] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  
  // Admin-specific fields
  const [isListed, setIsListed] = useState(true);       // Can be toggled by owner or admin
  const [isVerified, setIsVerified] = useState(false);  // Primarily admin controlled
  const [isActive, setIsActive] = useState(true);       // Primarily admin controlled (platform active status)
  const [ownerId, setOwnerId] = useState('');           // Admin can change this

  const [carImages, setCarImages] = useState<UploadedImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]); // public_ids of images to delete on save
  const [allPotentialOwners, setAllPotentialOwners] = useState<SelectableUser[]>([]);

  const [initialCarDataForDiff, setInitialCarDataForDiff] = useState<Partial<Car>>({}); // To detect actual changes
  const [pageError, setPageError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [, setFormError] = useState<string | null>(null);
  
  useEffect(() => {
    if (sessionStatus === 'loading' || !carId) return;
    if (sessionStatus === 'unauthenticated') {
      router.push(`/auth/login?callbackUrl=/admin/cars/${carId}/edit`); return;
    }
    if (session && (session.user as any).role !== UserRole.ADMIN) {
      setPageError("Access Denied: This page is for Administrators only.");
      setIsAuthorized(false); setIsLoadingData(false); return;
    }
    setIsAuthorized(true);

    const fetchCarAndUsersData = async () => {
      setIsLoadingData(true); setPageError(null);
      try {
        // Fetch car details using ADMIN endpoint
        const carRes = await fetch(`/api/admin/cars/${carId}`); // Changed to admin endpoint
        if (!carRes.ok) {
            const errData = await carRes.json().catch(() => ({message: 'Failed to fetch car details.'}));
            throw new Error(errData.message);
        }
        const carData: Car & { owner: Pick<User, 'id'> } = await carRes.json();
        
        setInitialCarDataForDiff(carData); // Store initial data for diffing later
        setTitle(carData.title || ''); setMake(carData.make || ''); setModelName(carData.model || '');
        setYear(carData.year || ''); setColor(carData.color || ''); setLicensePlate(carData.licensePlate || '');
        setTransmission(carData.transmission); setFuelType(carData.fuelType); setSeats(carData.seats || '');
        setCategory(carData.category);
        const initialFeatures = carData.features || []; setFeatures(initialFeatures); setCurrentFeaturesInput(initialFeatures.join(', '));
        setPricePerHour(carData.pricePerHour === null ? '' : (carData.pricePerHour || ''));
        setPricePerDay(carData.pricePerDay || '');
        setLocation(carData.location || '');
        setLatitude(carData.latitude === null ? '' : (carData.latitude || ''));
        setLongitude(carData.longitude === null ? '' : (carData.longitude || ''));
        setDescription(carData.description || '');
        setAvailableFrom(carData.availableFrom ? new Date(carData.availableFrom).toISOString().split('T')[0] : '');
        setAvailableTo(carData.availableTo ? new Date(carData.availableTo).toISOString().split('T')[0] : '');
        setIsListed(carData.isListed); setIsVerified(carData.isVerified); setIsActive(carData.isActive);
        setOwnerId(carData.ownerId);

        const initialImageStates: UploadedImage[] = (carData.images || []).map(url => {
            const parts = url.split('/');
            const publicIdWithFormat = parts.pop() || '';
            const publicIdCandidate = publicIdWithFormat.substring(0, publicIdWithFormat.lastIndexOf('.'));
            const folderPathForId = parts.slice(parts.indexOf('upload') + 2, parts.length -1).join('/'); // Gets folder path
            return {
                cloudinaryUrl: url,
                public_id: `${folderPathForId}/${publicIdCandidate}`, // Reconstruct full public_id with folder
                previewUrl: url, isExisting: true,
            };
        });
        setCarImages(initialImageStates.length > 0 ? initialImageStates : [{}]);

        // Fetch users (potential owners) - simplified, might need pagination for many users
        const usersRes = await fetch('/api/admin/users?role=OWNER'); // Or fetch all users and let admin pick
        if (usersRes.ok) {
            const usersData = await usersRes.json();
            setAllPotentialOwners(usersData.users.map((u: User) => ({id: u.id, name: u.name, email: u.email})) || []);
        } else { console.warn("Could not fetch list of potential owners."); }

      } catch (err: any) { setPageError(err.message); setIsAuthorized(false); }
      finally { setIsLoadingData(false); }
    };
    if (session && (session.user as any).role === UserRole.ADMIN) {
        fetchCarAndUsersData();
    }
  }, [carId, session, sessionStatus, router]);


  const handleFeaturesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputText = e.target.value; setCurrentFeaturesInput(inputText);
    setFeatures(inputText.split(',').map(f => f.trim()).filter(Boolean));
  };
  
  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Max file size (e.g., 5MB) & Type Check
    if (file.size > 5 * 1024 * 1024) {
        const updatedImages = carImages.map((img, i) => i === index ? { ...img, file: undefined, previewUrl: undefined, error: 'File is too large (max 5MB).', isLoading: false } : img);
        setCarImages(updatedImages);
        return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        const updatedImages = carImages.map((img, i) => i === index ? { ...img, file: undefined, previewUrl: undefined, error: 'Invalid file type.', isLoading: false } : img);
        setCarImages(updatedImages);
        return;
    }

    const previewUrl = URL.createObjectURL(file);
    // Use functional update to ensure we're working with the latest state
    setCarImages(prevImages => 
        prevImages.map((img, i) => 
            i === index ? { file, previewUrl, isLoading: true, error: undefined, cloudinaryUrl: undefined, public_id: undefined } : img
        )
    );

    try {
      const sigResponse = await fetch('/api/cloudinary/sign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: `safariride/cars/${session?.user?.id || 'unknown_user'}` }),
      });

      if (!sigResponse.ok) {
        const errorData = await sigResponse.json().catch(() => ({ message: 'Failed to get upload signature.' }));
        throw new Error(errorData.message);
      }
      const { signature, timestamp, apiKey, cloudName, folder } = await sigResponse.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ message: 'Cloudinary upload failed.' }));
        throw new Error(errorData.error?.message || errorData.message || 'Cloudinary upload failed.');
      }
      const uploadedImageData = await uploadResponse.json();

      setCarImages(prevImages =>
        prevImages.map((img, i) =>
          i === index ? {
            ...img,
            cloudinaryUrl: uploadedImageData.secure_url,
            public_id: uploadedImageData.public_id,
            isLoading: false,
            error: undefined,
          } : img
        )
      );
    } catch (err: unknown) {
      console.error("Upload error for image at index " + index + ":", err);
      const errorMessage = err instanceof Error ? err.message : "Upload failed.";
      setCarImages(prevImages =>
        prevImages.map((img, i) =>
          i === index ? { ...img, isLoading: false, error: errorMessage } : img
        )
      );
    }
  };
  const addImageUploaderSlot = () => {
    if (carImages.length < 5) { // Example: Limit to 5 images
        setCarImages(prevImages => [...prevImages, {}]);
    } else {
        setFormError("You can upload a maximum of 5 images."); // Use formError for this kind of message
        setTimeout(() => setFormError(null), 3000);
    }
  };
  const removeImage = async (index: number) => { // Make it async
    const imageToRemove = carImages[index];

    // If the image was uploaded to Cloudinary, attempt to delete it
    if (imageToRemove.cloudinaryUrl && imageToRemove.public_id) {
      // Optionally show a loading state for this specific image slot while deleting
      const updatedImages = carImages.map((img, i) => 
        i === index ? { ...img, isLoading: true, error: undefined } : img
      );
      setCarImages(updatedImages);

      try {
        const response = await fetch('/api/cloudinary/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: imageToRemove.public_id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to delete image from cloud.' }));
          // Keep the image in the list but show an error, allowing user to try removing again or ignore
          const finalImages = carImages.map((img, i) => 
            i === index ? { ...img, isLoading: false, error: errorData.message } : img
          );
          setCarImages(finalImages);
          console.error("Cloudinary delete error:", errorData.message);
          alert(`Could not delete image from cloud: ${errorData.message}. Please try removing again, or submit the form to update image list.`);
          return; // Don't remove from UI if cloud deletion failed, to give user another chance
        }
        // Cloud deletion successful, now remove from UI state
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Error deleting image.";
        const finalImages = carImages.map((img, i) => 
          i === index ? { ...img, isLoading: false, error: errorMessage } : img
        );
        setCarImages(finalImages);
        console.error("Error calling delete API:", err);
        alert(`Error deleting image: ${errorMessage}. Please try removing again, or submit the form to update image list.`);
        return; // Don't remove from UI
      }
    }


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // ... client-side validation ...
    const finalImageUrls = carImages.map(img => img.cloudinaryUrl).filter((url): url is string => !!url);
    if (finalImageUrls.length === 0) { /* ... error ... */ return; }

    setIsSubmittingForm(true); setPageError(null); setFormSuccess(null);

    // Construct payload with only changed fields (optional, but good practice)
    // Or send all fields as the admin PUT endpoint can handle full updates.
    // For simplicity now, sending all fields.
    const carPayload: Prisma.CarUpdateInput & { imagesToDelete?: string[] } = {
      title, make, model: modelName, year: Number(year), color: color || undefined, licensePlate: licensePlate || undefined,
      transmission, fuelType, seats: Number(seats), category, features,
      pricePerHour: (pricePerHour !== '' && !isNaN(Number(pricePerHour))) ? Number(pricePerHour) : undefined,
      pricePerDay: Number(pricePerDay),
      location, 
      latitude: (latitude !== '' && !isNaN(Number(latitude))) ? Number(latitude) : null,
      longitude: (longitude !== '' && !isNaN(Number(longitude))) ? Number(longitude) : null,
      description, 
      images: finalImageUrls,
      availableFrom: availableFrom ? new Date(availableFrom) : null, 
      availableTo: availableTo ? new Date(availableTo) : null,
      isListed, isVerified, isActive,
      owner: ownerId ? { connect: { id: ownerId } } : undefined, // Connect to new owner if changed
      // imagesToDelete: imagesToDelete, // Pass this if your API handles explicit deletion
    };
    
    // Remove unchanged fields (optional, if API handles partial updates well)
    // Object.keys(carPayload).forEach(key => {
    //     if (initialCarDataForDiff && carPayload[key as keyof typeof carPayload] === initialCarDataForDiff[key as keyof typeof initialCarDataForDiff] && key !== 'images') {
    //         delete carPayload[key as keyof typeof carPayload];
    //     }
    // });
    // if (JSON.stringify(finalImageUrls.sort()) === JSON.stringify((initialCarDataForDiff?.images || []).sort())) {
    //     delete carPayload.images;
    // }

    if (Object.keys(carPayload).length === 0 && imagesToDelete.length === 0) {
        setFormSuccess("No changes detected to save.");
        setIsSubmittingForm(false);
        return;
    }


    try {
      // First, delete images marked for deletion if any
      if (imagesToDelete.length > 0) {
          for (const publicId of imagesToDelete) {
              await fetch('/api/cloudinary/delete-image', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ public_id: publicId }),
              });
              // Log errors but continue, main update is more critical
          }
      }

      const response = await fetch(`/api/admin/cars/${carId}`, { // Use ADMIN PUT endpoint
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update car.');
      
      setFormSuccess('Car updated successfully by Admin!');
      setInitialCarDataForDiff(data); // Update initial data
      setImagesToDelete([]); // Clear deletion queue
      
      // Re-initialize carImages state from the newly saved data.images to reflect current state
       if (data.images && data.images.length > 0) {
          const existingImages = data.images.map((imgUrl: string) => {
            const parts = imgUrl.split('/');
            const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/'); 
            return { cloudinaryUrl: imgUrl, public_id: folderAndPublicId, previewUrl: imgUrl, isExisting: true };
          });
          setCarImages(existingImages);
        } else {
          setCarImages([{}]);
        }

      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: any) {
      setPageError(err.message);
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (isLoadingData || sessionStatus === 'loading') { /* ... loading UI ... */ }
  if (isAuthorized === false || (!initialCarDataForDiff && !isLoadingData)) { /* ... access denied or data load error UI ... */ }
  
  return (
    <div className="bg-slate-50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
            <Link href="/admin/cars" className="inline-flex items-center text-blue-600 hover:text-blue-800 group text-sm">
                <FiArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Back to Car Management
            </Link>
        </div>
        <div className="text-left mb-10"> {/* Changed to text-left for a more standard form header */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Edit Car (Admin)</h1>
          <p className="text-gray-600 mt-1">Modifying: <span className="font-semibold">{initialCarDataForDiff?.title || `${initialCarDataForDiff?.make} ${initialCarDataForDiff?.model}`}</span> (ID: {carId.substring(0,12)}...)</p>
        </div>

        {pageError && <div role="alert" className="alert-error"><FiAlertTriangle /><span>{pageError}</span></div>}
        {formSuccess && <div role="alert" className="alert-success"><FiCheckCircle /><span>{formSuccess}</span></div>}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl space-y-8">
          {/* Form Sections - Render all sections as in list-your-car, but pre-filled */}
          {/* Example Section: Basic Information */}
          
          <section>
            <h2 className="form-section-title">1. Basic Information</h2>
            {/* ... Basic Info FormInputs as before (title, make, model, year, color, licensePlate) ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
            <FormInput id="title" label="Listing Title" value={title} onChange={(e:any) => setTitle(e.target.value)} required placeholder="e.g., Reliable Toyota Axio for City Trips" />
            <FormInput id="make" label="Make" value={make} onChange={(e:any) => setMake(e.target.value)} required placeholder="e.g., Toyota" />
            <FormInput id="modelName" label="Model" value={modelName} onChange={(e:any) => setModelName(e.target.value)} required placeholder="e.g., Axio" />
            <FormInput id="year" label="Year" type="number" value={year} onChange={(e:any) => setYear(e.target.value === '' ? '' : Number(e.target.value))} required min="1980" max={new Date().getFullYear() + 2} />
            <FormInput id="color" label="Color" value={color} onChange={(e:any) => setColor(e.target.value)} placeholder="e.g., Pearl White" />
            <FormInput id="licensePlate" label="License Plate" value={licensePlate} onChange={(e:any) => setLicensePlate(e.target.value)} placeholder="e.g., KDA 123X (Optional)" />
            </div>
        </section>

        <section>
            <h2 className="form-section-title">2. Specifications & Features</h2>
            {/* ... Specifications & Features FormInputs/Selects as before ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mt-4">
            <FormInput id="seats" label="Number of Seats" type="number" value={seats} onChange={(e:any) => setSeats(e.target.value === '' ? '' : Number(e.target.value))} required min="1" />
            <FormSelect id="category" label="Category" value={category} onChange={(e:any) => setCategory(e.target.value as CarCategory)} required>
                {Object.values(CarCategory).map(cat => <option key={cat} value={cat}>{formatEnumForDisplay(cat)}</option>)}
            </FormSelect>
            <FormSelect id="transmission" label="Transmission" value={transmission} onChange={(e:any) => setTransmission(e.target.value as TransmissionType)} required>
                {Object.values(TransmissionType).map(type => <option key={type} value={type}>{formatEnumForDisplay(type)}</option>)}
            </FormSelect>
            <FormSelect id="fuelType" label="Fuel Type" value={fuelType} onChange={(e:any) => setFuelType(e.target.value as FuelType)} required className="md:col-span-1 lg:col-auto">
                {Object.values(FuelType).map(type => <option key={type} value={type}>{formatEnumForDisplay(type)}</option>)}
            </FormSelect>
            </div>
            <div className="mt-5">
                <FormInput id="currentFeaturesInput" label="Car Features" value={currentFeaturesInput} onChange={handleFeaturesInputChange} placeholder="e.g., Air Conditioning, Sunroof, Bluetooth" helpText="Separate features with a comma. They will appear as a list." />
                {features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                    {features.map((feature, idx) => (
                        <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                        {feature}
                        </span>
                    ))}
                    </div>
                )}
            </div>
        </section>

        <section>
            <h2 className="form-section-title">3. Pricing & Location</h2>
            {/* ... Pricing & Location FormInputs as before ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
            <FormInput id="pricePerDay" label="Price per Day (KES)" type="number" value={pricePerDay} onChange={(e:any) => setPricePerDay(e.target.value === '' ? '' : Number(e.target.value))} required min="1" step="any" />
            <FormInput id="pricePerHour" label="Price per Hour (KES)" type="number" value={pricePerHour} onChange={(e:any) => setPricePerHour(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="any"/>
            <FormInput id="location" label="General Location (City/Area)" value={location} onChange={(e:any) => setLocation(e.target.value)} required placeholder="e.g., Nairobi, Westlands" className="md:col-span-2" />
            <FormInput id="latitude" label="Latitude" type="number" value={latitude} onChange={(e:any) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))} step="any" placeholder="e.g., -1.286389 (Optional)" helpText="For precise map location."/>
            <FormInput id="longitude" label="Longitude" type="number" value={longitude} onChange={(e:any) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))} step="any" placeholder="e.g., 36.817223 (Optional)" helpText="For precise map location." />
            </div>
        </section>

        <section>
            <h2 className="form-section-title">4. Car Images</h2>
            <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-gray-700">
                Manage Car Images <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
                Add, remove, or replace images (max 5). First image is the cover.
            </p>
            {carImages.map((img: UploadedImage, index: number) => (
            <div key={index} className="p-4 border border-dashed border-gray-300 rounded-lg">
                <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                    {img.isLoading && <FiLoader className="animate-spin h-8 w-8 text-gray-400" />}
                    {!img.isLoading && (img.previewUrl || img.cloudinaryUrl) && (
                      <Image src={img.previewUrl || img.cloudinaryUrl || "/placeholder-car.svg"} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" width={96} height={96} />
                    )}
                    {!img.isLoading && !img.previewUrl && !img.cloudinaryUrl && <FiImage className="h-10 w-10 text-gray-300" />}
                    </div>
                    <div className="flex-grow">
                    {!img.cloudinaryUrl && !img.isLoading && ( // Show file input only if no image is uploaded or loading for this slot
                        <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleFileSelect(e, index)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                    )}
                    {img.cloudinaryUrl && <p className="text-xs text-green-600 mt-1">Image saved. <button type="button" onClick={() => removeImage(index)} className="text-red-500 hover:underline text-xs">(Replace/Remove)</button></p>}
                    {img.isLoading && <p className="text-xs text-blue-600 mt-1">Uploading...</p>}
                    {img.error && <p className="text-xs text-red-600 mt-1">{img.error} <button type="button" onClick={() => { const temp = [...carImages]; temp[index].error=undefined; temp[index].file=undefined; temp[index].previewUrl=undefined; setCarImages(temp); }} className="text-blue-500 hover:underline text-xs">(Clear & Retry)</button></p>}
                    </div>
                    {/* More robust remove button, always available if there's content or it's not the only empty slot */}
                    {(img.cloudinaryUrl || img.file || carImages.length > 1) && (
                        <button type="button" onClick={() => removeImage(index)} className="btn-icon-danger p-2 rounded-md text-sm self-start" disabled={img.isLoading}>
                            <FiTrash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
                </div>
            ))}
            {carImages.length < 5 && (
                <button type="button" onClick={addImageUploaderSlot} className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center py-2 px-3 rounded-md hover:bg-blue-50 transition-colors">
                <FiPlusCircle className="mr-1 h-4 w-4" /> Add Image Slot
                </button>
            )}
            </div>
        </section>

        <section>
            <h2 className="form-section-title">5. Availability & Status</h2>
            {/* ... Availability & Status FormInputs as before ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
            <FormInput id="availableFrom" label="Available From" type="date" value={availableFrom} onChange={(e:any) => setAvailableFrom(e.target.value)} min={getTodayDateString()} />
            <FormInput id="availableTo" label="Available To" type="date" value={availableTo} onChange={(e:any) => setAvailableTo(e.target.value)} min={getTodayDateString()} />
            </div>
        </section>
          {/* ... Other Sections: Specifications, Pricing & Location, Description, Images, Availability ... */}

          {/* Section: Admin Controls (New for this page) */}
          <section>
            <h2 className="form-section-title">Admin Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mt-4">
              <FormSelect id="ownerId" label="Assign Owner" value={ownerId} onChange={(e:any) => setOwnerId(e.target.value)} required>
                <option value="">Select Owner</option>
                {allPotentialOwners.map(user => (
                  <option key={user.id} value={user.id}>{user.name || user.email} ({user.id.substring(0,8)}...)</option>
                ))}
              </FormSelect>
              <div className="checkbox-group items-center">
                  <input type="checkbox" id="adminIsVerified" name="isVerified" checked={isVerified} onChange={(e) => setIsVerified(e.target.checked)} className="form-checkbox"/>
                  <label htmlFor="adminIsVerified" className="ml-2 text-sm font-medium text-gray-700">Verified by Admin</label>
              </div>
              <div className="checkbox-group items-center">
                  <input type="checkbox" id="adminIsActive" name="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="form-checkbox"/>
                  <label htmlFor="adminIsActive" className="ml-2 text-sm font-medium text-gray-700">Platform Active Status</label>
              </div>
            </div>
            <div className="mt-4 checkbox-group items-center"> {/* isListed can still be here, as admin might override owner's intent */}
                <input type="checkbox" id="adminIsListed" name="isListed" checked={isListed} onChange={(e) => setIsListed(e.target.checked)} className="form-checkbox"/>
                <label htmlFor="adminIsListed" className="ml-2 text-sm font-medium text-gray-700">Is Listed (Visible to Public if Verified & Active)</label>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-200 mt-10">
            <button type="submit" disabled={isSubmittingForm || isLoadingData || !isAuthorized || carImages.some(img => img.isLoading)}
              className="w-full btn-primary-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center group">
              <FiSave className="mr-2 h-5 w-5"/>
              {isSubmittingForm ? 'Saving Changes...' : 'Save Car Details (Admin)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
}
