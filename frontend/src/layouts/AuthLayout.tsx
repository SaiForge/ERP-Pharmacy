import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
