"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { User as PrismaUser, UserRole } from '@prisma/client';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react'; // Assuming you're using lucide-react for icons
import { FiUser, FiMail, FiEdit3, FiSave, FiCamera, FiX, FiShield, FiKey, FiBriefcase, FiCheckCircle, FiAlertTriangle, FiCalendar, FiTrash2 } from 'react-icons/fi'; // Example icons

// Subset of user data for display and editing
type UserProfileData = Pick<
    PrismaUser, 
    'id' | 'name' | 'email' | 'image' | 'role' | 'createdAt' | 'emailVerified' | 'isTrustedOwner'
>;
// _count?: { bookings?: number; cars?: number }; // If API sends counts

const ProfileSection = ({ title, children, actionButton }: { title: string; children: React.ReactNode; actionButton?: React.ReactNode }) => (
    <div className="bg-white shadow-lg rounded-xl p-6 md:p-8 mb-8">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
            {actionButton}
        </div>
        {children}
    </div>
);

const InfoRow = ({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
        <dt className="text-sm font-medium text-gray-500 flex items-center">
            {icon && <span className="mr-2 text-gray-400 w-5 h-5">{icon}</span>}
            {label}
        </dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{value || <span className="italic text-gray-400">Not set</span>}</dd>
    </div>
);


export default function UserProfilePage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession(); // updateSession for NextAuth
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode states
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPasswordState] = useState(''); // Renamed to avoid conflict with API 'newPassword'
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);


  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/profile');
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch('/api/profile/me');
        if (!response.ok) {
          const errData = await response.json().catch(() => ({message: "Failed to load profile."}));
          throw new Error(errData.message);
        }
        const data: UserProfileData = await response.json();
        setUserProfile(data);
        setNewName(data.name || ''); // Initialize edit field
      } catch (err: unknown) { 
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      }
      finally { setIsLoading(false); }
    };
    fetchProfile();
  }, [session, sessionStatus, router]);


  const handleNameSave = async () => {
    if (!newName.trim() || newName.trim() === userProfile?.name) {
        setIsEditingName(false);
        return;
    }
    setIsSavingName(true);
    const toastId = toast.loading("Saving name...");
    try {
        const response = await fetch('/api/profile/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() }),
        });
        const updatedUser = await response.json();
        if (!response.ok) throw new Error(updatedUser.message || "Failed to update name.");
        
        setUserProfile(prev => prev ? { ...prev, name: updatedUser.name } : null);
        await updateSession({ ...session, user: { ...session?.user, name: updatedUser.name } }); // Update NextAuth session
        toast.success("Name updated successfully!", { id: toastId });
        setIsEditingName(false);
    } catch (err: unknown) {
        if (err instanceof Error) {
            toast.error(err.message || "Could not save name.", { id: toastId });
        } else {
            toast.error("Could not save name.", { id: toastId });
        }
    } finally {
        setIsSavingName(false);
    }
  };

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Basic validation (can be more robust)
        if (file.size > 2 * 1024 * 1024) { // Max 2MB
            toast.error("Image too large (max 2MB)."); return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error("Invalid file type. Use JPG, PNG, or WEBP."); return;
        }
        setNewImageFile(file);
        setNewImagePreview(URL.createObjectURL(file));
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordChangeError(null);
    if (newPassword !== confirmNewPassword) {
        setPasswordChangeError("New passwords do not match."); return;
    }
    if (newPassword.length < 8) {
        setPasswordChangeError("New password must be at least 8 characters."); return;
    }
    setIsChangingPassword(true);
    const toastId = toast.loading("Changing password...");
    try {
        const response = await fetch('/api/profile/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to change password.");
        
        toast.success("Password changed successfully!", { id: toastId });
        setShowPasswordModal(false);
        setCurrentPassword(''); setNewPasswordState(''); setConfirmNewPassword('');
    } catch (err: unknown) {
        if (err instanceof Error) {
            setPasswordChangeError(err.message);
            toast.error(err.message || "Could not change password.", { id: toastId });
        } else {
            setPasswordChangeError("An unknown error occurred.");
            toast.error("Could not change password.", { id: toastId });
        }
    } finally {
        setIsChangingPassword(false);
    }
  };

  const handleImageUploadAndSave = async () => {
    if (!newImageFile) return;
    setIsUploadingImage(true);
    const toastId = toast.loading("Uploading profile picture...");
    try {
        // 1. Get Cloudinary signature (same API as car image uploads)
        const sigResponse = await fetch('/api/cloudinary/sign-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: `safariride/avatars/${session?.user?.id}` }),
        });
        if (!sigResponse.ok) throw new Error(await sigResponse.json().then(d=>d.message) || "Failed to get upload signature.");
        const { signature, timestamp, apiKey, cloudName, folder } = await sigResponse.json();

        // 2. Upload to Cloudinary
        const formData = new FormData();
        formData.append('file', newImageFile);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', folder);

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST', body: formData,
        });
        if (!uploadResponse.ok) throw new Error(await uploadResponse.json().then(d=>d.error?.message) || "Cloudinary upload failed.");
        const uploadedImageData = await uploadResponse.json();
        const cloudinaryUrl = uploadedImageData.secure_url;

        // 3. Save Cloudinary URL to user profile via our backend
        const profileUpdateResponse = await fetch('/api/profile/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: cloudinaryUrl }),
        });
        const updatedUser = await profileUpdateResponse.json();
        if (!profileUpdateResponse.ok) throw new Error(updatedUser.message || "Failed to save profile picture.");

        setUserProfile(prev => prev ? { ...prev, image: updatedUser.image } : null);
        await updateSession({ ...session, user: { ...session?.user, image: updatedUser.image } });
        toast.success("Profile picture updated!", { id: toastId });
        setIsEditingImage(false);
        setNewImageFile(null);
        setNewImagePreview(null);

    } catch (err: unknown) {
        if (err instanceof Error) {
            toast.error(err.message || "Failed to upload image.", { id: toastId });
        } else {
            toast.error("Failed to upload image.", { id: toastId });
        }
    } finally {
        setIsUploadingImage(false);
    }
  };
  
  const formatTimestamp = (timestamp: string | Date | null | undefined): string => {
    if (!timestamp) return "";
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading || sessionStatus === 'loading') return <div className="text-center py-20"><Loader2 className="h-12 w-12 mx-auto animate-spin text-blue-600"/> <p className="mt-3">Loading profile...</p></div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;
  if (!userProfile) return <div className="text-center py-20">Could not load user profile.</div>;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-8">My Profile</h1>

      {/* Profile Information Section */}
      <ProfileSection 
        title="Personal Information"
        actionButton={!isEditingName && !isEditingImage && (
            <Button variant="outline" size="sm" onClick={() => {setIsEditingName(true); setNewName(userProfile.name || ''); }}>
                <FiEdit3 className="mr-1.5 h-4 w-4"/> Edit Name
            </Button>
        )}
      >
        <div className="sm:grid sm:grid-cols-3 sm:gap-4 items-center mb-4">
            <dt className="text-sm font-medium text-gray-500">Profile Picture</dt>
            <dd className="mt-1 sm:mt-0 sm:col-span-2">
                <div className="flex items-center space-x-4">
                    <Image
                        src={newImagePreview || userProfile.image || '/default-avatar.png'}
                        alt="Profile"
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-full object-cover bg-gray-200 shadow-md"
                        unoptimized={!!newImagePreview} // Prevents error for blob URLs
                        priority
                    />
                    {!isEditingImage && (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingImage(true)} className="text-blue-600 hover:text-blue-700">
                            <FiCamera className="mr-1.5 h-4 w-4"/> Change Picture
                        </Button>
                    )}
                </div>
                {isEditingImage && (
                    <div className="mt-4 space-y-3 p-4 border rounded-md bg-slate-50">
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileChange} className="input-file text-sm"/>
                        {newImagePreview && (
                            <Image
                                src={newImagePreview}
                                alt="New preview"
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-md object-cover mt-2"
                                unoptimized // For blob URLs, disables Next.js optimization
                                priority
                            />
                        )}
                        <div className="flex space-x-2">
                            <Button size="sm" onClick={handleImageUploadAndSave} disabled={isUploadingImage || !newImageFile} className="btn-primary">
                                {isUploadingImage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Uploading...</> : <><FiSave className="mr-2 h-4 w-4"/> Save Picture</>}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {setIsEditingImage(false); setNewImageFile(null); setNewImagePreview(null);}}>Cancel</Button>
                        </div>
                    </div>
                )}
            </dd>
        </div>

        {isEditingName ? (
            <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 items-center">
                <label htmlFor="newName" className="text-sm font-medium text-gray-500 flex items-center"><FiUser className="mr-2 text-gray-400 w-5 h-5"/>Name</label>
                <div className="mt-1 sm:mt-0 sm:col-span-2 flex items-center space-x-2">
                    <input type="text" id="newName" value={newName} onChange={(e) => setNewName(e.target.value)} className="input-form flex-grow" />
                    <Button size="sm" onClick={handleNameSave} disabled={isSavingName} className="btn-primary">
                        {isSavingName ? <Loader2 className="h-4 w-4 animate-spin"/> : <FiSave className="h-4 w-4"/>}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {setIsEditingName(false); setNewName(userProfile.name || '');}}><FiX className="h-4 w-4"/></Button>
                </div>
            </div>
        ) : (
            <InfoRow label="Name" value={userProfile.name} icon={<FiUser />} />
        )}
        <InfoRow label="Email" value={userProfile.email} icon={<FiMail />} />
        <InfoRow 
            label="Email Verified" 
            value={userProfile.emailVerified ? 
                <span className="text-green-600 flex items-center"><FiCheckCircle className="mr-1.5"/> Verified ({formatTimestamp(userProfile.emailVerified)})</span> : 
                <span className="text-orange-500 flex items-center"><FiAlertTriangle className="mr-1.5"/> Not Verified <button className="ml-2 text-xs text-blue-500 hover:underline">(Resend Link)</button></span>} // TODO: Resend verification link functionality
        />
        <InfoRow label="Role" value={userProfile.role} icon={<FiShield />} />
        {userProfile.role === UserRole.OWNER && (
             <InfoRow label="Trusted Owner" value={userProfile.isTrustedOwner ? <span className="text-green-600 flex items-center"><FiCheckCircle className="mr-1.5"/> Yes</span> : <span className="text-orange-500 flex items-center"><FiAlertTriangle className="mr-1.5"/> No (Verification may take longer)</span>} />
        )}
        <InfoRow label="Joined SafariRide" value={formatTimestamp(userProfile.createdAt)} />
      </ProfileSection>

      {/* Account Activity Summary Sections (Links to other pages) */}
      <ProfileSection title="My Activity">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/my-bookings" className="profile-activity-link bg-blue-50 hover:bg-blue-100 text-blue-700">
                <FiCalendar className="h-6 w-6 mr-3"/> View My Bookings
                {/* <span className="text-xs ml-auto">{userProfile._count?.bookings || 0} Active</span> */}
            </Link>
            {userProfile.role === UserRole.OWNER && (
                <Link href="/owner/dashboard" className="profile-activity-link bg-green-50 hover:bg-green-100 text-green-700">
                    <FiBriefcase className="h-6 w-6 mr-3"/> Manage My Car Listings
                     {/* <span className="text-xs ml-auto">{userProfile._count?.cars || 0} Active</span> */}
                </Link>
            )}
            {/* Add link to My Reviews if you create that page */}
        </div>
      </ProfileSection>
      
      {/* Account Settings Section */}
      <ProfileSection title="Account Settings">
          <div className="space-y-3">
            <button
                onClick={() => setShowPasswordModal(true)}
                className="profile-settings-link w-full text-left">
                <FiKey className="mr-2"/> Change Password
            </button>
            {/* <Link href="/profile/notifications" // TODO: Create this page
                className="profile-settings-link">
                <FiBell className="mr-2"/> Notification Preferences
            </Link> */}
            <button 
                // onClick={handleDeleteAccount} // TODO: Implement delete account functionality
                className="profile-settings-link text-red-600 hover:bg-red-50 w-full text-left"
            >
                <FiTrash2 className="mr-2"/> Delete Account
            </button>
          </div>
      </ProfileSection>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6 pb-3 border-b">
                    <h3 className="text-xl font-semibold text-gray-800">Change Password</h3>
                    <button onClick={() => setShowPasswordModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><FiX className="h-5 w-5"/></button>
                </div>
                
                {passwordChangeError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm"><FiAlertTriangle className="inline mr-2 h-4 w-4"/>{passwordChangeError}</div>}

                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <label htmlFor="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required className="input-form w-full"/>
                    </div>
                    <div>
                        <label htmlFor="newPasswordState">New Password</label>
                        <input type="password" id="newPasswordState" value={newPassword} onChange={e => setNewPasswordState(e.target.value)} required className="input-form w-full" minLength={8}/>
                        <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters.</p>
                    </div>
                    <div>
                        <label htmlFor="confirmNewPassword">Confirm New Password</label>
                        <input type="password" id="confirmNewPassword" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required className="input-form w-full"/>
                    </div>
                    <div className="flex justify-end space-x-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)} disabled={isChangingPassword}>Cancel</Button>
                        <Button type="submit" className="btn-primary" disabled={isChangingPassword}>
                            {isChangingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Change Password"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

// Add to globals.css:
/*
.input-file { @apply block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100; }
.profile-activity-link { @apply flex items-center p-4 rounded-lg font-medium transition-colors; }
.profile-settings-link { @apply flex items-center p-3 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors; }
*/