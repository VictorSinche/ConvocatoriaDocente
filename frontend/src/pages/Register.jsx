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
  LinearProgress,
  createTheme,
  ThemeProvider
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
  CheckCircle,
  School as SchoolIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import { authAPI } from '../services/api';

// Tema personalizado UMA - Igual al Login
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

function Register() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validación de contraseña
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.match(/[a-z]/)) strength += 25;
    if (password.match(/[A-Z]/)) strength += 25;
    if (password.match(/[0-9]/)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

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
      // Validaciones - SOLO TOAST
      if (!formData.email.trim() || !formData.password.trim() || !formData.confirmPassword.trim()) {
        toast.error('Por favor completa todos los campos');
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Formato de email inválido');
        return;
      }

      // Validar longitud de contraseña
      if (formData.password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      // Validar fortaleza de contraseña
      if (passwordStrength < 50) {
        toast.error('Contraseña muy débil. Usa mayúsculas, minúsculas y números');
        return;
      }

      // Validar que las contraseñas coincidan
      if (formData.password !== formData.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }

      // Llamar a la API
      const response = await authAPI.register({
        email: formData.email,
        password: formData.password
      });
      
      if (response.success) {
        toast.success('¡Registro exitoso! Ya puedes iniciar sesión');
        navigate('/login');
      } else {
        // Error del servidor con mensaje específico
        toast.error(response.message || 'Error en el registro');
      }
    } catch (error) {
      
      // MANEJO ESPECÍFICO DE ERRORES
      let errorMessage = 'Error de conexión al servidor';
      
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        switch (status) {
          case 409:
            errorMessage = 'El correo electrónico ya está registrado';
            break;
          case 400:
            errorMessage = serverMessage || 'Datos inválidos';
            break;
          case 500:
            errorMessage = 'Error interno del servidor';
            break;
          default:
            errorMessage = serverMessage || `Error del servidor (${status})`;
        }
      } else if (error.request) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
      } else {
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
            {/* Logo y Título UMA - Registro */}
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
                <PersonIcon sx={{ fontSize: 50, color: '#ffffff' }} />
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
                Registro Docente
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
                Únete a nuestro equipo docente
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
                autoComplete="new-password"
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
                sx={{ mb: 1 }}
              />

              {/* Password Strength */}
              {formData.password && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Seguridad de contraseña:
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color={passwordStrength >= 75 ? 'success.main' : passwordStrength >= 50 ? 'warning.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {passwordStrength >= 75 ? 'Fuerte' : passwordStrength >= 50 ? 'Media' : 'Débil'}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={passwordStrength} 
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      bgcolor: 'rgba(229, 10, 94, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: passwordStrength >= 75 
                          ? 'linear-gradient(90deg, #10b981, #059669)' 
                          : passwordStrength >= 50 
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                          : 'linear-gradient(90deg, #e50a5e, #810635)',
                        borderRadius: 3
                      }
                    }} 
                  />
                </Box>
              )}

              {/* Confirm Password */}
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirmar Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
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
                      {formData.confirmPassword && formData.password === formData.confirmPassword ? (
                        <CheckCircle color="success" />
                      ) : (
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
              />

              {/* Botón de Registro UMA */}
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
                startIcon={loading ? null : <PersonAddIcon />}
              >
                {loading ? 'CREANDO CUENTA...' : 'CREAR CUENTA'}
              </Button>

              {/* Enlaces UMA */}
              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  ¿Ya tienes cuenta?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/login" 
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
                    Inicia sesión aquí
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

export default Register;
