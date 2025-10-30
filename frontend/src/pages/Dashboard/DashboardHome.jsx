import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardAPI } from '../../services/dashboardAPI';
import { toast } from 'react-toastify';
import GestionFacultades from '../../components/Facultades/GestionFacultades';
import GestionEspecialidades from '../../components/Especialidades/GestionEspecialidades';
import GestionCursos from '../../components/Cursos/GestionCursos';
import GestionUsuarios from '../../components/Usuarios/GestionUsuarios';
import GestionAdministrativos from '../../components/Usuarios/GestionAdministrativos';
import GestionDocentes from '../../components/Usuarios/GestionDocentes';
import PerfilDocente from '../../components/Docente/PerfilDocente';
import MisPostulaciones from '../../components/Docente/MisPostulaciones';
import DocenteDashboard from '../../components/Docente/DocenteDashboard';
import GestionCursosDirector from '../../components/Director/GestionCursos';
import GestionPostulantes from '../../components/Director/GestionPostulantes';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Avatar,
  Chip,
  Card,
  CardContent,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  useMediaQuery,
  Divider,
  LinearProgress,
  createTheme,
  ThemeProvider,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  ListItemButton,
  Grow,
  Container,
  Fade,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  Menu as MenuIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Assessment as ReportsIcon,
  People as PeopleIcon,
  Class as ClassIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as ReviewIcon,
  Star as StarIcon,
  Close as CloseIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  ExpandLess,
  ExpandMore,
  FiberManualRecord as DotIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart as ShowChartIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Tema UMA MODERNO
const umaTheme = createTheme({
  palette: {
    primary: {
      main: '#e50a5e',
      dark: '#810635',
      light: '#ff4081',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#000000',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff'
    },
    text: {
      primary: '#1e293b',
      secondary: '#64748b'
    },
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0'
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h4: { 
      fontWeight: 700,
      fontSize: '2rem'
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem'
    },
    h6: { 
      fontWeight: 600,
      fontSize: '1.25rem'
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
          borderRadius: 12,
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600
        }
      }
    }
  }
});

