import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  LinearProgress,
  Stack,
  Button,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const MisPostulaciones = () => {
  const { user } = useAuth();
  const [postulaciones, setPostulaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarPostulaciones();
  }, []);

  const cargarPostulaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/postulacion.php?action=postulaciones&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPostulaciones(data.data || []);
      } else {
        setError(data.message || 'Error al cargar postulaciones');
      }
    } catch (error) {
      console.error('Error al cargar postulaciones:', error);
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'warning';
      case 'EVALUANDO':
        return 'info';
      case 'APROBADO':
        return 'success';
      case 'RECHAZADO':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return <ScheduleIcon />;
      case 'EVALUANDO':
        return <WarningIcon />;
      case 'APROBADO':
        return <CheckCircleIcon />;
      case 'RECHAZADO':
        return <CancelIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const getEstadoDescripcion = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'Su postulación está en espera de revisión por el director de la especialidad';
      case 'EVALUANDO':
        return 'Su postulación está siendo evaluada por el director de la especialidad';
      case 'APROBADO':
        return 'Su postulación ha sido aprobada. Será contactado para la siguiente fase';
      case 'RECHAZADO':
        return 'Su postulación no fue aprobada en esta ocasión';
      default:
        return 'Estado desconocido';
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'No disponible';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Cargando sus postulaciones...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button 
          variant="outlined" 
          onClick={cargarPostulaciones}
          startIcon={<RefreshIcon />}
        >
          Reintentar
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', mb: 1 }}>
            Mis Postulaciones
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Estado de sus postulaciones a especialidades docentes
          </Typography>
        </Box>
        <Tooltip title="Actualizar postulaciones">
          <IconButton onClick={cargarPostulaciones} sx={{ color: '#a855f7' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>


      {/* Lista de postulaciones */}
      {postulaciones.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <AssignmentIcon sx={{ fontSize: 64, color: '#9ca3af', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No tiene postulaciones registradas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Complete su perfil docente para postularse a especialidades
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {postulaciones.map((postulacion) => (
            <Grid item xs={12} md={6} key={postulacion.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: `2px solid ${
                    postulacion.estado === 'APROBADO' ? '#10b981' :
                    postulacion.estado === 'RECHAZADO' ? '#ef4444' :
                    postulacion.estado === 'EVALUANDO' ? '#3b82f6' : '#f59e0b'
                  }`,
                  '&:hover': {
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease'
                  }
                }}
              >
                <CardContent>
                  {/* Header de la postulación */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getEstadoIcon(postulacion.estado)}
                      <Typography variant="h6" fontWeight="bold">
                        Postulación #{postulacion.id}
                      </Typography>
                    </Box>
                    <Chip 
                      label={postulacion.estado}
                      color={getEstadoColor(postulacion.estado)}
                      variant="filled"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>

                  <Divider sx={{ mb: 2 }} />

                  {/* Información de la especialidad */}
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Facultad
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {postulacion.nombre_facultad}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SchoolIcon sx={{ color: '#6b7280', fontSize: 20 }} />
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Especialidad
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          {postulacion.nombre_especialidad}
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Fecha de Postulación
                      </Typography>
                      <Typography variant="body2">
                        {formatearFecha(postulacion.fecha_postulacion)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Estado
                      </Typography>
                      <Typography variant="body2">
                        {getEstadoDescripcion(postulacion.estado)}
                      </Typography>
                    </Box>

                    {/* Mensaje de entrevista si existe */}
                    {postulacion.mensaje_entrevista && postulacion.estado === 'APROBADO' && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Mensaje del Director:
                        </Typography>
                        <Typography variant="body2">
                          {postulacion.mensaje_entrevista}
                        </Typography>
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Información adicional */}
      {postulaciones.length > 0 && (
        <Alert severity="info" sx={{ mt: 4 }}>
          <Typography variant="body2">
            <strong>Información importante:</strong> Las postulaciones son evaluadas por los directores de cada especialidad. 
            El tiempo de evaluación puede variar según la especialidad. Manténgase atento a las actualizaciones.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default MisPostulaciones;