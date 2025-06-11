"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlatformSetting, UserRole } from '@prisma/client';

// Helper to group settings
const groupSettings = (settings: PlatformSetting[]) => {
  return settings.reduce((acc, setting) => {
    const groupKey = setting.group || 'Other';
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(setting);
    return acc;
  }, {} as Record<string, PlatformSetting[]>);
};


export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  // Store changes in a separate object to track what's modified
  const [changedSettings, setChangedSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login?callbackUrl=/admin/settings');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((session.user as any).role !== UserRole.ADMIN) {
      router.push('/?error=admin_only');
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/admin/settings');
        if (!response.ok) {
          throw new Error('Failed to fetch platform settings.');
        }
        const data: PlatformSetting[] = await response.json();
        setSettings(data);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [session, status, router]);

  const handleSettingChange = (key: string, value: string | boolean) => {
    // For boolean, convert to string 'true'/'false' as DB stores string
    const stringValue = typeof value === 'boolean' ? String(value) : value;
    setChangedSettings(prev => ({ ...prev, [key]: stringValue }));

    // Also update the display value immediately for better UX
    setSettings(prevSettings => prevSettings.map(s =>
        s.key === key ? { ...s, value: stringValue } : s
    ));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Object.keys(changedSettings).length === 0) {
        setSuccess("No changes to save.");
        setTimeout(() => setSuccess(null), 3000);
        return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    const payload = Object.entries(changedSettings).map(([key, value]) => ({ key, value }));

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: "Failed to save settings"}));
        throw new Error(errorData.message);
      }
      const updatedSettingsData: PlatformSetting[] = await response.json();
      setSettings(updatedSettingsData); // Refresh with data from server
      setChangedSettings({}); // Clear changed settings
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderSettingInput = (setting: PlatformSetting) => {
    const currentValue = setting.value; // Use value from settings state for display

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue === 'true'}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="text-gray-700">{currentValue === 'true' ? 'Enabled' : 'Disabled'}</span>
          </label>
        );
      case 'number':
      case 'percentage':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            min={setting.type === 'percentage' ? 0 : undefined}
            max={setting.type === 'percentage' ? 100 : undefined}
            step={setting.type === 'percentage' ? 0.1 : 1}
          />
        );
      case 'string':
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        );
    }
  };


  if (status === 'loading' || isLoading) {
    return <div className="text-center py-10">Loading settings...</div>;
  }
  // ... (Access denied logic as in other admin pages) ...


  const groupedSettings = groupSettings(settings);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Platform Settings</h1>
        {/* Could add links to other admin sections here */}
        <div className="space-x-2">
            <Link href="/admin/dashboard" className="text-sm text-blue-600 hover:underline">Car Management</Link>
            <Link href="/admin/manage-users" className="text-sm text-blue-600 hover:underline">User Management</Link>
        </div>
      </div>

      {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">Error: {error}</p>}
      {success && <p className="text-green-700 bg-green-100 p-3 rounded mb-4">{success}</p>}

      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        {Object.entries(groupedSettings).map(([groupName, settingsInGroup]) => (
            <div key={groupName} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-2">{groupName} Settings</h2>
                <div className="space-y-6">
                    {settingsInGroup.map((setting) => (
                    <div key={setting.key}>
                        <label htmlFor={setting.key} className="block text-sm font-medium text-gray-700">
                        {setting.label || setting.key}
                        </label>
                        {renderSettingInput(setting)}
                    </div>
                    ))}
                </div>
            </div>
        ))}

        <div className="mt-8 pt-5 border-t border-gray-200">
          <button
            type="submit"
            disabled={isSaving || Object.keys(changedSettings).length === 0}
            className="w-full md:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}