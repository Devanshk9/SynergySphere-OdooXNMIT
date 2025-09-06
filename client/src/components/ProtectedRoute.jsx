import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // This is a placeholder for your authentication logic.
  // In a real app, you'd check for a valid token, user session, etc.
  const isAuthenticated = false; // Change to true to simulate being logged in

  if (!isAuthenticated) {
    // If not authenticated, redirect to the login page
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
