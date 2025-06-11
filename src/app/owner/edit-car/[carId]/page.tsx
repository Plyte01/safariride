// src/app/owner/edit-car/[carId]/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { UserRole, CarCategory, TransmissionType, FuelType, Car } from '@prisma/client';
import { FiTrash2, FiPlusCircle, FiImage, FiLoader } from 'react-icons/fi';
import Image from 'next/image';

// Helper to get today's date in YYYY-MM-DD for min attribute of date inputs
const getTodayDateString = () => new Date().toISOString().split('T')[0];
const formatEnumForDisplay = (enumKey: string) => enumKey.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

// Reusable Input/Select Components (assuming they are defined as in your provided code or globally)
interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  children?: React.ReactNode;
  helpText?: string;
  className?: string;
  disabled?: boolean;
}

const FormInput = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = "",
  min,
  max,
  step,
  children,
  helpText,
  className = "",
  disabled = false,
}: FormInputProps) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500">*</span>}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
    />
    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    {children}
  </div>
);
interface FormSelectProps {
  id: string;
  label: string;
  value: string | number | undefined;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children?: React.ReactNode;
  helpText?: string;
  className?: string;
  disabled?: boolean;
}

const FormSelect = ({
  id,
  label,
  value,
  onChange,
  required = false,
  children,
  helpText,
  className = "",
  disabled = false,
}: FormSelectProps) => (
  <div className={`mb-4 ${className}`}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500">*</span>}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
    >
      {children}
    </select>
    {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
  </div>
);

// Interface for client-side image tracking (same as list-your-car)
interface UploadedImage {
  file?: File;
  previewUrl?: string;      // For new local file previews
  cloudinaryUrl?: string;   // URL from Cloudinary (for existing or newly uploaded)
  public_id?: string;       // Cloudinary public_id (for existing or newly uploaded)
  isLoading?: boolean;
  error?: string;
  isExisting?: boolean;     // Flag to distinguish existing images from new ones
}


export default function EditCarPage() {
  interface SessionUser {
    id: string;
    role: UserRole;
    // add other properties as needed
    [key: string]: unknown;
  }
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const carId = params?.carId as string;

  // Form state
  const [title, setTitle] = useState('');
  // ... (all other car field states: make, modelName, year, etc.)
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
  const [isListed, setIsListed] = useState(true);
  const [isActive, setIsActive] = useState(true);


  // --- MODIFIED STATE FOR IMAGES ---
  const [carImages, setCarImages] = useState<UploadedImage[]>([]); // Initialize empty, will be populated

  const [originalCarData, setOriginalCarData] = useState<Car | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);


  useEffect(() => {
    // ... (session and carId checks as before) ...
    if (!carId || sessionStatus === 'loading') { /* ... */ return; }
    if (sessionStatus === 'unauthenticated') { /* ... */ router.push(`/auth/login?callbackUrl=/owner/edit-car/${carId}`); return; }
    
    const fetchAndAuthorizeCarData = async () => {
      try {
        // Fetch car data from your API
        const response = await fetch(`/api/cars/${carId}`);
        if (!response.ok) throw new Error('Failed to fetch car data.');
        const data = await response.json();

        const loggedInUserId = (session!.user as SessionUser).id; // session is checked, so user.id exists
        const userRole = (session!.user as SessionUser).role;
        if (userRole !== UserRole.ADMIN && data.ownerId !== loggedInUserId) {
          setPageError("Access Denied: You are not authorized to edit this car.");
          setIsAuthorized(false); setIsLoadingData(false); return;
        }
        setIsAuthorized(true);
        
        setOriginalCarData(data);
        setTitle(data.title || '');
        setMake(data.make || '');
        setModelName(data.model || '');
        setYear(data.year || '');
        // ... (populate all other form fields from 'data' as in your provided code) ...
        setColor(data.color || '');
        setLicensePlate(data.licensePlate || '');
        setTransmission(data.transmission);
        setFuelType(data.fuelType);
        setSeats(data.seats || '');
        setCategory(data.category);
        setFeatures(data.features || []);
        setCurrentFeaturesInput((data.features || []).join(', '));
        setPricePerHour(data.pricePerHour !== null ? data.pricePerHour : '');
        setPricePerDay(data.pricePerDay !== null ? data.pricePerDay : '');
        setLocation(data.location || '');
        setLatitude(data.latitude !== null ? data.latitude : '');
        setLongitude(data.longitude !== null ? data.longitude : '');
        setDescription(data.description || '');
        setAvailableFrom(data.availableFrom ? new Date(data.availableFrom).toISOString().split('T')[0] : '');
        setAvailableTo(data.availableTo ? new Date(data.availableTo).toISOString().split('T')[0] : '');
        setIsListed(data.isListed);
        setIsActive(data.isActive);

        // --- INITIALIZE carImages state from existing images ---
        if (data.images && data.images.length > 0) {
          const existingImages = data.images.map((imgUrl: string) => {
            // Attempt to extract public_id from Cloudinary URL
            // This is a common pattern but might need adjustment based on your Cloudinary setup / URL structure
            // e.g. https://res.cloudinary.com/<cloud_name>/image/upload/<version>/<folder>/<public_id>.<format>
            const parts = imgUrl.split('/');
            const publicIdWithFormat = parts.pop() || '';
            const publicId = publicIdWithFormat.substring(0, publicIdWithFormat.lastIndexOf('.'));
            const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/'); // Gets "folder/public_id"
            
            return {
              cloudinaryUrl: imgUrl,
              public_id: folderAndPublicId || publicId, // Prioritize folder/public_id if possible
              previewUrl: imgUrl, // Use cloudinaryUrl as preview for existing images
              isExisting: true,
              isLoading: false,
              error: undefined
            };
          });
          setCarImages(existingImages);
        } else {
          setCarImages([{}]); // Start with one empty slot if no existing images
        }

      } catch (err: unknown) { 
        const errorMessage = err instanceof Error ? err.message : String(err);
        setPageError(errorMessage); 
        setIsAuthorized(false); 
      }
      finally { setIsLoadingData(false); }
    };
    if (session && carId) fetchAndAuthorizeCarData();
  }, [carId, session, sessionStatus, router]);


  // Handles changes to the features input, splitting by comma and trimming whitespace
  const handleFeaturesInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setCurrentFeaturesInput(input);
    const featuresArr = input
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);
    setFeatures(featuresArr);
  };
  
  // --- UPDATED Image File Handling and Upload Logic ---
  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation (size, type)
    if (file.size > 5 * 1024 * 1024) { /* ... error handling ... */ return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { /* ... error handling ... */ return; }

    const previewUrl = URL.createObjectURL(file);
    const tempCarImages = [...carImages];
    tempCarImages[index] = { ...tempCarImages[index], file, previewUrl, isLoading: true, error: undefined, isExisting: false };
    setCarImages(tempCarImages);

    try {
      const sigResponse = await fetch('/api/cloudinary/sign-upload', { /* ... get signature ... */ });
      if (!sigResponse.ok) { /* ... error handling ... */ throw new Error("Failed to get signature"); }
      const { signature, timestamp, apiKey, cloudName, folder } = await sigResponse.json();

      const formData = new FormData(); /* ... append file, api_key, etc. ... */
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { /* ... upload ... */ });
      if (!uploadResponse.ok) { /* ... error handling ... */ throw new Error("Cloudinary upload failed"); }
      const uploadedImageData = await uploadResponse.json();

      setCarImages(prevImages => {
          const updated = [...prevImages];
          updated[index] = {
            cloudinaryUrl: uploadedImageData.secure_url,
            public_id: uploadedImageData.public_id,
            previewUrl: uploadedImageData.secure_url, // Update preview to Cloudinary URL
            isExisting: true, // Now it's an existing Cloudinary image
            isLoading: false,
            error: undefined,
          };
          return updated;
      });
    } catch (err: unknown) {
      setCarImages(prevImages => {
          const updated = [...prevImages];
          const errorMessage = err instanceof Error ? err.message : "Upload failed.";
          updated[index] = { ...updated[index], isLoading: false, error: errorMessage };
          return updated;
      });
    }
  };

  const addImageUploaderSlot = () => {
    if (carImages.length < 5) setCarImages([...carImages, { isExisting: false }]);
    else alert("Maximum 5 images allowed.");
  };

  // (Remove this duplicate line)
  const removeImage = async (index: number) => {
    const imageToRemove = carImages[index];

    // If it's an existing Cloudinary image and has a public_id, just remove from UI
    if (imageToRemove.isExisting && imageToRemove.public_id) {
        if (confirm("Are you sure you want to remove this image? This will delete it from Cloudinary upon saving changes.")) {
            setCarImages(prevImages => prevImages.filter((_, i) => i !== index));
            // If this was the last image slot, add an empty one
            if (carImages.filter((_, i) => i !== index).length === 0) {
                setCarImages([{}]);
            }
        }
    } else { // It's a new, unsaved upload slot or a local file not yet uploaded/failed
        if (carImages.length > 1) setCarImages(prevImages => prevImages.filter((_, i) => i !== index));
        else setCarImages([{}]); // Reset to one empty slot
    }
  };
  // Form submission handler
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // ... (authorization check, basic form validation as before) ...
    if (!isAuthorized) { /* ... */ return; }

    const finalImageUrls = carImages
        .map(img => img.cloudinaryUrl)
        .filter((url): url is string => !!url);

    if (finalImageUrls.length === 0) {
      setPageError('Please upload at least one image for the car.');
      setIsSubmittingForm(false);
      return;
    }
    // ... (other validations) ...

    setIsSubmittingForm(true); setPageError(null); setFormSuccess(null);

    const carPayloadToUpdate = {
      title, make, model: modelName, year: Number(year), /* ... all other car fields ... */
      color: color || undefined, licensePlate: licensePlate || undefined,
      transmission, fuelType, seats: Number(seats), category, features,
      pricePerHour: (pricePerHour !== '' && !isNaN(Number(pricePerHour))) ? Number(pricePerHour) : null,
      pricePerDay: Number(pricePerDay),
      location, 
      latitude: (latitude !== '' && !isNaN(Number(latitude))) ? Number(latitude) : null,
      longitude: (longitude !== '' && !isNaN(Number(longitude))) ? Number(longitude) : null,
      description, 
      images: finalImageUrls, // Use the final list of Cloudinary URLs
      availableFrom: availableFrom || null, 
      availableTo: availableTo || null,
      isListed,
      isActive: (session?.user as SessionUser)?.role === UserRole.ADMIN ? isActive : originalCarData?.isActive, // Only admin might change isActive, or retain original
      // Send imagesToDelete if you implement backend deletion
      // imagesToDelete: imagesToDelete, // This needs an API that handles deletion
    };
     Object.keys(carPayloadToUpdate).forEach(key => carPayloadToUpdate[key as keyof typeof carPayloadToUpdate] === undefined && delete carPayloadToUpdate[key as keyof typeof carPayloadToUpdate]);


    try {
      const response = await fetch(`/api/cars/${carId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carPayloadToUpdate),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update car.');
      
      setFormSuccess('Car updated successfully!');
      setOriginalCarData(data); // Update original data with new server data
      setFormSuccess('Car updated successfully!');
      setOriginalCarData(data); // Update original data with new server data

      // Re-initialize carImages state from the newly saved data.images
      if (data.images && data.images.length > 0) {
        const existingImages = data.images.map((imgUrl: string) => {
          const parts = imgUrl.split('/');
          const publicIdWithFormat = parts.pop() || '';
          const publicId = publicIdWithFormat.substring(0, publicIdWithFormat.lastIndexOf('.'));
          const folderAndPublicId = parts.slice(parts.indexOf('upload') + 2).join('/');
          return { cloudinaryUrl: imgUrl, public_id: folderAndPublicId || publicId, previewUrl: imgUrl, isExisting: true };
        });
        setCarImages(existingImages);
      } else {
        setCarImages([{}]);
      }

      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPageError(err.message || 'An unexpected error occurred.');
      } else {
        setPageError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (isLoadingData || sessionStatus === 'loading') { /* ... loading UI ... */ }
  if (isAuthorized === false || (!originalCarData && !isLoadingData)) { /* ... access denied or data load error UI ... */ }

  return (
    <div className="bg-slate-50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* ... Page title, error/success messages ... */}
         <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Edit Car: {originalCarData?.title || "Loading..."}</h1>
            <Link href="/owner/dashboard" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                ← Back to My Listings
            </Link>
        </div>

        {/* Form Error/Success Messages */}
        {pageError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
            {pageError}
          </div>
        )}
        {formSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 text-green-700 rounded">
            {formSuccess}
          </div>
        )}
        {/* ... */}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl space-y-8">
          <section>
            <h2 className="form-section-title">1. Basic Information</h2>
            {/* ... Basic Info FormInputs as before (title, make, model, year, color, licensePlate) ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
              <FormInput id="title" label="Listing Title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} required placeholder="e.g., Reliable Toyota Axio for City Trips" />
              <FormInput id="make" label="Make" value={make} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMake(e.target.value)} required placeholder="e.g., Toyota" />
              <FormInput id="modelName" label="Model" value={modelName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelName(e.target.value)} required placeholder="e.g., Axio" />
              <FormInput id="year" label="Year" type="number" value={year} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setYear(e.target.value === '' ? '' : Number(e.target.value))} required min="1980" max={new Date().getFullYear() + 2} />
              <FormInput id="color" label="Color" value={color} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColor(e.target.value)} placeholder="e.g., Pearl White" />
              <FormInput id="licensePlate" label="License Plate" value={licensePlate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicensePlate(e.target.value)} placeholder="e.g., KDA 123X (Optional)" />
            </div>
          </section>

          <section>
            <h2 className="form-section-title">2. Specifications & Features</h2>
            {/* ... Specifications & Features FormInputs/Selects as before ... */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mt-4">
              <FormInput id="seats" label="Number of Seats" type="number" value={seats} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeats(e.target.value === '' ? '' : Number(e.target.value))} required min="1" />
              <FormSelect id="category" label="Category" value={category} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value as CarCategory)} required>
                {Object.values(CarCategory).map(cat => <option key={cat} value={cat}>{formatEnumForDisplay(cat)}</option>)}
              </FormSelect>
              <FormSelect id="transmission" label="Transmission" value={transmission} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTransmission(e.target.value as TransmissionType)} required>
                {Object.values(TransmissionType).map(type => <option key={type} value={type}>{formatEnumForDisplay(type)}</option>)}
              </FormSelect>
              <FormSelect id="fuelType" label="Fuel Type" value={fuelType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFuelType(e.target.value as FuelType)} required className="md:col-span-1 lg:col-auto">
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
              <FormInput id="pricePerDay" label="Price per Day (KES)" type="number" value={pricePerDay} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPricePerDay(e.target.value === '' ? '' : Number(e.target.value))} required min="1" step="any" />
              <FormInput id="pricePerHour" label="Price per Hour (KES)" type="number" value={pricePerHour} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPricePerHour(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="any"/>
              <FormInput id="location" label="General Location (City/Area)" value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} required placeholder="e.g., Nairobi, Westlands" className="md:col-span-2" />
              <FormInput id="latitude" label="Latitude" type="number" value={latitude} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))} step="any" placeholder="e.g., -1.286389 (Optional)" helpText="For precise map location."/>
              <FormInput id="longitude" label="Longitude" type="number" value={longitude} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))} step="any" placeholder="e.g., 36.817223 (Optional)" helpText="For precise map location." />
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
              {carImages.map((img, index) => (
                <div key={index} className="p-4 border border-dashed border-gray-300 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                      {img.isLoading && <FiLoader className="animate-spin h-8 w-8 text-gray-400" />}
                      {(!img.isLoading && (img.previewUrl || img.cloudinaryUrl)) && (
                        <Image
                          src={img.previewUrl || img.cloudinaryUrl || ""}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          width={96}
                          height={96}
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                          unoptimized={!!img.previewUrl}
                        />
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
              <FormInput id="availableFrom" label="Available From" type="date" value={availableFrom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvailableFrom(e.target.value)} min={getTodayDateString()} />
              <FormInput id="availableTo" label="Available To" type="date" value={availableTo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvailableTo(e.target.value)} min={getTodayDateString()} />
              <FormSelect id="isListed" label="Is Listed?" value={isListed ? 'true' : 'false'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIsListed(e.target.value === 'true')} required>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </FormSelect>
              {session?.user.role === UserRole.ADMIN && (
                <FormSelect id="isActive" label="Is Active?" value={isActive ? 'true' : 'false'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setIsActive(e.target.value === 'true')}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </FormSelect>
              )}
            </div>
          </section>

          {/* ... (Submit Button section as before) ... */}
           <div className="pt-6 border-t border-gray-200 mt-10">
            <button type="submit" disabled={isSubmittingForm || isLoadingData || !isAuthorized || carImages.some(img => img.isLoading)}
              className="w-full btn-primary-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center group">
             {/* ... spinner and text ... */}
              {isSubmittingForm ? 'Saving Changes...' : 'Save Changes to My Car'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
