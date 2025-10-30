import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true, // Cambiar a true para verificar sesión al cargar
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        isAuthenticated: true, 
        user: action.payload.user,
        token: action.payload.token
      };
    case 'LOGIN_FAILURE':
      return { ...state, loading: false, isAuthenticated: false, user: null, token: null };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null, token: null, loading: false };
    case 'CHECK_AUTH_COMPLETE':
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verificar sesión guardada al cargar la aplicación
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const savedUser = localStorage.getItem('uma_user');
        const savedToken = localStorage.getItem('uma_token');
        
        if (savedUser && savedToken) {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: {
              user: JSON.parse(savedUser),
              token: savedToken
            }
          });
        } else {
          dispatch({ type: 'CHECK_AUTH_COMPLETE' });
        }
      } catch (error) {
        // Error silencioso en verificación de auth
        dispatch({ type: 'CHECK_AUTH_COMPLETE' });
      }
    };

    checkAuthStatus();
  }, []);

  const login = (userData) => {
    // Guardar en localStorage
    localStorage.setItem('uma_user', JSON.stringify(userData.user));
    localStorage.setItem('uma_token', userData.token);
    
    dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
  };

  const logout = () => {
    // Limpiar localStorage
    localStorage.removeItem('uma_user');
    localStorage.removeItem('uma_token');
    
    dispatch({ type: 'LOGOUT' });
  };

  const value = {
    ...state,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
