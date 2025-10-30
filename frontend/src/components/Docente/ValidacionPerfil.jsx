import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  LinearProgress,
  Grid,
  Chip,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const ValidacionPerfil = ({ perfilData, validacion }) => {
  const { user } = useAuth();
  
  const [validacionDetallada, setValidacionDetallada] = useState({
    datos_personales: {
      completado: false,
      observaciones: [],
      campos_completados: 0,
      campos_totales: 6
    },
    formacion_academica: {
      completado: false,
      observaciones: [],
      registros_actuales: 0,
      minimo_requerido: 1
    },
    experiencia_laboral: {
      completado: false,
      observaciones: [],
      registros_actuales: 0,
      minimo_requerido: 1
    },
    disponibilidad_academica: {
      completado: false,
      observaciones: [],
      horarios_definidos: 0,
      cursos_seleccionados: 0
    }
  });

  const [perfilEnviado, setPerfilEnviado] = useState(false);

  const pasos = [
    {
      label: 'Datos Personales',
      icon: <PersonIcon />,
      key: 'datos_personales'
    },
    {
      label: 'Formación Académica',
      icon: <SchoolIcon />,
      key: 'formacion_academica'
    },
    {
      label: 'Experiencia Laboral',
      icon: <WorkIcon />,
      key: 'experiencia_laboral'
    },
    {
      label: 'Disponibilidad Académica',
      icon: <ScheduleIcon />,
      key: 'disponibilidad_academica'
    }
  ];

  useEffect(() => {
    validarPerfilCompleto();
  }, [perfilData, validacion]);

  useEffect(() => {
    verificarEstadoPerfil();
  }, []);

  const verificarEstadoPerfil = async () => {
    try {
      const response = await fetch(`/backend/api/perfil.php?action=estado&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPerfilEnviado(data.data.completado === 1);
      }
    } catch (error) {
      // Error silencioso - continuar con validación
    }
  };

  const validarPerfilCompleto = async () => {
    try {
      // Validar datos personales
      const datosPersonales = perfilData.datosPersonales || {};
      const camposRequeridos = ['nombres', 'apellidos', 'dni', 'telefono', 'direccion', 'cv_archivo'];
      const camposCompletados = camposRequeridos.filter(campo => 
        datosPersonales[campo] && datosPersonales[campo].toString().trim() !== ''
      );
      
      const datosPersonalesCompletos = camposCompletados.length === camposRequeridos.length;

      // Validar formación académica
      const formacionAcademica = perfilData.formacionAcademica || [];
      const formacionCompleta = formacionAcademica.length >= 1;

      // Validar experiencia laboral
      const experienciaLaboral = perfilData.experienciaLaboral || [];
      const experienciaCompleta = experienciaLaboral.length >= 1;

      // Validar disponibilidad académica
      const disponibilidadCompleta = await validarDisponibilidadAcademica();

      // Actualizar estado de validación detallada
      setValidacionDetallada({
        datos_personales: {
          completado: datosPersonalesCompletos,
          observaciones: datosPersonalesCompletos ? [] : [
            'Complete toda su información personal'
          ],
          campos_completados: camposCompletados.length,
          campos_totales: camposRequeridos.length
        },
        formacion_academica: {
          completado: formacionCompleta,
          observaciones: formacionCompleta ? [] : [
            'Debe registrar al menos un título o certificación'
          ],
          registros_actuales: formacionAcademica.length,
          minimo_requerido: 1
        },
        experiencia_laboral: {
          completado: experienciaCompleta,
          observaciones: experienciaCompleta ? [] : [
            'Debe registrar al menos una experiencia laboral'
          ],
          registros_actuales: experienciaLaboral.length,
          minimo_requerido: 1
        },
        disponibilidad_academica: disponibilidadCompleta
      });

    } catch (error) {
      // Error silencioso - continuar con validación local
    }
  };

  const validarDisponibilidadAcademica = async () => {
    try {
      // Obtener horarios
      const responseHorarios = await fetch(`/backend/api/disponibilidad.php?action=horarios&user_id=${user.id}`);
      const dataHorarios = await responseHorarios.json();
      const horarios = dataHorarios.success ? dataHorarios.data : [];

      // Obtener cursos seleccionados
      const responseCursos = await fetch(`/backend/api/disponibilidad.php?action=cursos_seleccionados&user_id=${user.id}`);
      const dataCursos = await responseCursos.json();
      const cursosSeleccionados = dataCursos.success ? dataCursos.data : [];

      const horariosDefinidos = horarios.length;
      const cursosSeleccionadosCount = cursosSeleccionados.length;
      
      const disponibilidadCompleta = horariosDefinidos >= 1 && cursosSeleccionadosCount >= 1;

      return {
        completado: disponibilidadCompleta,
        observaciones: disponibilidadCompleta ? [] : [
          ...(horariosDefinidos === 0 ? ['Debe definir al menos un horario disponible'] : []),
          ...(cursosSeleccionadosCount === 0 ? ['Debe seleccionar al menos un curso'] : [])
        ],
        horarios_definidos: horariosDefinidos,
        cursos_seleccionados: cursosSeleccionadosCount
      };
    } catch (error) {
      return {
        completado: false,
        observaciones: ['Disponibilidad académica pendiente de completar'],
        horarios_definidos: 0,
        cursos_seleccionados: 0
      };
    }
  };

  const calcularPorcentajeTotal = () => {
    const secciones = Object.values(validacionDetallada);
    const completadas = secciones.filter(seccion => seccion.completado).length;
    return Math.round((completadas / secciones.length) * 100);
  };

  const obtenerIconoEstado = (completado) => {
    return completado ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
  };

  const porcentajeTotal = calcularPorcentajeTotal();
  const perfilCompleto = porcentajeTotal >= 100;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <VerifiedIcon color="primary" />
        Validación del Perfil
      </Typography>

      {/* Estado general del perfil */}
      <Alert 
        severity={perfilEnviado ? "success" : perfilCompleto ? "info" : "warning"} 
        sx={{ mb: 3 }}
      >
        {perfilEnviado ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              ✅ Perfil Enviado
            </Typography>
            <Typography variant="body2">
              Su perfil ha sido enviado y será revisado por el director de la especialidad.
            </Typography>
          </Box>
        ) : perfilCompleto ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              🎉 ¡Perfil Completo!
            </Typography>
            <Typography variant="body2">
              Su perfil está 100% completo y listo para ser enviado. Use el botón "Enviar Perfil" en la navegación inferior.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              ⚠️ Perfil Incompleto ({porcentajeTotal}%)
            </Typography>
            <Typography variant="body2">
              Complete todas las secciones para enviar su perfil.
            </Typography>
          </Box>
        )}
      </Alert>

      {/* Progreso general */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progreso General del Perfil
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={porcentajeTotal} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6,
                  bgcolor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: perfilCompleto ? '#10b981' : '#f59e0b',
                    borderRadius: 6
                  }
                }}
              />
            </Box>
            <Box sx={{ minWidth: 50 }}>
              <Typography variant="h6" color={perfilCompleto ? 'success.main' : 'warning.main'} fontWeight="bold">
                {porcentajeTotal}%
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            Verificación completa de su información académica y profesional
          </Typography>
        </CardContent>
      </Card>

      {/* Stepper de validación */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper alternativeLabel>
          {pasos.map((paso) => {
            const seccionData = validacionDetallada[paso.key];
            const completado = seccionData?.completado || false;
            
            return (
              <Step key={paso.key} completed={completado}>
                <StepLabel 
                  icon={completado ? <CheckCircleIcon color="success" /> : paso.icon}
                >
                  {paso.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </Paper>

      {/* Detalle de validación por secciones */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Object.entries(validacionDetallada).map(([key, seccion]) => {
          const paso = pasos.find(p => p.key === key);
          if (!paso) return null;

          return (
            <Grid item xs={12} md={6} key={key}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {obtenerIconoEstado(seccion.completado)}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="600">
                        {paso.label}
                      </Typography>
                      <Chip 
                        label={seccion.completado ? 'Completo' : 'Pendiente'}
                        color={seccion.completado ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                    {seccion.completado ? 'Información verificada correctamente' : 'Pendiente de completar'}
                  </Typography>

                  {seccion.observaciones.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        {seccion.observaciones.join(', ')}
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Información sobre el envío */}
      <Box sx={{ textAlign: 'center' }}>
        {perfilEnviado ? (
          <Alert severity="success" sx={{ maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              ✅ Perfil Enviado
            </Typography>
            <Typography variant="body2">
              Su perfil está en proceso de revisión por el director de la especialidad.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
            <Typography variant="body2">
              {perfilCompleto 
                ? 'Su perfil está completo. Use el botón "Enviar Perfil" en la navegación inferior para enviarlo a evaluación.'
                : `Complete su perfil (${porcentajeTotal}%) y luego use el botón "Enviar Perfil" en la inferior.`
              }
            </Typography>
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxWidth: 500, mx: 'auto' }}>
          {perfilEnviado 
            ? 'Puede seguir el estado de sus postulaciones en la opción de Mis Postulaciones.'
            : 'Una vez enviado, su perfil será revisado por el director de la especialidad'
          }
        </Typography>
      </Box>
    </Box>
  );
};

export default ValidacionPerfil;