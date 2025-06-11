// src/components/buttons/CustomButton.tsx
import React from 'react';

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  handleClick?: () => void;
  // Add any other specific props your button might need
}

const CustomButton: React.FC<CustomButtonProps> = ({ children, className, handleClick, ...props }) => {
  return (
    <button
      className={`font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export default CustomButton;