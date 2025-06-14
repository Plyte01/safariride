import React, { useState, useEffect } from 'react';
import { FiPhone } from 'react-icons/fi';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function PhoneInput({ value, onChange, error, className = '', ...props }: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // Format the display value while keeping the E.164 value
  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      return;
    }

    // Remove any non-digit characters for display formatting
    const digits = value.replace(/\D/g, '');
    
    // Format the display value
    let formatted = '';
    if (digits.length > 0) {
      formatted = '+' + digits;
    }
    
    setDisplayValue(formatted);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Remove any non-digit characters
    const digits = input.replace(/\D/g, '');
    
    // Ensure it starts with a plus sign for E.164
    const formatted = digits.length > 0 ? '+' + digits : '';
    
    // Update the display value
    setDisplayValue(formatted);
    
    // Pass the E.164 formatted value to the parent
    onChange(formatted);
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FiPhone className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="tel"
        value={displayValue}
        onChange={handleChange}
        className={`pl-10 ${error ? 'border-red-500' : ''} ${className}`}
        placeholder="+254712345678"
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
} 