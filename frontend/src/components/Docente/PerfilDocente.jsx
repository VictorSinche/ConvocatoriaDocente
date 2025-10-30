import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Send as SendIcon,
  Block as BlockIcon
} from '@mui/icons-material';
import Swal from 'sweetalert2';

// Importar componentes de cada sección
import DatosPersonales from './DatosPersonales';
import FormacionAcademica from './FormacionAcademica';
import ExperienciaLaboral from './ExperienciaLaboral';
import DisponibilidadAcademica from './DisponibilidadAcademica';
import ValidacionPerfil from './ValidacionPerfil';

const PerfilDocente = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Estados principales
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [perfilData, setPerfilData] = useState({
    datosPersonales: {},
    formacionAcademica: [],
    experienciaLaboral: [],
    disponibilidadAcademica: {
      horarios: [],
      cursosSeleccionados: []
    }
  });
  
  // Estados de validación
  const [validacion, setValidacion] = useState({
    datosPersonales: false,
    formacionAcademica: false,
    experienciaLaboral: false,
    disponibilidadAcademica: false,
    perfilCompleto: false
  });

  // Estado para controlar postulaciones ya enviadas
  const [postulacionesEnviadas, setPostulacionesEnviadas] = useState([]);
  const [perfilEnviado, setPerfilEnviado] = useState(false);

  const steps = [
    {
      label: 'Datos Personales',
      icon: <PersonIcon />,
      description: 'Información básica del docente'
    },
    {
      label: 'Formación Académica',
      icon: <SchoolIcon />,
      description: 'Títulos, grados y certificaciones'
    },
    {
      label: 'Experiencia Laboral',
      icon: <WorkIcon />,
      description: 'Historial profesional'
    },
    {
      label: 'Disponibilidad Académica',
      icon: <ScheduleIcon />,
      description: 'Especialidades y horarios'
    },
    {
      label: 'Validación del Perfil',
      icon: <CheckIcon />,
      description: 'Verificación y envío'
    }
  ];

  // Cargar datos del perfil al iniciar
  useEffect(() => {
    cargarPerfilDocente();
    cargarPostulacionesEnviadas();
  }, []);

  // NUEVO: Recargar datos cuando se cambie de step
  useEffect(() => {
    if (activeStep === 4) { // Al llegar a "Validación del Perfil"
      cargarDisponibilidadAcademica();
    }
  }, [activeStep]);

  // Actualizar validación cuando cambien los datos
  useEffect(() => {
    validarPerfil();
  }, [perfilData]);

  const cargarPostulacionesEnviadas = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/postulacion.php?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPostulacionesEnviadas(data.data || []);
        // Si tiene postulaciones, el perfil ya fue enviado
        setPerfilEnviado(data.data && data.data.length > 0);
      }
    } catch (error) {
      // Error silencioso - continuar con carga del perfil
    }
  };

  const cargarPerfilDocente = async () => {
    try {
      setLoading(true);
      
      // Cargar datos personales
      const responseDatos = await fetch(`http://localhost/ConvocaDocente/backend/api/perfil.php?user_id=${user.id}`);
      const dataDatos = await responseDatos.json();
      
      if (dataDatos.success) {
        setPerfilData(prev => ({
          ...prev,
          datosPersonales: dataDatos.data || {}
        }));
      }

      // Cargar formación académica
      const responseFormacion = await fetch(`http://localhost/ConvocaDocente/backend/api/formacion.php?user_id=${user.id}`);
      const dataFormacion = await responseFormacion.json();
      
      if (dataFormacion.success) {
        setPerfilData(prev => ({
          ...prev,
          formacionAcademica: dataFormacion.data || []
        }));
      }

      // Cargar experiencia laboral
      const responseExperiencia = await fetch(`http://localhost/ConvocaDocente/backend/api/experiencia.php?user_id=${user.id}`);
      const dataExperiencia = await responseExperiencia.json();
      
      if (dataExperiencia.success) {
        setPerfilData(prev => ({
          ...prev,
          experienciaLaboral: dataExperiencia.data || []
        }));
      }

      // Cargar disponibilidad académica
      await cargarDisponibilidadAcademica();

    } catch (error) {
      Swal.fire({
        title: 'Información no disponible',
        text: 'No se pudo cargar la información del perfil. Intente nuevamente.',
        icon: 'warning',
        confirmButtonColor: '#a855f7'
      });
    } finally {
      setLoading(false);
    }
  };

  const cargarDisponibilidadAcademica = async () => {
    try {
      // Cargar horarios
      const responseHorarios = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=horarios&user_id=${user.id}`);
      const dataHorarios = await responseHorarios.json();

      // Cargar cursos seleccionados
      const responseCursos = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=cursos_seleccionados&user_id=${user.id}`);
      const dataCursos = await responseCursos.json();

      const nuevaDisponibilidad = {
        horarios: dataHorarios.success ? dataHorarios.data : [],
        cursosSeleccionados: dataCursos.success ? dataCursos.data : []
      };

      setPerfilData(prev => ({
        ...prev,
        disponibilidadAcademica: nuevaDisponibilidad
      }));
    } catch (error) {
      // Error silencioso - continuar con datos disponibles
    }
  };

  const validarPerfil = async () => {
    try {
      // Llamar al endpoint de validación del backend
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/perfil.php?action=validar&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const validacionBackend = data.data.validacion;
        const nuevaValidacion = {
          datosPersonales: validacionBackend.datos_personales?.completado || false,
          formacionAcademica: validacionBackend.formacion_academica?.completado || false,
          experienciaLaboral: validacionBackend.experiencia_laboral?.completado || false,
          disponibilidadAcademica: validacionBackend.disponibilidad_academica?.completado || false,
          perfilCompleto: data.data.perfil_completo || false
        };
        
        setValidacion(nuevaValidacion);
      } else {
        // Fallback a validación local si falla el backend
        validarPerfilLocal();
      }
    } catch (error) {
      validarPerfilLocal();
    }
  };

  const validarPerfilLocal = () => {
    const nuevaValidacion = {
      datosPersonales: validarDatosPersonales(),
      formacionAcademica: validarFormacionAcademica(),
      experienciaLaboral: validarExperienciaLaboral(),
      disponibilidadAcademica: validarDisponibilidadAcademica(),
      perfilCompleto: false
    };

    // El perfil está completo si todas las secciones son válidas
    nuevaValidacion.perfilCompleto = Object.values(nuevaValidacion).every(val => val === true);
    
    setValidacion(nuevaValidacion);
  };

  const validarDatosPersonales = () => {
    const datos = perfilData.datosPersonales;
    return datos && 
           datos.nombres && 
           datos.apellidos && 
           datos.dni && 
           datos.telefono && 
           datos.direccion &&
           datos.cv_archivo; // Incluir CV como requerido
  };

  const validarFormacionAcademica = () => {
    // Al menos un grado académico registrado
    return perfilData.formacionAcademica && perfilData.formacionAcademica.length > 0;
  };

  const validarExperienciaLaboral = () => {
    // Al menos una experiencia laboral registrada
    return perfilData.experienciaLaboral && perfilData.experienciaLaboral.length > 0;
  };

  const validarDisponibilidadAcademica = () => {
    // CORRECCIÓN: Validar solo horarios y cursos seleccionados, sin filtrar por postulaciones
    const horarios = perfilData.disponibilidadAcademica?.horarios || [];
    const cursosSeleccionados = perfilData.disponibilidadAcademica?.cursosSeleccionados || [];
    
    // Solo verificar que existan horarios y cursos, sin filtrar por postulaciones previas
    return horarios.length > 0 && cursosSeleccionados.length > 0;
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepClick = (step) => {
    setActiveStep(step);
  };

  const actualizarSeccion = (seccion, datos) => {
    setPerfilData(prev => ({
      ...prev,
      [seccion]: datos
    }));
  };

  const actualizarDisponibilidad = (disponibilidadData) => {
    setPerfilData(prev => ({
      ...prev,
      disponibilidadAcademica: disponibilidadData
    }));
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <DatosPersonales
            datos={perfilData.datosPersonales}
            onUpdate={(datos) => actualizarSeccion('datosPersonales', datos)}
            userId={user.id}
          />
        );
      case 1:
        return (
          <FormacionAcademica
            formacion={perfilData.formacionAcademica}
            onUpdate={(formacion) => actualizarSeccion('formacionAcademica', formacion)}
            userId={user.id}
          />
        );
      case 2:
        return (
          <ExperienciaLaboral
            experiencia={perfilData.experienciaLaboral}
            onUpdate={(experiencia) => actualizarSeccion('experienciaLaboral', experiencia)}
            userId={user.id}
          />
        );
      case 3:
        return (
          <DisponibilidadAcademica
            onUpdate={actualizarDisponibilidad}
            postulacionesEnviadas={postulacionesEnviadas}
          />
        );
      case 4:
        return (
          <ValidacionPerfil
            perfilData={perfilData}
            validacion={validacion}
            onEnviar={handleEnviarPerfil}
            postulacionesEnviadas={postulacionesEnviadas}
          />
        );
      default:
        return 'Sección desconocida';
    }
  };

  const handleEnviarPerfil = async () => {
    // CORRECCIÓN: Recargar datos antes de validar
    await cargarDisponibilidadAcademica();
    
    if (!validacion.perfilCompleto) {
      Swal.fire({
        title: '⚠️ Perfil incompleto',
        text: 'Por favor completa todas las secciones obligatorias antes de enviar',
        icon: 'warning',
        confirmButtonColor: '#a855f7'
      });
      return;
    }

    const cursosSeleccionados = perfilData.disponibilidadAcademica?.cursosSeleccionados || [];
    
    // CORRECCIÓN: Para el primer envío, solo verificar que existan cursos
    if (cursosSeleccionados.length === 0) {
      Swal.fire({
        title: '⚠️ Sin cursos seleccionados',
        text: 'Debe seleccionar al menos un curso en la sección de Disponibilidad Académica.',
        icon: 'warning',
        confirmButtonColor: '#a855f7'
      });
      return;
    }

    // CORRECCIÓN: Solo filtrar cursos si ya hay postulaciones previas
    let cursosDisponibles = cursosSeleccionados;
    if (postulacionesEnviadas.length > 0) {
      cursosDisponibles = cursosSeleccionados.filter(curso => {
        const especialidadKey = `${curso.codigo_facultad}_${curso.codigo_especialidad}`;
        return !postulacionesEnviadas.some(post => `${post.cod_fac}_${post.cod_esp}` === especialidadKey);
      });

      if (cursosDisponibles.length === 0) {
        Swal.fire({
          title: '⚠️ Sin especialidades disponibles',
          text: 'Ya se ha postulado a todas las especialidades seleccionadas. Agregue cursos de otras especialidades para continuar.',
          icon: 'warning',
          confirmButtonColor: '#a855f7'
        });
        return;
      }
    }
    
    const result = await Swal.fire({
      title: '¿Enviar Perfil para Evaluación?',
      html: `
        <div style="text-align: left;">
          <p><strong>Su perfil será enviado con:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>✅ Datos personales completos</li>
            <li>✅ Formación académica verificada</li>
            <li>✅ Experiencia laboral registrada</li>
            <li>✅ Disponibilidad académica definida</li>
          </ul>
          <p><em>Se registrarán sus postulaciones a las especialidades correspondientes para evaluación del director.</em></p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, enviar perfil',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        
        // 1. Marcar perfil personal como completado
        const responseProfile = await fetch('http://localhost/ConvocaDocente/backend/api/perfil.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'enviar_validacion',
            user_id: user.id
          })
        });

        const dataProfile = await responseProfile.json();
        if (!dataProfile.success) {
          throw new Error(dataProfile.message || 'Error al marcar perfil como completado');
        }

        // 2. Registrar postulaciones en la tabla postulaciones
        // Agrupar cursos disponibles por especialidad
        const especialidadesPorCurso = {};
        cursosDisponibles.forEach(curso => {
          const key = `${curso.codigo_facultad}_${curso.codigo_especialidad}`;
          if (!especialidadesPorCurso[key]) {
            especialidadesPorCurso[key] = {
              cod_fac: curso.codigo_facultad,
              cod_esp: curso.codigo_especialidad,
              nombre_facultad: curso.nombre_facultad,
              nombre_especialidad: curso.nombre_especialidad,
              cursos: []
            };
          }
          especialidadesPorCurso[key].cursos.push(curso);
        });

        let postulacionesRegistradas = 0;
        const especialidades = Object.values(especialidadesPorCurso);

        // Registrar una postulación por especialidad
        for (const especialidad of especialidades) {
          try {
            const responsePostulacion = await fetch('http://localhost/ConvocaDocente/backend/api/postulacion.php', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                action: 'postular_especialidad',
                user_id: user.id,
                cod_fac: especialidad.cod_fac,
                cod_esp: especialidad.cod_esp
              })
            });

            const dataPostulacion = await responsePostulacion.json();
            if (dataPostulacion.success) {
              postulacionesRegistradas++;
            } else {
              // Error silencioso - continuar con siguiente postulación
            }
          } catch (error) {
            // Error silencioso - continuar con siguiente postulación
          }
        }

        Swal.fire({
          title: '🎉 ¡Perfil Enviado Exitosamente!',
          html: `
            <div style="text-align: center;">
              <p><strong>Su perfil ha sido enviado correctamente.</strong></p>
              <p>✅ Perfil marcado como completado</p>
              <p>✅ ${postulacionesRegistradas} postulaciones registradas a especialidades</p>
              <p><em>Será evaluado por los directores de las especialidades correspondientes.</em></p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#10b981'
        });

        // Recargar datos para reflejar cambios
        await cargarPerfilDocente();
        await cargarPostulacionesEnviadas();

      } catch (error) {
        Swal.fire({
          title: 'Error de envío',
          text: 'No se pudo enviar el perfil. Verifique su conexión e intente nuevamente.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const getValidationColor = (isValid) => {
    return isValid ? '#10b981' : '#ef4444';
  };

  // CORRECCIÓN: Simplificar la lógica de habilitación del botón
  const isEnviarDisabled = () => {
    // Si el perfil no está completo, deshabilitar
    if (!validacion.perfilCompleto) return true;
    
    // Si ya hay postulaciones, verificar si hay cursos de nuevas especialidades
    if (postulacionesEnviadas.length > 0) {
      const cursosSeleccionados = perfilData.disponibilidadAcademica?.cursosSeleccionados || [];
      const cursosDisponibles = cursosSeleccionados.filter(curso => {
        const especialidadKey = `${curso.codigo_facultad}_${curso.codigo_especialidad}`;
        return !postulacionesEnviadas.some(post => `${post.cod_fac}_${post.cod_esp}` === especialidadKey);
      });
      return cursosDisponibles.length === 0;
    }
    
    // Para el primer envío, solo verificar que el perfil esté completo
    return false;
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Cargando información del perfil...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', mb: 1 }}>
          Mi Perfil
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Completa tu información para participar en los procesos de reclutamiento
        </Typography>
        
        {/* Barra de progreso general */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Progreso del perfil:
            </Typography>
            {(() => {
              // Contar las 4 secciones principales
              const secciones = ['datosPersonales', 'formacionAcademica', 'experienciaLaboral', 'disponibilidadAcademica'];
              const completadas = secciones.filter(key => validacion[key]).length;
              return (
                <Chip 
                  label={`${completadas}/4 completadas`}
                  size="small"
                  sx={{ 
                    bgcolor: validacion.perfilCompleto ? '#10b981' : '#f59e0b',
                    color: 'white'
                  }}
                />
              );
            })()}
          </Stack>
          {(() => {
            const secciones = ['datosPersonales', 'formacionAcademica', 'experienciaLaboral', 'disponibilidadAcademica'];
            const completadas = secciones.filter(key => validacion[key]).length;
            return (
              <LinearProgress 
                variant="determinate" 
                value={(completadas / 4) * 100}
                sx={{ 
                  height: 8, 
                  borderRadius: 1,
                  bgcolor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: validacion.perfilCompleto ? '#10b981' : '#a855f7'
                  }
                }}
              />
            );
          })()}
        </Box>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Stepper 
          activeStep={activeStep} 
          orientation={isMobile ? 'vertical' : 'horizontal'}
          sx={{ mb: 2 }}
        >
          {steps.map((step, index) => (
            <Step 
              key={step.label}
              completed={index < 4 ? validacion[Object.keys(validacion)[index]] : false}
            >
              <StepLabel 
                icon={step.icon}
                onClick={() => handleStepClick(index)}
                sx={{ 
                  cursor: 'pointer',
                  '& .MuiStepIcon-root': {
                    color: index < 4 ? getValidationColor(validacion[Object.keys(validacion)[index]]) : '#6b7280'
                  }
                }}
              >
                <Box>
                  <Typography variant="subtitle2">{step.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Card>

      {/* Contenido de la sección actual */}
      <Card sx={{ mb: 3 }}>
        {getStepContent(activeStep)}
      </Card>

      {/* Navegación */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
          <Button 
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ minWidth: 100 }}
          >
            Anterior
          </Button>

          <Typography variant="body2" color="text.secondary">
            Paso {activeStep + 1} de {steps.length}
          </Typography>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleEnviarPerfil}
              disabled={isEnviarDisabled() || loading}
              startIcon={isEnviarDisabled() ? <BlockIcon /> : <SendIcon />}
              sx={{ 
                bgcolor: isEnviarDisabled() ? '#6b7280' : '#10b981', 
                '&:hover': { bgcolor: isEnviarDisabled() ? '#6b7280' : '#059669' },
                minWidth: 150,
                fontWeight: 'bold'
              }}
            >
              {loading ? 'Enviando...' : 
               isEnviarDisabled() ? 'Perfil Enviado' : 'Enviar Perfil'}
            </Button>
          ) : (
            <Button 
              variant="contained"
              onClick={handleNext}
              sx={{ 
                bgcolor: '#a855f7', 
                '&:hover': { bgcolor: '#9333ea' },
                minWidth: 100
              }}
            >
              Siguiente
            </Button>
          )}
        </Stack>
      </Card>

      {/* Alert de validación */}
      {!validacion.perfilCompleto && (
        <Alert 
          severity="info" 
          sx={{ mt: 2 }}
          icon={<WarningIcon />}
        >
          <Typography variant="body2">
            <strong>Completa las siguientes secciones:</strong>
          </Typography>
          <Box sx={{ mt: 1 }}>
            {!validacion.datosPersonales && (
              <Typography variant="caption" display="block">• Datos Personales (incluir CV)</Typography>
            )}
            {!validacion.formacionAcademica && (
              <Typography variant="caption" display="block">• Al menos un grado académico</Typography>
            )}
            {!validacion.experienciaLaboral && (
              <Typography variant="caption" display="block">• Al menos una experiencia laboral</Typography>
            )}
            {!validacion.disponibilidadAcademica && (
              <Typography variant="caption" display="block">• Al menos un curso y horarios disponibles</Typography>
            )}
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default PerfilDocente;