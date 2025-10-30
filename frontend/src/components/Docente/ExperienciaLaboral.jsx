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
  CardActions,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Work as WorkIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

const ExperienciaLaboral = ({ onValidChange = () => {}, onNext = null }) => {
  const { user } = useAuth();
  
  // Estado para la lista de experiencias
  const [experiencias, setExperiencias] = useState([]);
  const [loading, setLoading] = useState(false);

  // Sectores laborales
  const sectores = [
    'Público',
    'Privado'
  ];

  // Cargar datos existentes al iniciar
  useEffect(() => {
    cargarExperienciaLaboral();
  }, []);

  // Validar formulario cuando cambian los datos
  useEffect(() => {
    const esValido = experiencias.length > 0 && 
      experiencias.every(exp => 
        exp.pais && exp.sector && exp.empresa && 
        exp.cargo && exp.fecha_inicio
      );
    onValidChange(esValido);
  }, [experiencias, onValidChange]);

  const cargarExperienciaLaboral = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/experiencia.php?user_id=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        // Limpiar valores null para evitar errores de React
        const experienciasLimpias = data.data.map(exp => ({
          ...exp,
          pais: exp.pais || '',
          sector: exp.sector || '',
          empresa: exp.empresa || '',
          ruc: exp.ruc || '',
          cargo: exp.cargo || '',
          fecha_inicio: exp.fecha_inicio || '',
          fecha_fin: exp.fecha_fin || '',
          actual: Boolean(exp.actual),
          constancia_archivo: exp.constancia_archivo || '',
          archivo_temporal: null
        }));
        setExperiencias(experienciasLimpias);
      } else {
        // Si no hay datos, agregar un registro vacío por defecto
        agregarNuevaExperiencia();
      }
    } catch (error) {
      console.error('Error al cargar experiencia laboral:', error);
      // En caso de error, agregar un registro vacío
      agregarNuevaExperiencia();
    } finally {
      setLoading(false);
    }
  };

  const agregarNuevaExperiencia = () => {
    const nuevaExperiencia = {
      // NO incluir ID para registros nuevos
      pais: 'Perú',
      sector: '',
      empresa: '',
      ruc: '',
      cargo: '',
      fecha_inicio: '',
      fecha_fin: '',
      actual: false,
      constancia_archivo: '',
      archivo_temporal: null
    };
    setExperiencias(prev => [...prev, nuevaExperiencia]);
  };

  const eliminarExperiencia = async (index) => {
    if (experiencias.length === 1) {
      Swal.fire('Advertencia', 'Debe tener al menos una experiencia laboral', 'warning');
      return;
    }

    const experiencia = experiencias[index];
    
    Swal.fire({
      title: '¿Eliminar experiencia?',
      text: 'Esta acción eliminará el registro y la constancia asociada. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Si tiene ID (está guardado en BD), eliminar del servidor
        if (experiencia.id) {
          try {
            const response = await fetch('http://localhost/ConvocaDocente/backend/api/experiencia.php', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `id=${experiencia.id}&user_id=${user.id}`
            });

            const data = await response.json();
            
            if (!data.success) {
              throw new Error(data.message);
            }

            Swal.fire('¡Eliminado!', 'La experiencia y constancia han sido eliminadas correctamente', 'success');
          } catch (error) {
            console.error('Error al eliminar:', error);
            Swal.fire('Error', 'Error al eliminar: ' + error.message, 'error');
            return; // No eliminar del estado si falló en servidor
          }
        }
        
        // Eliminar del estado local
        setExperiencias(prev => prev.filter((_, i) => i !== index));
      }
    });
  };

  const actualizarExperiencia = (index, campo, valor) => {
    setExperiencias(prev => {
      const nuevas = [...prev];
      nuevas[index] = { ...nuevas[index], [campo]: valor };
      
      // Si marca como actual, limpiar fecha fin
      if (campo === 'actual' && valor === true) {
        nuevas[index].fecha_fin = '';
      }
      
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

    // CORREGIDO: Marcar archivo como temporal con nombre único por experiencia
    const nombreTemporal = `experiencia_${index + 1}_preview`;
    actualizarExperiencia(index, 'constancia_archivo', nombreTemporal);
    actualizarExperiencia(index, 'archivo_temporal', file);

    Swal.fire({
      icon: 'success',
      title: 'Documento seleccionado',
      text: 'El archivo se guardará al completar el formulario',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const validarFormulario = () => {
    if (experiencias.length === 0) {
      Swal.fire('Error', 'Debe agregar al menos una experiencia laboral', 'error');
      return false;
    }

    for (let i = 0; i < experiencias.length; i++) {
      const exp = experiencias[i];
      if (!exp.pais || !exp.sector || !exp.empresa || !exp.cargo || !exp.fecha_inicio) {
        Swal.fire('Error', 'Por favor complete todos los campos obligatorios', 'error');
        return false;
      }

      // Validar RUC si se proporciona (11 dígitos)
      if (exp.ruc && exp.ruc.length !== 11) {
        Swal.fire('Error', 'El RUC debe tener exactamente 11 dígitos', 'error');
        return false;
      }

      // Validar formato y validez de fecha de inicio
      if (exp.fecha_inicio) {
        const fechaInicio = new Date(exp.fecha_inicio);
        const fechaActual = new Date();
        
        if (isNaN(fechaInicio.getTime())) {
          Swal.fire('Error', 'Por favor ingrese una fecha de inicio válida', 'error');
          return false;
        }
        
        // No permitir fechas futuras
        if (fechaInicio > fechaActual) {
          Swal.fire('Error', 'La fecha de inicio no puede ser futura', 'error');
          return false;
        }
      }

      // Validar que tenga fecha de fin O esté marcado como trabajo actual
      if (!exp.actual && !exp.fecha_fin) {
        Swal.fire('Error', 'Debe especificar la fecha de fin o marcar como "Trabajo actual"', 'error');
        return false;
      }

      // Validar formato y validez de fecha de fin
      if (exp.fecha_fin) {
        const fechaFin = new Date(exp.fecha_fin);
        const fechaActual = new Date();
        
        if (isNaN(fechaFin.getTime())) {
          Swal.fire('Error', 'Por favor ingrese una fecha de fin válida', 'error');
          return false;
        }
        
        // No permitir fechas futuras
        if (fechaFin > fechaActual) {
          Swal.fire('Error', 'La fecha de fin no puede ser futura', 'error');
          return false;
        }
      }

      // Validar fechas (fecha fin posterior a fecha inicio)
      if (exp.fecha_fin && !exp.actual && exp.fecha_inicio && exp.fecha_fin < exp.fecha_inicio) {
        Swal.fire('Error', 'La fecha de fin debe ser posterior a la fecha de inicio', 'error');
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
      // CORREGIDO: Guardar cada experiencia individualmente SIN eliminar las anteriores
      for (let i = 0; i < experiencias.length; i++) {
        const experiencia = experiencias[i];
        
        const formData = new FormData();
        formData.append('user_id', user.id);
        formData.append('pais', experiencia.pais);
        formData.append('sector', experiencia.sector);
        formData.append('empresa', experiencia.empresa);
        formData.append('ruc', experiencia.ruc || '');
        formData.append('cargo', experiencia.cargo);
        formData.append('fecha_inicio', experiencia.fecha_inicio);
        formData.append('fecha_fin', experiencia.fecha_fin || '');
        formData.append('actual', experiencia.actual ? '1' : '0');
        
        // CORREGIDO: Solo subir archivo si hay uno temporal (nuevo archivo seleccionado)
        if (experiencia.archivo_temporal) {
          formData.append('constancia', experiencia.archivo_temporal);
        }
        
        // CORREGIDO: Solo enviar ID si existe Y es un número válido
        if (experiencia.id && experiencia.id > 0 && Number.isInteger(experiencia.id)) {
          formData.append('id', experiencia.id);
        }
        
        const response = await fetch('http://localhost/ConvocaDocente/backend/api/experiencia.php', {
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
          throw new Error('Respuesta del servidor no es JSON válido: ' + responseText);
        }

        if (!data.success) {
          throw new Error(data.message || 'Error al guardar la información');
        }
        
        // CORREGIDO: Actualizar estado local con los datos guardados
        setExperiencias(prev => {
          const nuevas = [...prev];
          
          // Asignar el ID devuelto (tanto para nuevas como actualizaciones)
          if (data.data && data.data.id) {
            nuevas[i] = { ...nuevas[i], id: data.data.id };
          }
          
          // Limpiar archivo temporal después de guardar exitosamente
          if (nuevas[i].archivo_temporal) {
            nuevas[i] = { 
              ...nuevas[i], 
              archivo_temporal: null,
              constancia_archivo: nuevas[i].constancia_archivo.includes('preview') ? 
                `constancia_guardada_${Date.now()}.pdf` : nuevas[i].constancia_archivo
            };
          }
          
          return nuevas;
        });
      }

      Swal.fire({
        icon: 'success',
        title: '¡Información guardada!',
        text: 'Su experiencia laboral ha sido registrada exitosamente',
        timer: 2000,
        showConfirmButton: false
      }).then(() => {
        // Recargar datos para mostrar los archivos guardados correctamente
        cargarExperienciaLaboral();
        if (onNext && typeof onNext === 'function') {
          onNext();
        }
      });

    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'Error al guardar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se cargan los datos
  if (loading && experiencias.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Cargando experiencia laboral...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        2.3 Experiencia Laboral
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Registre su historial profesional. Agregue tantas experiencias como considere relevantes.
      </Alert>

      <Stack spacing={3}>
        {experiencias.map((experiencia, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Experiencia Laboral {index + 1}
                {experiencias.length > 1 && (
                  <IconButton 
                    color="error" 
                    onClick={() => eliminarExperiencia(index)}
                    sx={{ float: 'right' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Typography>

              <Grid container spacing={2}>
                {/* País */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="País"
                    value={experiencia.pais}
                    onChange={(e) => actualizarExperiencia(index, 'pais', e.target.value)}
                  />
                </Grid>

                {/* Sector */}
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Sector</InputLabel>
                    <Select
                      value={experiencia.sector}
                      onChange={(e) => actualizarExperiencia(index, 'sector', e.target.value)}
                      label="Sector"
                    >
                      {sectores.map(sector => (
                        <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Institución */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    required
                    label="Institución/Empresa"
                    value={experiencia.empresa}
                    onChange={(e) => actualizarExperiencia(index, 'empresa', e.target.value)}
                    placeholder="Nombre de la empresa u organización"
                  />
                </Grid>

                {/* RUC */}
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="RUC (Opcional)"
                    value={experiencia.ruc}
                    onChange={(e) => actualizarExperiencia(index, 'ruc', e.target.value)}
                    placeholder="12345678901"
                    inputProps={{ maxLength: 11 }}
                    helperText="Solo números, 11 dígitos"
                  />
                </Grid>

                {/* Cargo */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    required
                    label="Cargo/Puesto"
                    value={experiencia.cargo}
                    onChange={(e) => actualizarExperiencia(index, 'cargo', e.target.value)}
                    placeholder="Título del cargo desempeñado"
                  />
                </Grid>

                {/* Fecha de Inicio */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Fecha de Inicio"
                    value={experiencia.fecha_inicio}
                    onChange={(e) => actualizarExperiencia(index, 'fecha_inicio', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>

                {/* Checkbox Actual */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={experiencia.actual}
                          onChange={(e) => actualizarExperiencia(index, 'actual', e.target.checked)}
                        />
                      }
                      label="Trabajo actual"
                    />
                  </Box>
                </Grid>

                {/* Fecha de Fin */}
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha de Fin"
                    value={experiencia.fecha_fin}
                    onChange={(e) => actualizarExperiencia(index, 'fecha_fin', e.target.value)}
                    disabled={experiencia.actual}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    helperText={experiencia.actual ? 'Desmarque "Trabajo actual" para habilitar' : ''}
                  />
                </Grid>

                {/* Subida de Constancia */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      sx={{ flex: 1 }}
                    >
                      {experiencia.constancia_archivo ? 
                        'Cambiar Constancia Laboral' : 
                        'Subir Constancia Laboral PDF (Opcional)'
                      }
                      <input
                        type="file"
                        hidden
                        accept=".pdf"
                        onChange={(e) => manejarSubidaArchivo(index, e)}
                      />
                    </Button>
                    {experiencia.constancia_archivo && (
                      <DocumentIcon color="success" />
                    )}
                  </Box>
                  {experiencia.constancia_archivo && (
                    <Typography variant="caption" color={experiencia.constancia_archivo.includes('preview') ? 'warning.main' : 'success.main'}>
                      {experiencia.constancia_archivo.includes('preview') ? 
                        '📎 Documento seleccionado' : 
                        '✓ Constancia guardada'
                      }
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        {/* Botón para agregar nueva experiencia */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={agregarNuevaExperiencia}
            sx={{ mb: 2 }}
          >
            Agregar Nueva Experiencia
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
            {loading ? 'Guardando...' : 'Guardar Experiencia Laboral'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ExperienciaLaboral;
