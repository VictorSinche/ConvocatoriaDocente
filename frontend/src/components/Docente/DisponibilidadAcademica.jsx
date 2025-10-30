import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  Stack,
  Tooltip,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  AccessTime as TimeIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const DisponibilidadAcademica = ({ onUpdate }) => {
  const { user } = useAuth();
  
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [facultades, setFacultades] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [cursosActivos, setCursosActivos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState([]);
  
  // Estado para controlar si el perfil ya fue enviado
  const [perfilCompletado, setPerfilCompletado] = useState(false);
  const [puedeModificar, setPuedeModificar] = useState(true);
  
  // Estados de selección
  const [selectedFacultad, setSelectedFacultad] = useState('');
  const [selectedEspecialidad, setSelectedEspecialidad] = useState('');
  const [cursosSeleccionados, setCursosSeleccionados] = useState([]);
  
  // Estados para horarios por día
  const [horariosPorDia, setHorariosPorDia] = useState({
    'Lunes': { activo: false, hora_inicio: '', hora_fin: '', id: null },
    'Martes': { activo: false, hora_inicio: '', hora_fin: '', id: null },
    'Miércoles': { activo: false, hora_inicio: '', hora_fin: '', id: null },
    'Jueves': { activo: false, hora_inicio: '', hora_fin: '', id: null },
    'Viernes': { activo: false, hora_inicio: '', hora_fin: '', id: null },
    'Sábado': { activo: false, hora_inicio: '', hora_fin: '', id: null },
    'Domingo': { activo: false, hora_inicio: '', hora_fin: '', id: null }
  });

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  // Cargar especialidades cuando cambie la facultad
  useEffect(() => {
    if (selectedFacultad) {
      cargarEspecialidades();
    } else {
      setEspecialidades([]);
      setSelectedEspecialidad('');
      setCursosActivos([]);
      setCursosSeleccionados([]);
    }
  }, [selectedFacultad]);

  // Cargar cursos cuando se seleccione especialidad
  useEffect(() => {
    if (selectedFacultad && selectedEspecialidad) {
      cargarCursosActivos();
    } else {
      setCursosActivos([]);
      setCursosSeleccionados([]);
    }
  }, [selectedFacultad, selectedEspecialidad]);



  // Función auxiliar para validar horarios completos
  const obtenerHorariosCompletos = () => {
    return Object.values(horariosPorDia).filter(h => h.activo && h.hora_inicio?.trim() && h.hora_fin?.trim());
  };

  const cargarDatosIniciales = async () => {
    setLoading(true);
    try {
      await Promise.all([
        verificarEstadoPerfil(),
        cargarFacultades(),
        cargarHorarios(),
        cargarCursosSeleccionadosGuardados()
      ]);
      
      // CARGAR especialidades seleccionadas automáticamente
      await actualizarEspecialidadesSeleccionadas();
    } catch (error) {
      toast.error('Error al cargar la información. Por favor recargue la página.');
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el perfil ya fue completado
  const verificarEstadoPerfil = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=verificar_estado&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setPerfilCompletado(data.data.perfil_completado);
        setPuedeModificar(data.data.puede_modificar);
      }
    } catch (error) {
      // Error silencioso - continuar con valores por defecto
    }
  };

  const cargarFacultades = async () => {
    try {
      const response = await fetch('http://localhost/ConvocaDocente/backend/api/usuarios.php?action=facultades');
      const data = await response.json();
      
      if (data.success) {
        setFacultades(data.data);
      }
    } catch (error) {
      // Error silencioso - continuar sin facultades
    }
  };

  const cargarEspecialidades = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/usuarios.php?action=especialidades&cod_fac=${selectedFacultad}`);
      const data = await response.json();
      
      if (data.success) {
        setEspecialidades(data.data);
      }
    } catch (error) {
      // Error silencioso - continuar sin especialidades
    }
  };

  const cargarCursosActivos = async () => {
    try {
      const url = `http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=cursos&cod_fac=${selectedFacultad}&cod_esp=${selectedEspecialidad}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setCursosActivos(data.data);
        
        // Cargar cursos ya seleccionados para esta especialidad
        const responseCursosSeleccionados = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=cursos_seleccionados&user_id=${user.id}`);
        const dataCursosSeleccionados = await responseCursosSeleccionados.json();
        
        if (dataCursosSeleccionados.success) {
          // Filtrar solo los cursos de la especialidad actual
          const cursosDeEstaEspecialidad = dataCursosSeleccionados.data.filter(curso => 
            curso.codigo_facultad === selectedFacultad && curso.codigo_especialidad === selectedEspecialidad
          );
          
          const cursosIds = cursosDeEstaEspecialidad.map(curso => curso.curso_id);
          setCursosSeleccionados(cursosIds);
        }
      }
    } catch (error) {
      // Error silencioso - continuar sin cursos
    }
  };

  const cargarHorarios = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=horarios&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        // Resetear estado de horarios por día
        const nuevosHorarios = {
          'Lunes': { activo: false, hora_inicio: '', hora_fin: '', id: null },
          'Martes': { activo: false, hora_inicio: '', hora_fin: '', id: null },
          'Miércoles': { activo: false, hora_inicio: '', hora_fin: '', id: null },
          'Jueves': { activo: false, hora_inicio: '', hora_fin: '', id: null },
          'Viernes': { activo: false, hora_inicio: '', hora_fin: '', id: null },
          'Sábado': { activo: false, hora_inicio: '', hora_fin: '', id: null },
          'Domingo': { activo: false, hora_inicio: '', hora_fin: '', id: null }
        };

        // Poblar con datos existentes
        data.data.forEach(horario => {
          if (nuevosHorarios[horario.dia]) {
            nuevosHorarios[horario.dia] = {
              activo: true,
              hora_inicio: horario.hora_inicio,
              hora_fin: horario.hora_fin,
              id: horario.id
            };
          }
        });

        setHorariosPorDia(nuevosHorarios);
        setHorarios(data.data); // Mantener para compatibilidad
      }
    } catch (error) {
      // Error silencioso - continuar sin horarios
    }
  };

  // Función para cargar cursos previamente guardados
  const cargarCursosSeleccionadosGuardados = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=cursos_seleccionados&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        // Agrupar cursos por especialidad
        const cursosAgrupados = {};
        
        data.data.forEach(curso => {
          const key = `${curso.codigo_facultad}-${curso.codigo_especialidad}`;
          if (!cursosAgrupados[key]) {
            cursosAgrupados[key] = {
              cod_fac: curso.codigo_facultad,
              cod_esp: curso.codigo_especialidad,
              nombre_especialidad: curso.nombre_especialidad,
              nombre_facultad: curso.nombre_facultad,
              cursos_seleccionados: [],
              cursos_data: []
            };
          }
          cursosAgrupados[key].cursos_seleccionados.push(curso.curso_id);
          cursosAgrupados[key].cursos_data.push({
            id: curso.curso_id,
            nombre_curso: curso.nombre_curso,
            codigo_curso: curso.codigo_curso,
            ciclo: curso.ciclo
          });
        });

        // Convertir a array
        const especialidadesRecuperadas = Object.values(cursosAgrupados);
        setEspecialidadesSeleccionadas(especialidadesRecuperadas);
      }
    } catch (error) {
      // Error silencioso - continuar sin cursos seleccionados
    }
  };

  // Manejar activación/desactivación de día
  const handleDiaCheckboxChange = (dia) => {
    if (!puedeModificar) {
      toast.error('No se pueden realizar modificaciones después de enviar el perfil.');
      return;
    }

    const horarioDia = horariosPorDia[dia];
    
    if (horarioDia.activo) {
      // Desactivar día - solo cambiar estado local
      setHorariosPorDia(prev => ({
        ...prev,
        [dia]: { activo: false, hora_inicio: '', hora_fin: '', id: null }
      }));
    } else {
      // Activar día - solo cambiar estado local
      setHorariosPorDia(prev => ({
        ...prev,
        [dia]: { ...prev[dia], activo: true }
      }));
    }
  };

  // Manejar cambio de horarios
  const handleTimeChange = (dia, campo, valor) => {
    if (!puedeModificar) return;

    // Validar horarios solo localmente
    const horarioDia = horariosPorDia[dia];
    const nuevosValores = { ...horarioDia, [campo]: valor };
    
    if (nuevosValores.hora_inicio && nuevosValores.hora_fin && nuevosValores.hora_inicio >= nuevosValores.hora_fin) {
      toast.error('La hora de fin debe ser mayor que la hora de inicio');
      return;
    }

    // Solo actualizar estado local
    setHorariosPorDia(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  };



  const handleCursoSelection = async (cursoId) => {
    if (!puedeModificar) {
      toast.error('No se pueden realizar modificaciones después de enviar el perfil.');
      return;
    }

    try {
      const isCurrentlySelected = cursosSeleccionados.includes(cursoId);
      
      if (isCurrentlySelected) {
        // ELIMINAR curso de la base de datos
        const response = await fetch('http://localhost/ConvocaDocente/backend/api/disponibilidad.php', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'eliminar_curso',
            user_id: user.id,
            curso_id: cursoId
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Quitar del estado local
          setCursosSeleccionados(prev => prev.filter(id => id !== cursoId));
          toast.success('Curso eliminado');
          
          // ACTUALIZAR especialidadesSeleccionadas AUTOMÁTICAMENTE
          actualizarEspecialidadesSeleccionadas();
        } else {
          toast.error('No se pudo eliminar el curso');
        }
      } else {
        // AGREGAR curso a la base de datos
        const response = await fetch('http://localhost/ConvocaDocente/backend/api/disponibilidad.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'agregar_curso',
            user_id: user.id,
            curso_id: cursoId
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Agregar al estado local
          setCursosSeleccionados(prev => [...prev, cursoId]);
          toast.success('Curso agregado');
          
          // ACTUALIZAR especialidadesSeleccionadas AUTOMÁTICAMENTE
          actualizarEspecialidadesSeleccionadas();
        } else {
          toast.error('No se pudo agregar el curso');
        }
      }
    } catch (error) {
      toast.error('Error de conexión. Intente nuevamente.');
    }
  };

  // NUEVA FUNCIÓN: Actualizar especialidades seleccionadas automáticamente
  const actualizarEspecialidadesSeleccionadas = async () => {
    try {
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/disponibilidad.php?action=cursos_seleccionados&user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        // Agrupar cursos por especialidad
        const especialidadesMap = {};
        
        data.data.forEach(curso => {
          const key = `${curso.codigo_facultad}-${curso.codigo_especialidad}`;
          
          if (!especialidadesMap[key]) {
            especialidadesMap[key] = {
              codigo_facultad: curso.codigo_facultad,
              codigo_especialidad: curso.codigo_especialidad,
              nombre_facultad: curso.nombre_facultad,
              nombre_especialidad: curso.nombre_especialidad,
              cursos_seleccionados: [],
              cursos_data: []
            };
          }
          
          especialidadesMap[key].cursos_seleccionados.push(curso.curso_id);
          especialidadesMap[key].cursos_data.push({
            id: curso.curso_id,
            nombre_curso: curso.nombre_curso,
            codigo_curso: curso.codigo_curso,
            ciclo: curso.ciclo,
            modalidad: curso.modalidad
          });
        });
        
        setEspecialidadesSeleccionadas(Object.values(especialidadesMap));
      } else {
        setEspecialidadesSeleccionadas([]);
      }
    } catch (error) {
      // Error silencioso - continuar sin actualizar especialidades
    }
  };



  const eliminarEspecialidad = async (index) => {
    if (!puedeModificar) {
      toast.error('No se pueden realizar modificaciones después de enviar el perfil.');
      return;
    }

    const result = await Swal.fire({
      title: '¿Retirar postulación?',
      text: 'Se eliminará su postulación a todos los cursos de esta especialidad',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, retirar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const especialidadAEliminar = especialidadesSeleccionadas[index];
        
        // Eliminar cursos de la tabla docente_cursos
        for (const cursoId of especialidadAEliminar.cursos_seleccionados) {
          const response = await fetch('http://localhost/ConvocaDocente/backend/api/disponibilidad.php', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'eliminar_curso',
              user_id: user.id,
              curso_id: cursoId
            })
          });

          const data = await response.json();
          
          // Eliminación exitosa o fallida - continuar
        }

        const nuevasEspecialidades = especialidadesSeleccionadas.filter((_, i) => i !== index);
        setEspecialidadesSeleccionadas(nuevasEspecialidades);
        toast.success('Su postulación ha sido retirada exitosamente');
        
        if (onUpdate) {
          onUpdate({ horarios, postulaciones: nuevasEspecialidades });
        }
      } catch (error) {
        toast.error('No se pudo eliminar la especialidad. Intente nuevamente.');
      }
    }
  };

  const guardarDisponibilidadAcademica = async () => {
    if (!puedeModificar) {
      toast.error('No se pueden realizar modificaciones después de enviar el perfil.');
      return;
    }

    // Validaciones
    const horariosActivos = obtenerHorariosCompletos();
    if (horariosActivos.length === 0) {
      toast.error('Por favor defina al menos un horario disponible');
      return;
    }

    if (especialidadesSeleccionadas.length === 0) {
      toast.error('Por favor postule al menos a una especialidad con cursos');
      return;
    }

    const result = await Swal.fire({
      title: '¿Confirmar disponibilidad académica?',
      text: 'Se guardará su información de horarios disponibles y cursos de interés.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        // 1. Guardar horarios usando el nuevo estado
        const horariosParaGuardar = Object.entries(horariosPorDia)
          .filter(([_, data]) => data.activo && data.hora_inicio && data.hora_fin)
          .map(([dia, data]) => ({
            dia: dia,
            hora_inicio: data.hora_inicio,
            hora_fin: data.hora_fin
          }));

        const responseHorarios = await fetch('http://localhost/ConvocaDocente/backend/api/disponibilidad.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'guardar_horarios',
            user_id: user.id,
            horarios: horariosParaGuardar
          })
        });

        const dataHorarios = await responseHorarios.json();
        if (!dataHorarios.success) {
          throw new Error('No se pudieron guardar los horarios');
        }

        // 2. Guardar todos los cursos seleccionados
        const todosCursos = [];
        especialidadesSeleccionadas.forEach(esp => {
          todosCursos.push(...esp.cursos_seleccionados);
        });

        if (todosCursos.length > 0) {
          const responseCursos = await fetch('http://localhost/ConvocaDocente/backend/api/disponibilidad.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'guardar_cursos',
              user_id: user.id,
              cursos_seleccionados: todosCursos
            })
          });

          const dataCursos = await responseCursos.json();
          if (!dataCursos.success) {
            throw new Error('No se pudieron guardar los cursos');
          }
        }

        toast.success('Disponibilidad académica guardada correctamente');
        
        Swal.fire({
          title: '¡Guardado exitoso!',
          text: 'Su disponibilidad académica ha sido registrada correctamente',
          icon: 'success',
          confirmButtonColor: '#10b981'
        });

        if (onUpdate) {
          onUpdate({ horarios, postulaciones: especialidadesSeleccionadas });
        }

      } catch (error) {
        toast.error('No se pudo guardar la información. Intente nuevamente.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScheduleIcon color="primary" />
        Disponibilidad Académica
      </Typography>

      <Grid container spacing={3}>

        {/* SECCIÓN 1: SELECCIÓN DE ESPECIALIDAD Y CURSOS */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <SchoolIcon color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Postulación a Cursos por Especialidad
                </Typography>
              </Box>

              {!perfilCompletado ? (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Seleccione la especialidad y los cursos en los que desea participar como docente. Puede postular a múltiples especialidades.
                  </Alert>

                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Facultad</InputLabel>
                        <Select
                          value={selectedFacultad}
                          onChange={(e) => setSelectedFacultad(e.target.value)}
                          label="Facultad"
                        >
                          <MenuItem value="">
                            <em>Seleccionar facultad</em>
                          </MenuItem>
                          {facultades.map((facultad) => (
                            <MenuItem key={facultad.cod_fac} value={facultad.cod_fac}>
                              {facultad.nom_fac}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth disabled={!selectedFacultad}>
                        <InputLabel>Especialidad</InputLabel>
                        <Select
                          value={selectedEspecialidad}
                          onChange={(e) => setSelectedEspecialidad(e.target.value)}
                          label="Especialidad"
                        >
                          <MenuItem value="">
                            <em>Seleccionar especialidad</em>
                          </MenuItem>
                          {especialidades.map((especialidad) => (
                            <MenuItem key={especialidad.cod_esp} value={especialidad.cod_esp}>
                              {especialidad.nom_esp}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  {/* CURSOS DISPONIBLES */}
                  {selectedFacultad && selectedEspecialidad && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      
                      <Typography variant="h6" fontWeight="600" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ClassIcon color="primary" />
                        Cursos Disponibles
                      </Typography>

                      {cursosActivos.length > 0 ? (
                        <>
                          <Alert severity="info" sx={{ mb: 2 }}>
                            Seleccione los cursos que le interese dictar en esta especialidad.
                          </Alert>

                          <Grid container spacing={2} sx={{ mb: 3 }}>
                            {cursosActivos.map((curso) => (
                              <Grid item xs={12} md={6} lg={4} key={curso.id}>
                                <Card 
                                  variant="outlined" 
                                  sx={{ 
                                    height: '100%',
                                    border: cursosSeleccionados.includes(curso.id) ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                    backgroundColor: cursosSeleccionados.includes(curso.id) ? '#f3f8ff' : 'white'
                                  }}
                                >
                                  <CardContent>
                                    <FormControlLabel
                                      control={
                                        <Checkbox
                                          checked={cursosSeleccionados.includes(curso.id)}
                                          onChange={() => handleCursoSelection(curso.id)}
                                          color="primary"
                                        />
                                      }
                                      label={
                                        <Box>
                                          <Typography variant="subtitle2" fontWeight="600" color="primary">
                                            {curso.nombre_curso}
                                          </Typography>
                                          <Stack spacing={0.5} sx={{ mt: 1 }}>
                                            <Typography variant="body2" color="text.secondary">
                                              <strong>Código:</strong> {curso.codigo_curso}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                              <strong>Ciclo:</strong> {curso.ciclo}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                              <strong>Modalidad:</strong> {curso.modalidad}
                                            </Typography>
                                          </Stack>
                                        </Box>
                                      }
                                    />
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>


                        </>
                      ) : (
                        <Alert severity="info">
                          No hay cursos disponibles para esta especialidad en este momento.
                        </Alert>
                      )}
                    </>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  Su perfil ha sido enviado. No se pueden agregar más especialidades o cursos.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* SECCIÓN 2: HORARIOS DISPONIBLES */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <TimeIcon color="primary" />
                <Typography variant="h6" fontWeight="600">
                  Horarios Disponibles
                </Typography>
              </Box>

              <Alert severity="info" sx={{ mb: 3 }}>
                {perfilCompletado 
                  ? 'Horarios enviados para evaluación.'
                  : 'Seleccione los días disponibles y defina los horarios. Presione "Confirmar Disponibilidad" para guardar.'
                }
              </Alert>

              {/* Nueva interfaz de horarios por día */}
              <Box sx={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                p: 3,
                backgroundColor: perfilCompletado ? '#f5f5f5' : 'white'
              }}>
                <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                  Disponibilidad por día
                </Typography>

                <Stack spacing={2}>
                  {Object.entries(horariosPorDia).map(([dia, data]) => (
                    <Box 
                      key={dia}
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        border: '1px solid #f0f0f0',
                        borderRadius: 1,
                        backgroundColor: data.activo ? '#f8f9ff' : 'white'
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={data.activo}
                            onChange={() => handleDiaCheckboxChange(dia)}
                            disabled={!puedeModificar}
                            color="primary"
                          />
                        }
                        label={
                          <Typography 
                            variant="body1" 
                            fontWeight="500"
                            sx={{ minWidth: 90, textTransform: 'capitalize' }}
                          >
                            {dia}
                          </Typography>
                        }
                      />

                      <TextField
                        type="time"
                        label="Hora inicio"
                        size="small"
                        value={data.hora_inicio}
                        onChange={(e) => handleTimeChange(dia, 'hora_inicio', e.target.value)}
                        disabled={!data.activo || !puedeModificar}
                        sx={{ flex: 1 }}
                        InputLabelProps={{ shrink: true }}
                      />

                      <TextField
                        type="time"
                        label="Hora fin"
                        size="small"
                        value={data.hora_fin}
                        onChange={(e) => handleTimeChange(dia, 'hora_fin', e.target.value)}
                        disabled={!data.activo || !puedeModificar}
                        sx={{ flex: 1 }}
                        InputLabelProps={{ shrink: true }}
                      />

                      {data.activo && data.hora_inicio?.trim() && data.hora_fin?.trim() && (
                        <Chip 
                          icon={<TimeIcon />}
                          label="Completo" 
                          size="small" 
                          color="primary" 
                          variant="outlined" 
                        />
                      )}
                    </Box>
                  ))}
                </Stack>

                {/* Confirmación de horarios */}
                {obtenerHorariosCompletos().length > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Sus horarios disponibles han sido definidos correctamente.
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>        

        {/* SECCIÓN 3: CURSOS SELECCIONADOS POR ESPECIALIDAD */}
        {especialidadesSeleccionadas.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
                  Mis Postulaciones a Cursos
                </Typography>
                
                <Stack spacing={2}>
                  {especialidadesSeleccionadas.map((especialidad, index) => (
                    <Card key={index} variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" fontWeight="600" color="primary" sx={{ mb: 1 }}>
                              {especialidad.nombre_especialidad}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {especialidad.nombre_facultad}
                            </Typography>
                            
                            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 1 }}>
                              Cursos postulados:
                            </Typography>
                            <List dense sx={{ pl: 2 }}>
                              {especialidad.cursos_data?.map((curso, cursoIndex) => (
                                <ListItem key={cursoIndex} sx={{ py: 0.5, pl: 0 }}>
                                  <ListItemText 
                                    primary={`• ${curso.nombre_curso}`}
                                    secondary={`Código: ${curso.codigo_curso} - Ciclo: ${curso.ciclo}`}
                                    primaryTypographyProps={{ variant: 'body2' }}
                                    secondaryTypographyProps={{ variant: 'caption' }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                          
                          {puedeModificar && (
                            <Tooltip title="Retirar postulación">
                              <IconButton
                                color="error"
                                onClick={() => eliminarEspecialidad(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* BOTÓN GUARDAR DISPONIBILIDAD ACADÉMICA */}
        {puedeModificar && (
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                variant="contained"
                size="large"
                color="success"
                startIcon={<SaveIcon />}
                onClick={guardarDisponibilidadAcademica}
                disabled={loading || obtenerHorariosCompletos().length === 0 || especialidadesSeleccionadas.length === 0}
                sx={{ 
                  minWidth: 250,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                {loading ? 'Guardando...' : 'Confirmar Disponibilidad'}
              </Button>
            </Box>
            
            {(obtenerHorariosCompletos().length === 0 || especialidadesSeleccionadas.length === 0) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Para continuar debe definir al menos un horario disponible y postular a una especialidad con cursos.
              </Alert>
            )}
          </Grid>
        )}
      </Grid>


    </Box>
  );
};

export default DisponibilidadAcademica;