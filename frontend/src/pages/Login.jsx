import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Link,
  InputAdornment,
  IconButton,
  Fade,
  useMediaQuery,
  createTheme,
  ThemeProvider
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

// Tema personalizado UMA
const umaTheme = createTheme({
  palette: {
    primary: {
      main: '#e50a5e',
      dark: '#810635',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#000000',
      contrastText: '#ffffff'
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280'
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '2.2rem'
    },
    h6: {
      fontWeight: 600
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 600,
          padding: '12px 24px'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '&:hover fieldset': {
              borderColor: '#e50a5e'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#e50a5e'
            }
          }
        }
      }
    }
  }
});

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const isMobile = useMediaQuery('(max-width:600px)');
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // ¡PREVENIR RECARGA DE PÁGINA!
    setLoading(true);

    try {
      // Validaciones básicas - SOLO TOAST
      if (!formData.email.trim() || !formData.password.trim()) {
        toast.error('Por favor completa todos los campos');
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Formato de email inválido');
        return;
      }

      // Llamar a la API
      const response = await authAPI.login(formData);
      
      if (response.success) {
        // Login exitoso
        login(response.data);
        toast.success(`¡Bienvenido ${response.data.user.nombres || response.data.user.email}!`);
        navigate('/dashboard');
      } else {
        // Error del servidor con mensaje específico
        toast.error(response.message || 'Credenciales incorrectas');
      }
    } catch (error) {
      
      // MANEJO ESPECÍFICO DE ERRORES - SOLO TOAST
      let errorMessage = 'Error de conexión al servidor';
      
      if (error.response) {
        // Error de respuesta del servidor
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        switch (status) {
          case 401:
            errorMessage = 'Credenciales incorrectas';
            break;
          case 404:
            errorMessage = 'Correo no registrado en el sistema';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            break;
          default:
            errorMessage = serverMessage || `Error del servidor (${status})`;
        }
      } else if (error.request) {
        // Error de conexión
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      } else {
        // Otro tipo de error
        errorMessage = error.message || 'Error desconocido';
      }
      
      // SOLO TOAST - NO MÁS DUPLICADOS
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={umaTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #e50a5e 0%, #810635 50%, #000000 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2
        }}
      >
        <Container component="main" maxWidth="sm">
          <Fade in timeout={1000}>
            <Paper
              elevation={24}
              sx={{
                padding: isMobile ? 3 : 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(229, 10, 94, 0.2)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(229, 10, 94, 0.2)'
              }}
            >
            {/* Logo y Título UMA */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              {/* Logo Circular con Gradiente UMA */}
              <Box
                sx={{
                  width: 100,
                  height: 100,
                  background: 'linear-gradient(135deg, #e50a5e 0%, #810635 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                  position: 'relative',
                  boxShadow: '0 8px 25px rgba(229, 10, 94, 0.4)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: -2,
                    background: 'linear-gradient(135deg, #e50a5e, #810635, #000000)',
                    borderRadius: '50%',
                    zIndex: -1
                  }
                }}
              >
                <SchoolIcon sx={{ fontSize: 50, color: '#ffffff' }} />
              </Box>
              
              {/* Título Principal */}
              <Typography 
                component="h1" 
                variant="h4" 
                sx={{ 
                  color: '#e50a5e',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  mb: 1
                }}
              >
                ConvocaDocente
              </Typography>
              
              {/* Subtítulo Universidad */}
              <Typography 
                variant="h6" 
                sx={{ 
                  color: '#1f2937',
                  fontWeight: 600,
                  mb: 0.5
                }}
              >
                Universidad María Auxiliadora
              </Typography>
              
              {/* Descripción */}
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}
              >
                Cambia tu Historia
              </Typography>
            </Box>

            {/* Formulario */}
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              {/* SIN ALERT - SOLO TOASTS */}

              {/* Email */}
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Correo Electrónico"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              {/* Password */}
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {/* Botón de Login UMA */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  py: 1.8,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #e50a5e 0%, #810635 100%)',
                  boxShadow: '0 8px 25px rgba(229, 10, 94, 0.4)',
                  border: 'none',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #810635 0%, #000000 100%)',
                    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.4)',
                    transform: 'translateY(-2px)'
                  },
                  '&:active': {
                    transform: 'translateY(0px)'
                  },
                  '&:disabled': {
                    background: 'linear-gradient(135deg, #cccccc 0%, #999999 100%)',
                    boxShadow: 'none'
                  }
                }}
                disabled={loading}
                startIcon={loading ? null : <LoginIcon />}
              >
                {loading ? 'INICIANDO SESIÓN...' : 'INICIAR SESIÓN'}
              </Button>

              {/* Enlaces UMA */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  ¿No tienes cuenta?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/register" 
                    sx={{ 
                      color: '#e50a5e',
                      textDecoration: 'none',
                      fontWeight: 700,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        color: '#810635',
                        textDecoration: 'underline',
                        textShadow: '0 1px 2px rgba(229, 10, 94, 0.3)'
                      }
                    }}
                  >
                    Regístrate aquí
                  </Link>
                </Typography>
                
                {/* Línea decorativa */}
                <Box
                  sx={{
                    width: 60,
                    height: 3,
                    background: 'linear-gradient(90deg, #e50a5e, #810635)',
                    margin: '16px auto 0',
                    borderRadius: 2
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Fade>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Login;
