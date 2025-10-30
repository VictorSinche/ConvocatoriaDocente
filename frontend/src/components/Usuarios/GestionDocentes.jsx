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
  Person as PersonIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { usuariosAPI } from '../../services/api';

function GestionDocentes() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rol: 'docente',
    estado: 'activo'
  });

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    setLoading(true);
    try {
      const response = await usuariosAPI.getAll();
      if (response.success) {
        // Filtrar solo docentes
        const docentes = response.data.filter(user => user.rol === 'docente');
        setUsuarios(docentes);
      } else {
        toast.error(response.message || 'Error al cargar docentes');
      }
    } catch (error) {
      console.error('Error cargando docentes:', error);
      toast.error('Error al cargar los docentes');
      // Fallback a datos de ejemplo
      setUsuarios([
        {
          id: 4,
          email: 'docente1@uma.edu.pe',
          rol: 'docente',
          estado: 'activo',
          fecha_registro: '2024-03-01'
        },
        {
          id: 5,
          email: 'docente2@uma.edu.pe',
          rol: 'docente',
          estado: 'activo',
          fecha_registro: '2024-03-15'
        }
      ]);
    } finally {
      setLoading(false);
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
        rol: 'docente',
        estado: 'activo'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      rol: 'docente',
      estado: 'activo'
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.email) {
        toast.error('El email es requerido');
        return;
      }
      
      if (!selectedUser && !formData.password) {
        toast.error('La contraseña es requerida para nuevos docentes');
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
          (selectedUser ? 'Docente actualizado correctamente' : 'Docente creado correctamente')
        );
        handleCloseDialog();
        loadUsuarios();
      } else {
        toast.error(response.message || 'Error al guardar el docente');
      }
    } catch (error) {
      console.error('Error guardando docente:', error);
      toast.error('Error al guardar el docente');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este docente? Esta acción también eliminará su perfil asociado.')) {
      try {
        const response = await usuariosAPI.delete(userId);
        if (response.success) {
          toast.success(response.message || 'Docente eliminado correctamente');
          loadUsuarios();
        } else {
          toast.error(response.message || 'Error al eliminar el docente');
        }
      } catch (error) {
        console.error('Error eliminando docente:', error);
        toast.error('Error al eliminar el docente');
      }
    }
  };

  const handleViewProfile = (usuario) => {
    toast.info(`Ver perfil de ${usuario.email} - Funcionalidad próximamente`);
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
                🎓 Gestión de Docentes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Docentes postulantes del sistema ConvocaDocente
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
                Nuevo Docente
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Alert info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>👨‍🏫 Docentes:</strong> Gestiona usuarios docentes que pueden postular a convocatorias y completar sus perfiles académicos.
        </Typography>
      </Alert>

      {/* Tabla de docentes */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell><strong>Nombres</strong></TableCell>
                <TableCell><strong>Apellidos</strong></TableCell>
                <TableCell><strong>DNI</strong></TableCell>
                <TableCell><strong>Teléfono</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <SchoolIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="h6" color="text.secondary">
                        No hay docentes registrados
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Crea el primer docente del sistema
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="500">
                        {usuario.nombres || 'Sin completar'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {usuario.apellidos || 'Sin completar'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {usuario.dni || 'Sin completar'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {usuario.telefono || 'Sin completar'}
                      </Typography>
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
                      <Tooltip title="Eliminar">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(usuario.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog para crear/editar docente */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle>
          {selectedUser ? 'Editar Docente' : 'Nuevo Docente'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Email del Docente"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              helperText="Este será el email de acceso del docente"
            />

            <TextField
              label={selectedUser ? "Nueva Contraseña (opcional)" : "Contraseña"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required={!selectedUser}
              helperText={selectedUser ? "Dejar vacío para mantener la contraseña actual" : "Contraseña inicial del docente"}
            />

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

            <Alert severity="info">
              <Typography variant="body2">
                <strong>📝 Nota:</strong> Una vez creado, el docente podrá acceder al sistema y completar su perfil académico.
              </Typography>
            </Alert>
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
            {selectedUser ? 'Actualizar' : 'Crear Docente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default GestionDocentes;
