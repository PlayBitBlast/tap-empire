import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Authentication context
 */
const AuthContext = createContext(null);

/**
 * Authentication provider component
 */
export const AuthProvider = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;