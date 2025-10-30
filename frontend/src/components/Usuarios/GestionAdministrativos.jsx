import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  School as SchoolIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { usuariosAPI } from '../../services/api';

function GestionAdministrativos() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [facultades, setFacultades] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rol: 'administrador',
    estado: 'activo'
  });
  const [assignData, setAssignData] = useState({
    facultad_id: '',
    especialidad_id: ''
  });

  useEffect(() => {
    loadUsuarios();
    loadFacultades();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const response = await usuariosAPI.getAll();
      if (response.success) {
        // Filtrar solo usuarios administrativos
        const administrativos = response.data.filter(user => 
          ['administrador', 'decano', 'director'].includes(user.rol)
        );
        setUsuarios(administrativos);
      } else {
        toast.error(response.message || 'Error al cargar usuarios');
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast.error('Error al cargar los usuarios');
      // Fallback a datos de ejemplo
      setUsuarios([
        {
          id: 1,
          email: 'admin@uma.edu.pe',
          rol: 'administrador',
          estado: 'activo',
          fecha_registro: '2024-01-15'
        },
        {
          id: 2,
          email: 'decano.ingenieria@uma.edu.pe',
          rol: 'decano',
          estado: 'activo',
          fecha_registro: '2024-02-01'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadFacultades = async () => {
    try {
      const response = await usuariosAPI.getFacultades();
      if (response.success) {
        setFacultades(response.data || []);
      }
    } catch (error) {
      console.error('Error cargando facultades:', error);
    }
  };

  const loadEspecialidades = async (facultadId) => {
    try {
      const response = await usuariosAPI.getEspecialidades(facultadId);
      if (response.success) {
        setEspecialidades(response.data || []);
      }
    } catch (error) {
      console.error('Error cargando especialidades:', error);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        password: '',
        rol: user.rol,
        estado: user.estado
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: '',
        password: '',
        rol: 'administrador',
        estado: 'activo'
      });
    }
    setDialogOpen(true);
  };

  const handleOpenAssignDialog = (user) => {
    setSelectedUser(user);
    setAssignData({
      facultad_id: '',
      especialidad_id: ''
    });
    setAssignDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      rol: 'administrador',
      estado: 'activo'
    });
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setSelectedUser(null);
    setAssignData({
      facultad_id: '',
      especialidad_id: ''
    });
    setEspecialidades([]);
  };

  const handleSave = async () => {
    try {
      if (!formData.email) {
        toast.error('El email es requerido');
        return;
      }
      
      if (!selectedUser && !formData.password) {
        toast.error('La contraseña es requerida para nuevos usuarios');
        return;
      }

      let response;
      if (selectedUser) {
        response = await usuariosAPI.update(selectedUser.id, {
          email: formData.email,
          rol: formData.rol,
          estado: formData.estado,
          ...(formData.password && { password: formData.password })
        });
      } else {
        response = await usuariosAPI.create({
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          estado: formData.estado
        });
      }

      if (response.success) {
        toast.success(response.message || 
          (selectedUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
        );
        handleCloseDialog();
        loadUsuarios();
      } else {
        toast.error(response.message || 'Error al guardar el usuario');
      }
    } catch (error) {
      console.error('Error guardando usuario:', error);
      toast.error('Error al guardar el usuario');
    }
  };

  const handleDelete = async (userId) => {
    // PROTECCIÓN: Verificar si es administrador
    const usuario = usuarios.find(u => u.id === userId);
    if (usuario?.rol === 'administrador') {
      toast.error('❌ No se puede eliminar el usuario administrador');
      return;
    }

    if (window.confirm('¿Está seguro de que desea eliminar este usuario administrativo?')) {
      try {
        const response = await usuariosAPI.delete(userId);
        if (response.success) {
          toast.success(response.message || 'Usuario eliminado correctamente');
          loadUsuarios();
        } else {
          toast.error(response.message || 'Error al eliminar el usuario');
        }
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        toast.error('Error al eliminar el usuario');
      }
    }
  };

  const handleAssignFacultad = async () => {
    try {
      if (!assignData.facultad_id) {
        toast.error('Debe seleccionar una facultad');
        return;
      }

      const response = await usuariosAPI.assignFacultadEspecialidad(
        selectedUser.id,
        assignData.facultad_id,
        assignData.especialidad_id || null
      );

      if (response.success) {
        toast.success('Asignación realizada correctamente');
        handleCloseAssignDialog();
        loadUsuarios();
      } else {
        toast.error(response.message || 'Error en la asignación');
      }
    } catch (error) {
      console.error('Error asignando facultad:', error);
      toast.error('Error al realizar la asignación');
    }
  };

  const getRoleIcon = (rol) => {
    switch (rol) {
      case 'administrador': return <AdminIcon />;
      case 'decano': return <BusinessIcon />;
      case 'director': return <SchoolIcon />;
      default: return <AdminIcon />;
    }
  };

  const getRoleColor = (rol) => {
    switch (rol) {
      case 'administrador': return 'error';
      case 'decano': return 'warning';
      case 'director': return 'info';
      default: return 'error';
    }
  };

  const getRoleLabel = (rol) => {
    switch (rol) {
      case 'administrador': return 'Administrador';
      case 'decano': return 'Decano';
      case 'director': return 'Director';
      default: return 'Administrador';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                👥 Gestión de Usuarios Administrativos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Administradores, Decanos y Directores
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Actualizar lista">
                <IconButton onClick={loadUsuarios}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{ borderRadius: 2 }}
              >
                Nuevo Administrativo
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabla de usuarios administrativos */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell><strong>Usuario</strong></TableCell>
                <TableCell><strong>Rol</strong></TableCell>
                <TableCell><strong>Facultad/Especialidad</strong></TableCell>
                <TableCell><strong>Estado</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <AdminIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary">
                        No hay usuarios administrativos
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Crea el primer usuario administrativo del sistema
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getRoleIcon(usuario.rol)}
                        <Typography variant="body2" fontWeight="500">
                          {usuario.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(usuario.rol)}
                        color={getRoleColor(usuario.rol)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {usuario.rol === 'administrador' ? (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      ) : usuario.rol === 'decano' ? (
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {usuario.nombre_facultad || 'Sin asignar'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Facultad
                          </Typography>
                        </Box>
                      ) : usuario.rol === 'director' ? (
                        <Box>
                          <Typography variant="body2" fontWeight="500">
                            {usuario.nombre_especialidad || 'Sin asignar'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Especialidad
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={usuario.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        color={usuario.estado === 'activo' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(usuario)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {/* Botón de asignación para decanos y directores */}
                      {(usuario.rol === 'decano' || usuario.rol === 'director') && (
                        <Tooltip title="Asignar Facultad/Especialidad">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenAssignDialog(usuario)}
                            sx={{ mr: 1 }}
                            color="primary"
                          >
                            <BusinessIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* PROTEGER ADMINISTRADOR: No se puede eliminar */}
                      {usuario.rol !== 'administrador' ? (
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(usuario.id)}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="El administrador no se puede eliminar">
                          <span>
                            <IconButton
                              size="small"
                              disabled
                              sx={{ color: 'text.disabled' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog para crear/editar usuario administrativo */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          {selectedUser ? 'Editar Usuario Administrativo' : 'Nuevo Usuario Administrativo'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label={selectedUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required={!selectedUser}
              helperText={selectedUser ? "Dejar vacío para mantener la contraseña actual" : ""}
            />
            
            <TextField
              label="Rol Administrativo"
              select
              value={formData.rol}
              onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="administrador">Administrador</MenuItem>
              <MenuItem value="decano">Decano</MenuItem>
              <MenuItem value="director">Director</MenuItem>
            </TextField>

            <TextField
              label="Estado"
              select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="activo">Activo</MenuItem>
              <MenuItem value="inactivo">Inactivo</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.email}
          >
            {selectedUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para asignar facultad/especialidad */}
      <Dialog
        open={assignDialogOpen}
        onClose={handleCloseAssignDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          Asignar Facultad/Especialidad
          {selectedUser && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Usuario: {selectedUser.email} ({getRoleLabel(selectedUser.rol)})
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Facultad"
              select
              value={assignData.facultad_id}
              onChange={(e) => {
                setAssignData({ ...assignData, facultad_id: e.target.value, especialidad_id: '' });
                loadEspecialidades(e.target.value);
              }}
              fullWidth
              required
            >
              <MenuItem value="">Seleccionar facultad...</MenuItem>
              {facultades.map((facultad) => (
                <MenuItem key={facultad.id} value={facultad.id}>
                  {facultad.nombre}
                </MenuItem>
              ))}
            </TextField>

            {assignData.facultad_id && (
              <TextField
                label="Especialidad (opcional)"
                select
                value={assignData.especialidad_id}
                onChange={(e) => setAssignData({ ...assignData, especialidad_id: e.target.value })}
                fullWidth
              >
                <MenuItem value="">Sin especialidad específica</MenuItem>
                {especialidades.map((especialidad) => (
                  <MenuItem key={especialidad.id} value={especialidad.id}>
                    {especialidad.nombre}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Nota:</strong> Esta asignación determinará a qué facultad y especialidad 
                tiene acceso este {selectedUser?.rol === 'decano' ? 'decano' : 'director'}.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseAssignDialog}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAssignFacultad}
            disabled={!assignData.facultad_id}
          >
            Asignar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionAdministrativos;
