import React, { useState, useEffect, useContext } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    IconButton,
    Tooltip,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField
} from '@mui/material';
import {
    School as SchoolIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const GestionCursos = () => {
    const { user } = useAuth(); 
    const [cursos, setCursos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedCurso, setSelectedCurso] = useState(null);
    const [detalleDialog, setDetalleDialog] = useState(false);

    // Cargar cursos de la especialidad del director
    useEffect(() => {
        if (user && user.rol === 'director' && user.cod_esp) {
            cargarCursos();
        }
    }, [user]);

    const cargarCursos = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `http://localhost/ConvocaDocente/backend/api/cursos.php?action=cursos&rol=director&cod_esp=${user.cod_esp}&user_id=${user.id}`
            );
            const data = await response.json();
            
            if (data.success) {
                setCursos(data.data);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error cargando cursos:', error);
            toast.error('Error al cargar cursos');
        } finally {
            setLoading(false);
        }
    };

    // Cambiar estado del curso (habilitar/deshabilitar)
    const cambiarEstadoCurso = async (cursoId, nuevoEstado) => {
        try {
            const response = await fetch('http://localhost/ConvocaDocente/backend/api/cursos.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: cursoId,
                    estado: nuevoEstado,
                    user_id: user.id,
                    rol: user.rol,
                    cod_esp: user.cod_esp
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(data.message);
                cargarCursos();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error cambiando estado:', error);
            toast.error('Error al cambiar estado del curso');
        }
    };

    // Ver detalle del curso
    const verDetalleCurso = (curso) => {
        setSelectedCurso(curso);
        setDetalleDialog(true);
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* HEADER */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <SchoolIcon sx={{ color: '#e50a5e', fontSize: 32 }} />
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Gestión de Cursos
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Especialidad: {user?.nom_esp || 'No definida'}
                    </Typography>
                </Box>
            </Box>


            {/* TABLA DE CURSOS */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Cursos de {user?.nom_esp}
                    </Typography>
                    
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Código</strong></TableCell>
                                    <TableCell><strong>Nombre del Curso</strong></TableCell>
                                    <TableCell><strong>Ciclo</strong></TableCell>
                                    <TableCell><strong>Modalidad</strong></TableCell>
                                    <TableCell><strong>Estado</strong></TableCell>
                                    <TableCell><strong>Acciones</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            Cargando cursos...
                                        </TableCell>
                                    </TableRow>
                                ) : cursos.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            No hay cursos disponibles para esta especialidad
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    cursos.map((curso) => (
                                        <TableRow key={curso.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {curso.c_codcur}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {curso.c_nomcur}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip 
                                                    label={`Ciclo ${curso.n_ciclo}`}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {curso.modalidad || 'Presencial'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={curso.estado === 1 ? 'Habilitado' : 'Deshabilitado'}
                                                    color={curso.estado === 1 ? 'success' : 'default'}
                                                    icon={curso.estado === 1 ? <CheckCircleIcon /> : <CancelIcon />}
                                                />
                                            </TableCell>

                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="Ver Detalle">
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            onClick={() => verDetalleCurso(curso)}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    
                                                    <Button
                                                        variant="contained"
                                                        color={curso.estado === 1 ? 'error' : 'success'}
                                                        size="small"
                                                        onClick={() => cambiarEstadoCurso(curso.id, curso.estado === 1 ? 0 : 1)}
                                                        startIcon={curso.estado === 1 ? <CancelIcon /> : <CheckCircleIcon />}
                                                    >
                                                        {curso.estado === 1 ? 'Deshabilitar' : 'Habilitar'}
                                                    </Button>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* DIALOG: DETALLE DEL CURSO */}
            <Dialog 
                open={detalleDialog} 
                onClose={() => setDetalleDialog(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SchoolIcon sx={{ color: '#e50a5e' }} />
                        Detalle del Curso
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedCurso && (
                        <Box sx={{ pt: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField
                                    label="Código del Curso"
                                    value={selectedCurso.c_codcur}
                                    InputProps={{ readOnly: true }}
                                    fullWidth
                                />
                                <TextField
                                    label="Nombre del Curso"
                                    value={selectedCurso.c_nomcur}
                                    InputProps={{ readOnly: true }}
                                    fullWidth
                                />
                                <TextField
                                    label="Ciclo"
                                    value={selectedCurso.n_ciclo}
                                    InputProps={{ readOnly: true }}
                                />
                                <TextField
                                    label="Modalidad"
                                    value={selectedCurso.modalidad || 'Presencial'}
                                    InputProps={{ readOnly: true }}
                                />
                                <TextField
                                    label="Total de Postulantes"
                                    value={selectedCurso.total_postulantes || 0}
                                    InputProps={{ readOnly: true }}
                                />
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body1">Estado Actual:</Typography>
                                    <Chip
                                        label={selectedCurso.estado === 1 ? 'Habilitado' : 'Deshabilitado'}
                                        color={selectedCurso.estado === 1 ? 'success' : 'default'}
                                        icon={selectedCurso.estado === 1 ? <CheckCircleIcon /> : <CancelIcon />}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetalleDialog(false)}>
                        Cerrar
                    </Button>
                    {selectedCurso && (
                        <Button
                            variant="contained"
                            color={selectedCurso.estado === 1 ? 'error' : 'success'}
                            onClick={() => {
                                cambiarEstadoCurso(selectedCurso.id, selectedCurso.estado === 1 ? 0 : 1);
                                setDetalleDialog(false);
                            }}
                            startIcon={selectedCurso.estado === 1 ? <CancelIcon /> : <CheckCircleIcon />}
                        >
                            {selectedCurso.estado === 1 ? 'Deshabilitar' : 'Habilitar'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestionCursos;