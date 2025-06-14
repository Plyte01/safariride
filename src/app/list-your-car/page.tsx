// src/app/list-your-car/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole, CarCategory, TransmissionType, FuelType } from '@prisma/client';
// To use react-icons, first install it: npm install react-icons
import { FiTrash2, FiPlusCircle, FiAlertTriangle, FiCheckCircle, FiImage } from 'react-icons/fi'; 
import Image from 'next/image';

// Helper to get today's date in YYYY-MM-DD for min attribute of date inputs
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// Helper to format enum keys for display
const formatEnumForDisplay = (enumKey: string) => 
    enumKey.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

// Reusable Input Component
interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  required?: boolean;
  placeholder?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  children?: React.ReactNode;
  helpText?: string;
  className?: string;
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
}: FormInputProps) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children ? children : (
      <input
        type={type}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className="input-form w-full"
      />
    )}
    {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
  </div>
);

// Reusable Select Component
interface FormSelectProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean;
  children?: React.ReactNode;
  helpText?: string;
  className?: string;
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
}: FormSelectProps) => (
  <div className={className}>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select id={id} name={id} value={value} onChange={onChange} required={required} className="select-form w-full">
      {children}
    </select>
    {helpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
  </div>
);

// Interface for uploaded image data (client-side tracking)
interface UploadedImage {
  file?: File; // The actual file object for new uploads
  previewUrl?: string; // For client-side preview
  cloudinaryUrl?: string; // URL from Cloudinary after successful upload
  public_id?: string; // Cloudinary public_id for potential future management (e.g. deletion)
  isLoading?: boolean;
  error?: string;
}


export default function ListYourCarPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [make, setMake] = useState('');
  const [modelName, setModelName] = useState('');
  const [year, setYear] = useState<number | ''>(new Date().getFullYear());
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [transmission, setTransmission] = useState<TransmissionType>(TransmissionType.AUTOMATIC);
  const [fuelType, setFuelType] = useState<FuelType>(FuelType.PETROL);
  const [seats, setSeats] = useState<number | ''>(4);
  const [category, setCategory] = useState<CarCategory>(CarCategory.SEDAN);
  const [currentFeaturesInput, setCurrentFeaturesInput] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [pricePerHour, setPricePerHour] = useState<number | ''>('');
  const [pricePerDay, setPricePerDay] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  
  // --- MODIFIED STATE FOR IMAGES ---
  const [carImages, setCarImages] = useState<UploadedImage[]>([{}]); // Start with one empty slot

  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [isListed, setIsListed] = useState(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false); // Renamed for clarity


  // Authorization check
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/list-your-car');
      return;
    }
    interface SessionUser {
      id?: string;
      name?: string;
      email?: string;
      image?: string;
      role?: UserRole;
    }
    const userRole = (session.user as SessionUser).role;
    if (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN) {
      setFormError("Access Denied: You must be a Car Owner or Admin to list a car.");
    }
  }, [session, sessionStatus, router]);

  // Handle feature input
  const handleFeaturesInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const inputText = e.target.value;
    setCurrentFeaturesInput(inputText);
    setFeatures(inputText.split(',').map(feature => feature.trim()).filter(f => f));
  };

  // --- NEW: Image File Handling and Upload Logic ---
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

  const addImageUploader = () => {
    if (carImages.length < 5) { // Example: Limit to 5 images
        setCarImages(prevImages => [...prevImages, {}]);
    } else {
        setFormError("You can upload a maximum of 5 images."); // Use formError for this kind of message
        setTimeout(() => setFormError(null), 3000);
    }
  };

  const removeImageUploader = async (index: number) => { // Make it async
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

    // Remove from client-side state (or reset if it's the last one)
    if (carImages.length > 1) {
      setCarImages(prevImages => prevImages.filter((_, i) => i !== index));
    } else {
      setCarImages([{}]); // Reset to one empty uploader
    }
  };

  // Form submission handler
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    // Client-side validation
    if (!title || !make || !modelName || !year || !pricePerDay || !location || !category ) {
      setFormError('Please fill in all required fields (*).');
      return;
    }
    const uploadedImageUrls = carImages
        .map(img => img.cloudinaryUrl)
        .filter((url): url is string => typeof url === 'string' && url.trim() !== '');

    if (uploadedImageUrls.length === 0) {
      setFormError('Please upload at least one valid image for the car.');
      return;
    }
    if (carImages.some(img => img.isLoading)) {
        setFormError('Some images are still uploading. Please wait.');
        return;
    }
    const uploadErrors = carImages.filter(img => img.file && !img.cloudinaryUrl && img.error);
    if (uploadErrors.length > 0) {
        setFormError(`Image upload failed for slot(s): ${uploadErrors.map((_,idx) => carImages.findIndex(ci => ci === uploadErrors[idx])+1).join(', ')}. Please remove and re-upload them or fix the issue.`);
        return;
    }
    if (availableFrom && availableTo && new Date(availableFrom) >= new Date(availableTo)) {
        setFormError('"Available To" date must be after "Available From" date.');
        return;
    }

    setIsSubmittingForm(true);

    const carPayload = { 
      title, make, model: modelName, year: Number(year), color: color || undefined, licensePlate: licensePlate || undefined,
      transmission, fuelType, seats: Number(seats), category, features,
      pricePerHour: (pricePerHour !== '' && !isNaN(Number(pricePerHour))) ? Number(pricePerHour) : undefined,
      pricePerDay: Number(pricePerDay),
      location, 
      latitude: (latitude !== '' && !isNaN(Number(latitude))) ? Number(latitude) : undefined,
      longitude: (longitude !== '' && !isNaN(Number(longitude))) ? Number(longitude) : undefined,
      description, 
      images: uploadedImageUrls, // Send Cloudinary URLs
      availableFrom: availableFrom || undefined, 
      availableTo: availableTo || undefined,
      isListed
    };

    try {
      const response = await fetch('/api/cars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carPayload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to list car.');
      setFormSuccess('Car listed successfully! Redirecting to your dashboard...');
      
      // Reset form fields
      setTitle(''); setMake(''); setModelName(''); setYear(new Date().getFullYear()); setColor('');
      setLicensePlate(''); setTransmission(TransmissionType.AUTOMATIC); setFuelType(FuelType.PETROL);
      setSeats(4); setCategory(CarCategory.SEDAN); setCurrentFeaturesInput(''); setFeatures([]);
      setPricePerHour(''); setPricePerDay(''); setLocation(''); setLatitude(''); setLongitude('');
      setDescription(''); setCarImages([{}]); setAvailableFrom(''); setAvailableTo(''); setIsListed(true);
      
      setTimeout(() => router.push('/owner/dashboard'), 2500);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message || 'An unexpected error occurred.');
      } else {
        setFormError('An unexpected error occurred.');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  if (sessionStatus === 'loading') {
    return <div className="flex justify-center items-center min-h-screen"><p className="text-xl">Loading session...</p></div>;
  }
  interface SessionUser {
    id?: string;
    name?: string;
    email?: string;
    image?: string;
    role?: UserRole;
  }
  const userRole = session ? (session.user as SessionUser).role : null;
  if (formError && !isSubmittingForm && (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN)) { // Check if error is auth error
    return (
        <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="text-3xl font-bold mb-6">List Your Car</h1>
            <p className="text-red-600 bg-red-50 border border-red-300 p-4 rounded-md text-sm flex items-center justify-center">
                <FiAlertTriangle className="h-5 w-5 mr-2" /> {formError}
            </p>
            <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline">
                Go to Homepage
            </Link>
        </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">List Your Car on SafariRide</h1>
          <p className="text-gray-600 mt-2">Share your vehicle and start earning today! Fields marked with <span className="text-red-500">*</span> are required.</p>
        </div>

        {formError && !formSuccess && (
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm flex items-center">
            <FiAlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" /> 
            <div><span className="font-medium">Oops! Something went wrong.</span><br/>{formError}</div>
          </div>
        )}
        {formSuccess && (
          <div role="alert" className="mb-6 p-4 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm flex items-center">
            <FiCheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <div><span className="font-medium">Success!</span><br/>{formSuccess}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl space-y-8">
          <section>
            <h2 className="form-section-title">1. Basic Information</h2>
            {/* ... Basic Info FormInputs as before (title, make, model, year, color, licensePlate) ... */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
              <FormInput id="title" label="Listing Title" value={title} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setTitle(e.target.value)} required placeholder="e.g., Reliable Toyota Axio for City Trips" />
              <FormInput id="make" label="Make" value={make} onChange={e => setMake(e.target.value)} required placeholder="e.g., Toyota" />
              <FormInput id="modelName" label="Model" value={modelName} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setModelName(e.target.value)} required placeholder="e.g., Axio" />
              <FormInput id="year" label="Year" type="number" value={year} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setYear(e.target.value === '' ? '' : Number(e.target.value))} required min="1980" max={new Date().getFullYear() + 2} />
              <FormInput id="color" label="Color" value={color} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setColor(e.target.value)} placeholder="e.g., Pearl White" />
              <FormInput id="licensePlate" label="License Plate" value={licensePlate} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLicensePlate(e.target.value)} placeholder="e.g., KDA 123X (Optional)" />
            </div>
          </section>

          <section>
            <h2 className="form-section-title">2. Specifications & Features</h2>
            {/* ... Specifications & Features FormInputs/Selects as before ... */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mt-4">
              <FormInput id="seats" label="Number of Seats" type="number" value={seats} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSeats(e.target.value === '' ? '' : Number(e.target.value))} required min="1" />
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
              <FormInput id="pricePerDay" label="Price per Day (KES)" type="number" value={pricePerDay} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPricePerDay(e.target.value === '' ? '' : Number(e.target.value))} required min="1" step="any" />
              <FormInput id="pricePerHour" label="Price per Hour (KES)" type="number" value={pricePerHour} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setPricePerHour(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="any"/>
              <FormInput id="location" label="General Location (City/Area)" value={location} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLocation(e.target.value)} required placeholder="e.g., Nairobi, Westlands" className="md:col-span-2" />
              <FormInput id="latitude" label="Latitude" type="number" value={latitude} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLatitude(e.target.value === '' ? '' : Number(e.target.value))} step="any" placeholder="e.g., -1.286389 (Optional)" helpText="For precise map location."/>
              <FormInput id="longitude" label="Longitude" type="number" value={longitude} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLongitude(e.target.value === '' ? '' : Number(e.target.value))} step="any" placeholder="e.g., 36.817223 (Optional)" helpText="For precise map location." />
            </div>
          </section>

          {/* --- MODIFIED: Image Upload Section --- */}
          <section>
            <h2 className="form-section-title">4. Description & Images</h2>
            <div className="mt-4 space-y-6"> {/* Increased spacing for better separation */}
              
              {/* Description Input */}
              <FormInput 
                id="description" 
                label="Detailed Description" 
                value={description} 
                onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDescription(e.target.value)} // Make sure FormInput passes onChange to textarea
                required 
                helpText="Highlight what makes your car special. Share details about its condition, unique features, and suitability for different trips. Minimum 50 characters recommended."
              >
                <textarea 
                  id="description" 
                  name="description" // Good practice to include name attribute
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  rows={6} // Increased rows for more space
                  className="input-form w-full" // Use your consistent input styling
                  placeholder="Example: This well-maintained 2020 SUV is perfect for family adventures or comfortable city driving. Features include panoramic sunroof, leather seats, and advanced safety systems. Regularly serviced and cleaned..."
                />
              </FormInput>

              {/* Image Uploads */}
              <div className="mt-4 space-y-4">
              <div className="block text-sm font-medium text-gray-700">
                Upload Car Images <span className="text-red-500">*</span>
                <p className="text-xs text-gray-500 mt-1">
                  Add up to 5 high-quality images (JPG, PNG, WEBP, GIF, max 5MB each). First image is the cover.
                </p>
              </div>
              {carImages.map((img, index) => (
                <div key={index} className="p-4 border border-dashed border-gray-300 rounded-lg space-y-3">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border">
                      {img.isLoading && (
                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {!img.isLoading && img.previewUrl && (
                        <Image
                          src={img.previewUrl}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                          width={96}
                          height={96}
                          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                        />
                      )}
                      {!img.isLoading && !img.previewUrl && (
                        <FiImage className="h-10 w-10 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleFileSelect(e, index)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 cursor-pointer"
                        disabled={img.isLoading || !!img.cloudinaryUrl}
                        id={`file-upload-${index}`}
                      />
                      <label htmlFor={`file-upload-${index}`} className="sr-only">Choose image {index+1}</label>
                      {img.cloudinaryUrl && !img.error && <p className="text-xs text-green-600 mt-1 flex items-center"><FiCheckCircle className="mr-1"/>Uploaded successfully!</p>}
                    </div>
                    {(carImages.length > 1 || (carImages.length === 1 && (img.file || img.cloudinaryUrl))) && ( // Show remove if more than one, or if the single one has content/file
                      <button type="button" onClick={() => removeImageUploader(index)} className="btn-icon-danger p-2 rounded-md text-sm" disabled={img.isLoading}>
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {img.error && <p className="text-xs text-red-600 mt-1 pl-28 flex items-center"><FiAlertTriangle className="mr-1"/>{img.error}</p>}
                </div>
              ))}
              {carImages.length < 5 && (
                <button type="button" onClick={addImageUploader} className="text-sm text-blue-600 hover:text-blue-700 flex items-center py-2 px-3 rounded-md hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <FiPlusCircle className="mr-1.5 h-4 w-4" /> Add Another Image Slot
                </button>
              )}
            </div>
            </div>
          </section>
          
          <section>
            <h2 className="form-section-title">5. Availability & Listing Status</h2>
            {/* ... Availability & Listing Status FormInputs/Checkbox as before ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-4">
              <FormInput id="availableFrom" label="Available From" type="date" value={availableFrom} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAvailableFrom(e.target.value)} min={getTodayDateString()} helpText="Optional: Set a start date for your car's general availability." />
              <FormInput id="availableTo" label="Available To" type="date" value={availableTo} onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAvailableTo(e.target.value)} min={availableFrom || getTodayDateString()} helpText="Optional: Set an end date if availability is limited." />
            </div>
            <div className="mt-6 flex items-start space-x-3 bg-slate-100 p-4 rounded-lg border border-slate-200">
                <div className="flex-shrink-0 pt-0.5">
                <input id="isListed" name="isListed" type="checkbox" checked={isListed} onChange={(e) => setIsListed(e.target.checked)} className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"/>
            </div>
            <div>
                <label htmlFor="isListed" className="font-medium text-gray-800 cursor-pointer">Publish Listing Immediately</label>
                <p className="text-gray-500 text-xs">If checked, your car will be live once submitted (and verified if applicable). Uncheck to save as a draft.</p>
            </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-200 mt-10">
            <button type="submit" disabled={isSubmittingForm || carImages.some(img => img.isLoading) || !!(formError && (userRole !== UserRole.OWNER && userRole !== UserRole.ADMIN))}
              className="w-full btn-primary-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center group">
              {/* ... Spinner and text for submitting state ... */}
              {isSubmittingForm ? 'Submitting Your Car...' : 'List My Car & Start Earning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add/update these styles in your globals.css (ensure they are there):