function DashboardHome() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  // Módulo inicial según el rol del usuario
  const getInitialModule = (rol) => {
    switch (rol) {
      case 'administrador': return 'usuarios-administrativos';
      case 'decano': return 'dashboard';
      case 'director': return 'dashboard';
      case 'docente': return 'dashboard';
      default: return 'dashboard';
    }
  };

  const [selectedModule, setSelectedModule] = useState(getInitialModule(user?.rol));
  const [expandedMenus, setExpandedMenus] = useState({ usuarios: user?.rol === 'administrador' });
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    distribucionPostulaciones: null,
    cursosPopulares: null,
    actividadReciente: null
  });
  const [error, setError] = useState(null);
  const isMobile = useMediaQuery('(max-width:968px)');

  // Actualizar módulo seleccionado cuando cambie el usuario
  useEffect(() => {
    if (user?.rol) {
      const initialModule = getInitialModule(user.rol);
      setSelectedModule(initialModule);
      setExpandedMenus({ usuarios: user.rol === 'administrador' });
    }
  }, [user?.rol]);

  // Cargar datos del dashboard
  useEffect(() => {
    if (selectedModule === 'dashboard') {
      loadDashboardData();
    }
  }, [selectedModule]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Parámetros del usuario para filtrar datos según su rol
      const userParams = {
        rol: user?.rol,
        cod_esp: user?.cod_esp,
        cod_fac: user?.cod_fac
      };

      const [statsResponse, distribucionResponse, cursosResponse, actividadResponse] = await Promise.all([
        dashboardAPI.getStats(userParams),
        dashboardAPI.getPostulacionesDistribucion(userParams),
        dashboardAPI.getCursosPopulares(),
        dashboardAPI.getActividadReciente()
      ]);

      setDashboardData({
        stats: statsResponse.data,
        distribucionPostulaciones: distribucionResponse.data,
        cursosPopulares: cursosResponse.data,
        actividadReciente: actividadResponse.data
      });
    } catch (error) {
      setError('Error al cargar la información del dashboard');
      toast.error('Error al cargar la información del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Manejar expansión de submenús
  const handleToggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Manejar selección de módulo
  const handleSelectModule = (moduleId) => {
    setSelectedModule(moduleId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Módulos del sidebar según rol
  const getModulosPorRol = (rol) => {
    const modulosBase = [
      { 
        id: 'dashboard',
        titulo: 'Dashboard', 
        icono: <DashboardIcon />, 
        descripcion: 'Vista general y estadísticas',
        activo: true
      }
    ];

    const modulosAdmin = [
      ...modulosBase,
      { 
        id: 'facultades',
        titulo: 'Gestión Facultades', 
        icono: <BusinessIcon />, 
        descripcion: 'Administrar facultades'
      },
      { 
        id: 'especialidades',
        titulo: 'Gestión Especialidades', 
        icono: <SchoolIcon />, 
        descripcion: 'Administrar especialidades'
      },
      { 
        id: 'cursos',
        titulo: 'Gestión Cursos', 
        icono: <ClassIcon />, 
        descripcion: 'Administrar cursos'
      },
      { 
        id: 'gestion-postulantes',
        titulo: 'Gestión de Postulantes', 
        icono: <ReviewIcon />, 
        descripcion: 'Evaluar postulaciones'
      },
      { 
        id: 'usuarios',
        titulo: 'Gestión Usuarios', 
        icono: <PeopleIcon />, 
        descripcion: 'Administrar usuarios',
        subMenus: [
          {
            id: 'usuarios-administrativos',
            titulo: 'Administrativos',
            icono: <BusinessIcon />,
            descripcion: 'Admin, Decanos, Directores'
          },
          {
            id: 'usuarios-docentes',
            titulo: 'Docentes',
            icono: <SchoolIcon />,
            descripcion: 'Docentes postulantes'
          }
        ]
      }
    ];

    const modulosDecano = [
      ...modulosBase,
      { 
        id: 'especialidades',
        titulo: 'Mis Especialidades', 
        icono: <SchoolIcon />, 
        descripcion: 'Especialidades de mi facultad'
      },
      { 
        id: 'directores',
        titulo: 'Directores', 
        icono: <PeopleIcon />, 
        descripcion: 'Gestionar directores'
      },
      { 
        id: 'reportes-facultad',
        titulo: 'Reportes Facultad', 
        icono: <ReportsIcon />, 
        descripcion: 'Analytics de mi facultad'
      }
    ];

    const modulosDirector = [
      ...modulosBase,
      { 
        id: 'gestion-cursos',
        titulo: 'Gestión de Cursos', 
        icono: <ClassIcon />, 
        descripcion: 'Habilitar/deshabilitar cursos'
      },
      { 
        id: 'gestion-postulantes',
        titulo: 'Gestión de Postulantes', 
        icono: <AssignmentIcon />, 
        descripcion: 'Evaluar postulaciones'
      }
    ];

    const modulosDocente = [
      ...modulosBase,
      { 
        id: 'perfil',
        titulo: 'Mi Perfil', 
        icono: <PersonIcon />, 
        descripcion: 'Completar información personal'
      },  
      { 
        id: 'mis-postulaciones',
        titulo: 'Mis Postulaciones', 
        icono: <TrendingUpIcon />, 
        descripcion: 'Lista Postulaciones'
      }
    ];

    switch (rol) {
      case 'administrador': return modulosAdmin;
      case 'decano': return modulosDecano;
      case 'director': return modulosDirector;
      default: return modulosDocente;
    }
  };

  const modulos = getModulosPorRol(user?.rol);

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'administrador': return 'error';
      case 'decano': return 'warning';
      case 'director': return 'info';
      case 'docente': return 'success';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'administrador': return 'Administrador';
      case 'decano': return 'Decano';
      case 'director': return 'Director';
      case 'docente': return 'Docente';
      default: return role;
    }
  };

  // Componente Sidebar MODERNO
  const SidebarContent = () => (
    <Box sx={{ 
      width: isMobile ? 280 : 280, 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'white',
      borderRight: '1px solid #e2e8f0'
    }}>
      {/* Logo Header */}
      <Box sx={{ 
        p: 3, 
        background: 'linear-gradient(135deg, #e50a5e 0%, #810635 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
              <SchoolIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                ConvocaDocente
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                Universidad María Auxiliadora
              </Typography>
            </Box>
          </Box>
        </Box>
        {/* Decorative elements */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.1)',
          zIndex: 1
        }} />
      </Box>
      
      {/* Navigation Menu */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List sx={{ px: 2 }}>
          {modulos.map((modulo, index) => (
            <Box key={index}>
              {/* Módulo principal */}
              <ListItemButton
                onClick={() => {
                  if (modulo.subMenus) {
                    handleToggleSubmenu(modulo.id);
                  } else {
                    handleSelectModule(modulo.id);
                  }
                }}
                selected={selectedModule === modulo.id && !modulo.subMenus}
                sx={{
                  borderRadius: 2,
                  mb: 1,
                  py: 1.5,
                  px: 2,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(229, 10, 94, 0.08)',
                    transform: 'translateX(4px)',
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(229, 10, 94, 0.12)',
                    borderLeft: '3px solid #e50a5e',
                    '&:hover': {
                      bgcolor: 'rgba(229, 10, 94, 0.15)',
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: (selectedModule === modulo.id && !modulo.subMenus) || 
                         (modulo.subMenus && (selectedModule === 'usuarios-administrativos' || selectedModule === 'usuarios-docentes')) 
                         ? '#e50a5e' : '#64748b',
                  minWidth: 40
                }}>
                  {modulo.icono}
                </ListItemIcon>
                <ListItemText 
                  primary={modulo.titulo}
                  secondary={modulo.descripcion}
                  primaryTypographyProps={{ 
                    fontWeight: (selectedModule === modulo.id && !modulo.subMenus) || 
                               (modulo.subMenus && (selectedModule === 'usuarios-administrativos' || selectedModule === 'usuarios-docentes'))
                               ? 600 : 500,
                    fontSize: '0.9rem'
                  }}
                  secondaryTypographyProps={{ 
                    fontSize: '0.75rem',
                    color: (selectedModule === modulo.id && !modulo.subMenus) || 
                           (modulo.subMenus && (selectedModule === 'usuarios-administrativos' || selectedModule === 'usuarios-docentes'))
                           ? '#e50a5e' : '#94a3b8'
                  }}
                />
                {modulo.subMenus && (
                  expandedMenus[modulo.id] ? <ExpandLess /> : <ExpandMore />
                )}
              </ListItemButton>

              {/* Submenús */}
              {modulo.subMenus && expandedMenus[modulo.id] && (
                <List sx={{ pl: 2 }}>
                  {modulo.subMenus.map((subModulo, subIndex) => (
                    <ListItemButton
                      key={subIndex}
                      onClick={() => handleSelectModule(subModulo.id)}
                      selected={selectedModule === subModulo.id}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        py: 1,
                        px: 2,
                        pl: 3,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'rgba(229, 10, 94, 0.08)',
                          transform: 'translateX(4px)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(229, 10, 94, 0.12)',
                          borderLeft: '3px solid #e50a5e',
                          '&:hover': {
                            bgcolor: 'rgba(229, 10, 94, 0.15)',
                          }
                        }
                      }}
                    >
                      <ListItemIcon sx={{ 
                        color: selectedModule === subModulo.id ? '#e50a5e' : '#64748b',
                        minWidth: 32
                      }}>
                        <DotIcon sx={{ fontSize: '0.5rem' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={subModulo.titulo}
                        secondary={subModulo.descripcion}
                        primaryTypographyProps={{ 
                          fontWeight: selectedModule === subModulo.id ? 600 : 500,
                          fontSize: '0.85rem'
                        }}
                        secondaryTypographyProps={{ 
                          fontSize: '0.7rem',
                          color: selectedModule === subModulo.id ? '#e50a5e' : '#94a3b8'
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          ))}
        </List>
      </Box>
    </Box>
  );

  // Renderizar contenido según módulo seleccionado
  const renderModuleContent = () => {
    switch (selectedModule) {
      case 'dashboard':
        // Dashboard personalizado para docentes
        if (user?.rol === 'docente') {
          return <DocenteDashboard />;
        }
        
        // Dashboard general para otros roles
        if (loading) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
              <CircularProgress size={60} />
            </Box>
          );
        }

        if (error) {
          return (
            <Box sx={{ width: '100%' }}>
              <Alert 
                severity="error" 
                action={
                  <Button color="inherit" size="small" onClick={loadDashboardData}>
                    <RefreshIcon sx={{ mr: 1 }} />
                    Reintentar
                  </Button>
                }
              >
                {error}
              </Alert>
            </Box>
          );
        }

        return (
          <Box sx={{ width: '100%', maxWidth: '100%' }}>
            {/* Stats Cards - 4 TARJETAS EN FILA COMPLETA CON FLEXBOX */}
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              mb: 4, 
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: { xs: 'wrap', md: 'nowrap' }
            }}>
              <Box sx={{ flex: 1, minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
                <Grow in timeout={300}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #e50a5e 0%, #ff4081 100%)',
                    color: 'white',
                    '&:hover': { transform: 'translateY(-4px)', transition: 'transform 0.3s ease' }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h3" fontWeight="bold">
                            {dashboardData.stats?.totalDocentes || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Docentes Registrados
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            Total en el sistema
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <PeopleIcon sx={{ fontSize: 30 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grow>
              </Box>

              <Box sx={{ flex: 1, minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
                <Grow in timeout={500}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                    color: 'white',
                    '&:hover': { transform: 'translateY(-4px)', transition: 'transform 0.3s ease' }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h3" fontWeight="bold">
                            {dashboardData.stats?.postulacionesPendientes || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Pendientes Revisión
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            Requieren atención
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <ReviewIcon sx={{ fontSize: 30 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grow>
              </Box>

              <Box sx={{ flex: 1, minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
                <Grow in timeout={700}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                    color: 'white',
                    '&:hover': { transform: 'translateY(-4px)', transition: 'transform 0.3s ease' }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h3" fontWeight="bold">
                            {dashboardData.stats?.cursosActivos || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Cursos Activos
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            En reclutamiento
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <ClassIcon sx={{ fontSize: 30 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grow>
              </Box>

              <Box sx={{ flex: 1, minWidth: { xs: 'calc(50% - 12px)', md: 'auto' } }}>
                <Grow in timeout={900}>
                  <Card sx={{ 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
                    color: 'white',
                    '&:hover': { transform: 'translateY(-4px)', transition: 'transform 0.3s ease' }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h3" fontWeight="bold">
                            {dashboardData.stats?.tasaAprobacion || 0}%
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            Tasa Aprobación
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            Evaluaciones completas
                          </Typography>
                        </Box>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                          <TrendingUpIcon sx={{ fontSize: 30 }} />
                        </Avatar>
                      </Box>
                    </CardContent>
                  </Card>
                </Grow>
              </Box>
            </Box>

            {/* Charts and Analytics - UNA SOLA FILA HORIZONTAL */}
            <Box sx={{ 
              display: 'flex', 
              gap: 3, 
              mb: 4,
              width: '100%',
              flexWrap: { xs: 'wrap', lg: 'nowrap' }
            }}>
              {/* Distribución de Postulaciones - 55% ANCHO */}
              <Box sx={{ flex: '0 0 55%', minWidth: { xs: '100%', lg: '55%' } }}>
                <Fade in timeout={1000}>
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <PieChartIcon sx={{ color: '#e50a5e' }} />
                        <Typography variant="h6" fontWeight="bold">
                          Distribución de Postulaciones por Estado
                        </Typography>
                      </Box>
                      
                      <Box sx={{ flex: 1 }}>
                        {dashboardData.distribucionPostulaciones?.length > 0 ? (
                          dashboardData.distribucionPostulaciones.map((item, index) => (
                            <Box key={index} sx={{ mb: 3 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ 
                                    width: 12, 
                                    height: 12, 
                                    borderRadius: '50%', 
                                    bgcolor: item.color 
                                  }} />
                                  <Typography variant="body2" fontWeight="500">
                                    {item.estado}
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {item.cantidad}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.porcentaje}%
                                  </Typography>
                                </Box>
                              </Box>
                              <LinearProgress 
                                variant="determinate" 
                                value={item.porcentaje} 
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  bgcolor: 'rgba(0,0,0,0.06)',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: item.color,
                                    borderRadius: 4
                                  }
                                }} 
                              />
                            </Box>
                          ))
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No hay datos de postulaciones disponibles
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Box>

              {/* Cursos Populares - 45% ANCHO */}
              <Box sx={{ flex: '0 0 45%', minWidth: { xs: '100%', lg: '45%' } }}>
                <Fade in timeout={1200}>
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <BarChartIcon sx={{ color: '#e50a5e' }} />
                        <Typography variant="h6" fontWeight="bold">
                          Cursos Más Populares
                        </Typography>
                      </Box>
                      
                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {dashboardData.cursosPopulares?.length > 0 ? (
                          dashboardData.cursosPopulares.map((curso, index) => (
                            <Box key={index} sx={{ mb: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                              <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                                {curso.curso}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {curso.facultad} • {curso.especialidad}
                              </Typography>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" color="text.secondary">
                                  {curso.nivel}
                                </Typography>
                                <Chip 
                                  label={`${curso.postulaciones} postulaciones`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>
                            </Box>
                          ))
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No hay datos de cursos disponibles
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Box>
            </Box>
          </Box>
        );

      case 'facultades':
        return <GestionFacultades />;

      case 'especialidades':
        return <GestionEspecialidades />;

      case 'cursos':
        return <GestionCursos />;

      case 'usuarios':
        return <GestionUsuarios />;

      case 'usuarios-administrativos':
        return <GestionAdministrativos />;

      case 'usuarios-docentes':
        return <GestionDocentes />;

      case 'perfil':
        return <PerfilDocente />;

      case 'mis-postulaciones':
        return <MisPostulaciones />;

      case 'gestion-cursos':
        return <GestionCursosDirector />;

      case 'gestion-postulantes':
        return <GestionPostulantes />;

      default:
        return (
          <Box sx={{ width: '100%' }}>
            <Card sx={{ p: 4, textAlign: 'center', width: '100%' }}>
              <Typography variant="h5" gutterBottom>
                {modulos.find(m => m.id === selectedModule)?.titulo || 'Módulo'}
              </Typography>
              <Box sx={{ 
                p: 3, 
                bgcolor: '#f8fafc', 
                borderRadius: 2, 
                border: '1px dashed #e2e8f0',
                width: '100%'
              }}>
                <Typography variant="body2" color="text.secondary">
                  Seleccione un módulo disponible para comenzar
                </Typography>
              </Box>
            </Card>
          </Box>
        );
    }
  };

  return (
    <ThemeProvider theme={umaTheme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
        
        {/* Sidebar Desktop */}
        {!isMobile && (
          <Box sx={{ width: 280, flexShrink: 0 }}>
            <SidebarContent />
          </Box>
        )}

        {/* Sidebar Mobile */}
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: { border: 'none' }
          }}
        >
          <SidebarContent />
        </Drawer>

        {/* Main Content Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* TOP HEADER MODERNO */}
          <AppBar 
            position="static" 
            elevation={0}
            sx={{ 
              bgcolor: 'white', 
              color: 'text.primary',
              borderBottom: '1px solid #e2e8f0',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Toolbar sx={{ px: 3, py: 1 }}>
              {/* Mobile Menu Button */}
              {isMobile && (
                <IconButton
                  edge="start"
                  sx={{ mr: 2, color: '#e50a5e' }}
                  onClick={() => setSidebarOpen(true)}
                >
                  <MenuIcon />
                </IconButton>
              )}
              
              {/* Title Area */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <DashboardIcon sx={{ color: '#e50a5e' }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold" color="#1e293b">
                    {modulos.find(m => m.id === selectedModule)?.titulo || 'Dashboard'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
              </Box>
              
              {/* Header Actions - SOLO LO ESENCIAL */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Refresh Button para Dashboard */}
                {selectedModule === 'dashboard' && (
                  <Tooltip title="Actualizar datos">
                    <IconButton onClick={loadDashboardData} disabled={loading}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                )}

                {/* User Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                    <Typography variant="body2" fontWeight="600">
                      {user?.email}
                    </Typography>
                    <Chip 
                      label={getRoleLabel(user?.rol)} 
                      color={getRoleColor(user?.rol)}
                      size="small"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                  
                  <Tooltip title="Cuenta de usuario">
                    <IconButton 
                      onClick={handleUserMenuOpen}
                      sx={{ 
                        p: 0.5,
                        border: '2px solid transparent',
                        '&:hover': { borderColor: '#e50a5e' }
                      }}
                    >
                      <Avatar sx={{ 
                        bgcolor: '#e50a5e', 
                        width: 40, 
                        height: 40,
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}>
                        {user?.email?.charAt(0).toUpperCase()}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                </Box>

                {/* User Dropdown Menu */}
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                  PaperProps={{
                    sx: { mt: 1, minWidth: 200, borderRadius: 2 }
                  }}
                >
                  <MenuItem onClick={handleUserMenuClose}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    Mi Perfil
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    Cerrar Sesión
                  </MenuItem>
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>

          {/* MAIN CONTENT BODY - ANCHO COMPLETO */}
          <Box sx={{ 
            flex: 1, 
            p: 3,
            overflow: 'auto',
            bgcolor: '#f8fafc',
            width: '100%',
            maxWidth: '100%'
          }}>
            <Box sx={{ 
              width: '100%', 
              maxWidth: '100%',
              '& .MuiGrid-root': {
                width: '100%',
                maxWidth: '100%'
              }
            }}>
              {renderModuleContent()}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default DashboardHome;