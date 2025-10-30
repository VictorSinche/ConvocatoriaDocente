import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Paper,
  Stack,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  School as SchoolIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

const FormacionAcademica = ({ onValidChange = () => {}, onNext = null }) => {
  const { user } = useAuth();
  
  // Estado para la lista de formaciones
  const [formaciones, setFormaciones] = useState([]);
  const [loading, setLoading] = useState(false);

  // Tipos de formación académica
  const tiposFormacion = [
    'Bachiller',
    'Título Profesional', 
    'Maestría',
    'Doctorado',
    'Diplomado',
    'Especialización',
    'Certificación Profesional',
    'Curso de Actualización'
  ];

  // Cargar datos existentes al iniciar
  useEffect(() => {
    cargarFormacionAcademica();
  }, []);

  // Validar formulario cuando cambian los datos
  useEffect(() => {
    const esValido = formaciones.length > 0 && 
                    formaciones.every(f => 
                      f.tipo && f.especialidad && f.institucion && 
                      f.pais && f.documento_archivo
                    );
    onValidChange(esValido);
  }, [formaciones, onValidChange]);

  const cargarFormacionAcademica = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/formacion.php?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        setFormaciones(data.data);
      } else {
        // Si no hay datos, agregar un registro vacío por defecto
        agregarNuevaFormacion();
      }
    } catch (error) {
      console.error('Error al cargar formación académica:', error);
      // En caso de error, agregar un registro vacío
      agregarNuevaFormacion();
    } finally {
      setLoading(false);
    }
  };

  const agregarNuevaFormacion = () => {
    const nuevaFormacion = {
      id: null,
      tipo: '',
      especialidad: '',
      institucion: '',
      pais: 'Perú',
      fecha_obtencion: '',
      documento_archivo: '',
      archivo_temporal: null
    };
    setFormaciones(prev => [...prev, nuevaFormacion]);
  };

  const eliminarFormacion = async (index) => {
    if (formaciones.length === 1) {
      Swal.fire('Advertencia', 'Debe tener al menos un registro de formación académica', 'warning');
      return;
    }

    const formacion = formaciones[index];
    
    Swal.fire({
      title: '¿Eliminar registro?',
      text: 'Esta acción eliminará el registro y el documento asociado. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Si tiene ID (está guardado en BD), eliminar del servidor
        if (formacion.id) {
          try {
            const response = await fetch('http://localhost/ConvocaDocente/backend/api/formacion.php', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `id=${formacion.id}&user_id=${user.id}`
            });

            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.message);
            }

            Swal.fire('¡Eliminado!', 'El registro ha sido eliminado exitosamente', 'success');
          } catch (error) {
            console.error('Error al eliminar:', error);
            Swal.fire('Error', 'No se pudo eliminar el registro. Por favor intente nuevamente.', 'error');
            return; // No eliminar del estado si falló en servidor
          }
        }
        
        // Eliminar del estado local
        setFormaciones(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const actualizarFormacion = (index, campo, valor) => {
    setFormaciones(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], [campo]: valor };
      return nuevas;
    });
  };

  const manejarSubidaArchivo = (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar archivo PDF
    if (!file.type.includes('pdf')) {
      Swal.fire('Error', 'Solo se permiten archivos PDF', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      Swal.fire('Error', 'El archivo no puede superar 5MB', 'error');
      return;
    }

    // Marcar archivo como temporal para subir al guardar
    actualizarFormacion(index, 'documento_archivo', 'temporal_preview');
    actualizarFormacion(index, 'archivo_temporal', file);

    Swal.fire({
      icon: 'success',
      title: 'Documento seleccionado',
      text: 'Se guardará cuando haga clic en "Guardar Formación"',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const validarFormulario = () => {
    for (let i = 0; i < formaciones.length; i++) {
      const formacion = formaciones[i];
      if (!formacion.tipo || !formacion.especialidad || !formacion.institucion || 
          !formacion.pais || !formacion.documento_archivo) {
        Swal.fire('Información requerida', 'Por favor complete todos los campos obligatorios y adjunte el documento correspondiente', 'warning');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);

    try {
      // Guardar cada formación por separado
      for (let i = 0; i < formaciones.length; i++) {
        const formacion = formaciones[i];
        
        const formData = new FormData();
        formData.append('user_id', user.id);
        formData.append('tipo', formacion.tipo);
        formData.append('especialidad', formacion.especialidad);
        formData.append('institucion', formacion.institucion);
        formData.append('pais', formacion.pais);
        formData.append('fecha_obtencion', formacion.fecha_obtencion);
        
        if (formacion.archivo_temporal) {
          formData.append('documento', formacion.archivo_temporal);
        }
        
        if (formacion.id) {
          formData.append('id', formacion.id);
        }

        const response = await fetch('http://localhost/ConvocaDocente/backend/api/formacion.php', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          throw new Error('Error en la comunicación con el servidor');
        }

        if (!data.success) {
          throw new Error(data.message || 'Error al procesar la información académica');
        }
      }

      Swal.fire({
        icon: 'success',
        title: '¡Información registrada!',
        text: 'Su formación académica ha sido registrada exitosamente',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        // Recargar datos para mostrar los IDs actualizados
        cargarFormacionAcademica();
        
        if (onNext && typeof onNext === 'function') {
          onNext();
        }
      });

    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error en el proceso', 'Ocurrió un problema al registrar su información. Por favor intente nuevamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se cargan los datos
  if (loading && formaciones.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Cargando formación académica...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        2.2 Formación Académica
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Registre todos sus títulos, grados y certificaciones. Cada registro debe incluir el documento PDF correspondiente.
      </Alert>

      <Stack spacing={3}>
        {formaciones.map((formacion, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Registro de Formación
                {formaciones.length > 1 && (
                  <IconButton 
                    color="error" 
                    onClick={() => eliminarFormacion(index)}
                    sx={{ float: 'right' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Typography>

              <Grid container spacing={2}>
                {/* Tipo de Formación */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Tipo de Formación</InputLabel>
                    <Select
                      value={formacion.tipo}
                      onChange={(e) => actualizarFormacion(index, 'tipo', e.target.value)}
                      label="Tipo de Formación"
                    >
                      {tiposFormacion.map(tipo => (
                        <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Especialidad */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Especialidad/Carrera"
                    value={formacion.especialidad}
                    onChange={(e) => actualizarFormacion(index, 'especialidad', e.target.value)}
                    placeholder="Ej: Administración de Empresas"
                  />
                </Grid>

                {/* Institución */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Institución"
                    value={formacion.institucion}
                    onChange={(e) => actualizarFormacion(index, 'institucion', e.target.value)}
                    placeholder="Nombre de la universidad o institución"
                  />
                </Grid>

                {/* País */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="País"
                    value={formacion.pais}
                    onChange={(e) => actualizarFormacion(index, 'pais', e.target.value)}
                    placeholder="País donde obtuvo el título"
                  />
                </Grid>

                {/* Fecha de Obtención */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha de Obtención"
                    value={formacion.fecha_obtencion}
                    onChange={(e) => actualizarFormacion(index, 'fecha_obtencion', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                {/* Subida de Documento */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      sx={{ flex: 1 }}
                    >
                      {formacion.documento_archivo ? 'Cambiar Documento' : 'Subir Documento PDF'}
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => manejarSubidaArchivo(index, e)}
                      />
                    </Button>
                    {formacion.documento_archivo && (
                      <DocumentIcon color="success" />
                    )}
                  </Box>
                  {formacion.documento_archivo && (
                    <Typography variant="caption" color={formacion.documento_archivo === 'temporal_preview' ? 'warning.main' : 'success.main'}>
                      {formacion.documento_archivo === 'temporal_preview' ? 
                        '📎 Documento seleccionado (pendiente de guardar)' : 
                        '✓ Documento guardado'
                      }
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {/* Botón para agregar nueva formación */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={agregarNuevaFormacion}
            sx={{ mb: 2 }}
          >
            Agregar Nueva Formación
          </Button>
        </Box>

        <Divider />

        {/* Botón de guardar */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{ px: 4 }}
          >
            {loading ? 'Guardando...' : 'Guardar Formación Académica'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default FormacionAcademica;
