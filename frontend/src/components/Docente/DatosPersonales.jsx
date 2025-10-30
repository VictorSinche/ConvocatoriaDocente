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
  Avatar,
  IconButton,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Swal from 'sweetalert2';

const DatosPersonales = ({ onValidChange = () => {}, onNext = null }) => {
  const { user } = useAuth();
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    fecha_nacimiento: '',
    genero: '',
    nacionalidad: 'Perú',
    direccion: '',
    telefono: '',
    email: '',
    cv_archivo: ''
  });

  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Cargar datos existentes al iniciar
  useEffect(() => {
    cargarDatosPersonales();
  }, []);

  // Validar formulario cuando cambian los datos
  useEffect(() => {
    const esValido = formData.nombres && formData.apellidos && formData.dni && 
                    formData.telefono && formData.email && formData.cv_archivo && 
                    formData.genero && formData.nacionalidad;
    onValidChange(esValido);
  }, [formData, onValidChange]);

  const cargarDatosPersonales = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost/ConvocaDocente/backend/api/perfil.php?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Mapear los datos de la base de datos al estado del formulario
        setFormData({
          nombres: data.data.nombres || '',
          apellidos: data.data.apellidos || '',
          dni: data.data.dni || '',
          fecha_nacimiento: data.data.fecha_nacimiento || '',
          genero: data.data.genero || '',
          nacionalidad: data.data.nacionalidad || 'Perú',
          direccion: data.data.direccion || '',
          telefono: data.data.telefono || '',
          email: data.data.email || '',
          cv_archivo: data.data.cv_archivo || ''
        });
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombres.trim()) newErrors.nombres = 'Nombres requeridos';
    if (!formData.apellidos.trim()) newErrors.apellidos = 'Apellidos requeridos';
    if (!formData.dni.trim()) newErrors.dni = 'DNI requerido';
    if (formData.dni && (formData.dni.length < 8 || formData.dni.length > 12)) {
      newErrors.dni = 'DNI debe tener entre 8 y 12 caracteres';
    }
    if (!formData.telefono.trim()) newErrors.telefono = 'Teléfono requerido';
    if (!formData.email.trim()) newErrors.email = 'Email requerido';
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email no válido';
    }
    if (!formData.genero) newErrors.genero = 'Género requerido';
    if (!formData.nacionalidad.trim()) newErrors.nacionalidad = 'Nacionalidad requerida';
    if (!formData.cv_archivo && !cvFile) newErrors.cv = 'CV requerido';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar archivo
    if (!file.type.includes('pdf')) {
      Swal.fire('Error', 'Solo se permiten archivos PDF', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      Swal.fire('Error', 'El archivo no puede superar 5MB', 'error');
      return;
    }

    // Guardar archivo para enviar al guardar
    setCvFile(file);
    
    // Mostrar preview temporal
    setFormData(prev => ({
      ...prev,
      cv_archivo: 'temporal_preview'
    }));
    
    Swal.fire({
      icon: 'success',
      title: 'CV seleccionado',
      text: 'Se guardará cuando haga clic en "Guardar Datos"',
      timer: 2000,
      showConfirmButton: false
    });
  };

  const handleDeleteCV = () => {
    const mensaje = formData.cv_archivo === 'temporal_preview' ? 
      'Se eliminará el archivo seleccionado' : 
      'Se eliminará el CV guardado (requiere guardar los datos)';
      
    Swal.fire({
      title: '¿Eliminar CV?',
      text: mensaje,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        setFormData(prev => ({
          ...prev,
          cv_archivo: ''
        }));
        setCvFile(null);
        // Reset file input
        const fileInput = document.getElementById('cv-upload');
        if (fileInput) fileInput.value = '';
        
        Swal.fire({
          icon: 'success',
          title: 'CV eliminado',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Swal.fire('Error', 'Complete todos los campos obligatorios', 'error');
      return;
    }

    // Verificar que tenemos el user.id
    if (!user || !user.id) {
      Swal.fire('Error', 'Usuario no identificado. Por favor, inicie sesión nuevamente.', 'error');
      return;
    }

    setLoading(true);

    try {
      const saveData = new FormData();
      saveData.append('action', 'guardar');
      saveData.append('user_id', user.id);
      saveData.append('nombres', formData.nombres);
      saveData.append('apellidos', formData.apellidos);
      saveData.append('dni', formData.dni);
      saveData.append('fecha_nacimiento', formData.fecha_nacimiento);
      saveData.append('genero', formData.genero);
      saveData.append('nacionalidad', formData.nacionalidad);
      saveData.append('direccion', formData.direccion);
      saveData.append('telefono', formData.telefono);
      saveData.append('email', formData.email);
      
      // Agregar archivo CV si fue seleccionado
      if (cvFile) {
        saveData.append('cv', cvFile);
      }

      const response = await fetch('http://localhost/ConvocaDocente/backend/api/perfil.php', {
        method: 'POST',
        body: saveData
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar el estado con los datos guardados
        if (data.cv_archivo) {
          setFormData(prev => ({
            ...prev,
            cv_archivo: data.cv_archivo
          }));
          setCvFile(null); // Limpiar el archivo temporal
        }
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos guardados correctamente!',
          text: 'Su información personal ha sido actualizada',
          timer: 2000,
          showConfirmButton: false
        }).then(() => {
          // Llamar a onNext solo si está definido
          if (onNext && typeof onNext === 'function') {
            onNext();
          }
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire('Error', 'Error al guardar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading mientras se cargan los datos
  if (loading && !formData.nombres && !formData.apellidos) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Cargando datos personales...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        2.1 Datos Personales
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Complete toda su información personal. Todos los campos marcados son obligatorios.
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Nombres y Apellidos */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nombres *"
              value={formData.nombres}
              onChange={(e) => handleInputChange('nombres', e.target.value)}
              error={!!errors.nombres}
              helperText={errors.nombres}
              placeholder="Ej: Juan Carlos"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Apellidos *"
              value={formData.apellidos}
              onChange={(e) => handleInputChange('apellidos', e.target.value)}
              error={!!errors.apellidos}
              helperText={errors.apellidos}
              placeholder="Ej: Pérez García"
            />
          </Grid>

          {/* DNI y Fecha de Nacimiento */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="DNI / Carné de Extranjería *"
              value={formData.dni}
              onChange={(e) => handleInputChange('dni', e.target.value)}
              error={!!errors.dni}
              helperText={errors.dni}
              placeholder="Ej: 12345678"
              inputProps={{ maxLength: 12 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Fecha de Nacimiento"
              type="date"
              value={formData.fecha_nacimiento}
              onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Género */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={!!errors.genero}>
              <InputLabel>Género *</InputLabel>
              <Select
                value={formData.genero}
                label="Género *"
                onChange={(e) => handleInputChange('genero', e.target.value)}
              >
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Femenino">Femenino</MenuItem>
              </Select>
              {errors.genero && (
                <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                  {errors.genero}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Nacionalidad */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nacionalidad *"
              value={formData.nacionalidad}
              onChange={(e) => handleInputChange('nacionalidad', e.target.value)}
              error={!!errors.nacionalidad}
              helperText={errors.nacionalidad}
              placeholder="Ej: Perú, Colombia, Argentina"
            />
          </Grid>

          {/* Teléfono */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Teléfono *"
              value={formData.telefono}
              onChange={(e) => handleInputChange('telefono', e.target.value)}
              error={!!errors.telefono}
              helperText={errors.telefono}
              placeholder="Ej: +51 987 654 321"
            />
          </Grid>

          {/* Correo Electrónico */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Correo Electrónico *"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email || "Puede ser diferente al correo de login"}
              type="email"
              placeholder="Ej: correo@dominio.com"
            />
          </Grid>

          {/* Dirección */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Dirección"
              value={formData.direccion}
              onChange={(e) => handleInputChange('direccion', e.target.value)}
              multiline
              rows={2}
              placeholder="Ej: Av. Principales 123, San Isidro, Lima"
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Sección CV */}
        <Typography variant="h6" gutterBottom>
          <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Curriculum Vitae (CV)
        </Typography>
        
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Sube tu CV en formato PDF (máximo 5MB)
        </Typography>

        <Box sx={{ mt: 2 }}>
          {formData.cv_archivo && formData.cv_archivo !== 'temporal_preview' ? (
            // CV guardado en servidor
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'success.light',
                color: 'success.contrastText'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    ✓ CV Guardado
                  </Typography>
                  <Typography variant="body2">
                    Archivo PDF listo para revisión
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                color="error" 
                onClick={handleDeleteCV}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
              >
                <DeleteIcon />
              </IconButton>
            </Paper>
          ) : cvFile || formData.cv_archivo === 'temporal_preview' ? (
            // CV seleccionado pero no guardado aún
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                bgcolor: 'warning.light',
                color: 'warning.contrastText'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                  <UploadIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    📎 CV Seleccionado: {cvFile?.name}
                  </Typography>
                  <Typography variant="body2">
                    Haga clic en "Guardar Datos" para subir el archivo
                  </Typography>
                </Box>
              </Box>
              <IconButton 
                color="error" 
                onClick={handleDeleteCV}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}
              >
                <DeleteIcon />
              </IconButton>
            </Paper>
          ) : (
            // Subir CV
            <Paper 
              variant="outlined" 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                border: '2px dashed',
                borderColor: errors.cv ? 'error.main' : 'grey.300',
                bgcolor: 'grey.50'
              }}
            >
              <input
                type="file"
                id="cv-upload"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <label htmlFor="cv-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<UploadIcon />}
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'Subiendo...' : 'Subir CV (PDF)'}
                </Button>
              </label>
              
              {errors.cv && (
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {errors.cv}
                </Typography>
              )}
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Solo archivos PDF, máximo 5MB
              </Typography>
            </Paper>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Botón Guardar */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{ minWidth: 200 }}
          >
            {loading ? 'Guardando...' : 'Guardar Datos Personales'}
          </Button>
        </Box>

        {/* Resumen de Validación */}
        <Box sx={{ mt: 3 }}>
          {formData.nombres && formData.apellidos && formData.dni && 
           formData.telefono && formData.email && formData.cv_archivo && 
           formData.genero && formData.nacionalidad ? (
            <Alert severity="success">
              ¡Datos personales completos! ✓
            </Alert>
          ) : (
            <Alert severity="warning">
              Complete todos los campos obligatorios (*) y suba su CV
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default DatosPersonales;
