import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  School as SchoolIcon,
  Work as WorkIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const DocenteDashboard = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [datosDocente, setDatosDocente] = useState({
    formacionAcademica: [],
    experienciaLaboral: [],
    postulaciones: []
  });

  const [estadisticas, setEstadisticas] = useState({
    postulacionesPendientes: 0,
    postulacionesEvaluando: 0,
    postulacionesAprobadas: 0,
    postulacionesRechazadas: 0
  });

  useEffect(() => {
    cargarDatos();
  }, [user]);

  // Calcular estadísticas cuando cambien los datos
  useEffect(() => {
    calcularEstadisticas();
  }, [datosDocente.postulaciones]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      await Promise.all([
        cargarFormacionAcademica(),
        cargarExperienciaLaboral(),
        cargarPostulaciones()
      ]);
    } catch (error) {
      // Manejo silencioso de errores
    } finally {
      setLoading(false);
    }
  };

  const cargarFormacionAcademica = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/formacion.php?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setDatosDocente(prev => ({
          ...prev,
          formacionAcademica: data.data
        }));
      }
    } catch (error) {
      // Error silencioso
    }
  };

  const cargarPostulaciones = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/postulacion.php?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setDatosDocente(prev => ({
          ...prev,
          postulaciones: data.data
        }));
      }
    } catch (error) {
      // Manejo de errores
    }
  };

  const cargarExperienciaLaboral = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/experiencia.php?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setDatosDocente(prev => ({
          ...prev,
          experienciaLaboral: data.data
        }));
      }
    } catch (error) {
      // Manejo de errores
    }
  };

  const calcularEstadisticas = () => {
    const { postulaciones } = datosDocente;
    
    const postulacionesPendientes = postulaciones.filter(p => p.estado === 'PENDIENTE').length;
    const postulacionesEvaluando = postulaciones.filter(p => p.estado === 'EVALUANDO').length;
    const postulacionesAprobadas = postulaciones.filter(p => p.estado === 'APROBADO').length;
    const postulacionesRechazadas = postulaciones.filter(p => p.estado === 'RECHAZADO').length;

    setEstadisticas({
      postulacionesPendientes,
      postulacionesEvaluando,
      postulacionesAprobadas,
      postulacionesRechazadas
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} sx={{ color: '#a855f7' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 1) CARDS PRINCIPALES */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 🎓 Formaciones Académicas */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  🎓 Formaciones Académicas
                </Typography>
                <SchoolIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {datosDocente.formacionAcademica?.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Títulos registrados
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 💼 Experiencias Laborales */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  💼 Experiencias Laborales
                </Typography>
                <WorkIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {datosDocente.experienciaLaboral?.length || 0}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Experiencias registradas
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 🧾 Postulaciones Activas */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  🧾 Postulaciones Activas
                </Typography>
                <SendIcon sx={{ fontSize: 40, opacity: 0.8 }} />
              </Box>
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {estadisticas.postulacionesPendientes + estadisticas.postulacionesEvaluando}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                En proceso de evaluación
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2) GRÁFICO DE BARRAS: ESTADO DE POSTULACIONES */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                📊 Estado de Postulaciones
              </Typography>
              
              <Grid container spacing={3}>
                {/* Pendientes */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#f59e0b">
                      {estadisticas.postulacionesPendientes}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pendientes
                    </Typography>
                    <Box sx={{ 
                      height: 120, 
                      display: 'flex', 
                      alignItems: 'end', 
                      justifyContent: 'center',
                      mt: 1
                    }}>
                      <Box sx={{ 
                        width: 40,
                        height: estadisticas.postulacionesPendientes > 0 ? `${(estadisticas.postulacionesPendientes * 30) + 20}px` : '10px',
                        bgcolor: '#f59e0b',
                        borderRadius: 1,
                        minHeight: 10
                      }} />
                    </Box>
                  </Box>
                </Grid>

                {/* En Evaluación */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#3b82f6">
                      {estadisticas.postulacionesEvaluando}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      En Evaluación
                    </Typography>
                    <Box sx={{ 
                      height: 120, 
                      display: 'flex', 
                      alignItems: 'end', 
                      justifyContent: 'center',
                      mt: 1
                    }}>
                      <Box sx={{ 
                        width: 40,
                        height: estadisticas.postulacionesEvaluando > 0 ? `${(estadisticas.postulacionesEvaluando * 30) + 20}px` : '10px',
                        bgcolor: '#3b82f6',
                        borderRadius: 1,
                        minHeight: 10
                      }} />
                    </Box>
                  </Box>
                </Grid>

                {/* Aprobadas */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#10b981">
                      {estadisticas.postulacionesAprobadas}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aprobadas
                    </Typography>
                    <Box sx={{ 
                      height: 120, 
                      display: 'flex', 
                      alignItems: 'end', 
                      justifyContent: 'center',
                      mt: 1
                    }}>
                      <Box sx={{ 
                        width: 40,
                        height: estadisticas.postulacionesAprobadas > 0 ? `${(estadisticas.postulacionesAprobadas * 30) + 20}px` : '10px',
                        bgcolor: '#10b981',
                        borderRadius: 1,
                        minHeight: 10
                      }} />
                    </Box>
                  </Box>
                </Grid>

                {/* Rechazadas */}
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight="bold" color="#ef4444">
                      {estadisticas.postulacionesRechazadas}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rechazadas
                    </Typography>
                    <Box sx={{ 
                      height: 120, 
                      display: 'flex', 
                      alignItems: 'end', 
                      justifyContent: 'center',
                      mt: 1
                    }}>
                      <Box sx={{ 
                        width: 40,
                        height: estadisticas.postulacionesRechazadas > 0 ? `${(estadisticas.postulacionesRechazadas * 30) + 20}px` : '10px',
                        bgcolor: '#ef4444',
                        borderRadius: 1,
                        minHeight: 10
                      }} />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocenteDashboard;
