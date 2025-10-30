import React, { useState, useEffect, useContext } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    Badge
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    GetApp as GetAppIcon,
    School as SchoolIcon,
    Work as WorkIcon,
    Assessment as AssessmentIcon,
    Schedule as ScheduleIcon,
    Email as EmailIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    HourglassEmpty as HourglassEmptyIcon,
    RateReview as RateReviewIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const DirectorDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(0);
    const [cursos, setCursos] = useState([]);
    const [postulantes, setPostulantes] = useState([]);
    const [estadisticas, setEstadisticas] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedPostulante, setSelectedPostulante] = useState(null);
    const [perfilDialog, setPerfilDialog] = useState(false);
    const [evaluacionDialog, setEvaluacionDialog] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [mensajeEntrevista, setMensajeEntrevista] = useState('');

    // Cargar datos iniciales
    useEffect(() => {
        if (user && user.rol === 'director') {
            cargarCursos();
            cargarPostulantes();
            cargarEstadisticas();
        }
    }, [user]);

    // CARGAR CURSOS DE LA ESPECIALIDAD DEL DIRECTOR
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

    // CARGAR POSTULANTES DE LA ESPECIALIDAD
    const cargarPostulantes = async () => {
        try {
            const response = await fetch(
                `http://localhost/ConvocaDocente/backend/api/cursos.php?action=postulantes&cod_esp=${user.cod_esp}&cod_fac=${user.cod_fac}`
            );
            const data = await response.json();
            
            if (data.success) {
                setPostulantes(data.data);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error cargando postulantes:', error);
            toast.error('Error al cargar postulantes');
        }
    };

    // CARGAR ESTADÍSTICAS
    const cargarEstadisticas = async () => {
        try {
            const response = await fetch(
                `http://localhost/ConvocaDocente/backend/api/director.php?action=estadisticas&cod_esp=${user.cod_esp}&cod_fac=${user.cod_fac}`
            );
            const data = await response.json();
            
            if (data.success) {
                setEstadisticas(data.data);
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    // CAMBIAR ESTADO DE CURSO (HABILITAR/DESHABILITAR)
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

    // VER PERFIL COMPLETO DEL POSTULANTE
    const verPerfilCompleto = async (userId) => {
        try {
            const response = await fetch(
                `http://localhost/ConvocaDocente/backend/api/director.php?action=perfil_completo&user_id=${userId}`
            );
            const data = await response.json();
            
            if (data.success) {
                setSelectedPostulante(data.data);
                setPerfilDialog(true);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
            toast.error('Error al cargar perfil completo');
        }
    };

    // ACTUALIZAR ESTADO DE POSTULACIÓN
    const actualizarEstadoPostulacion = async () => {
        try {
            const postulante = postulantes.find(p => p.user_id === selectedPostulante.perfil.id);
            
            const response = await fetch('http://localhost/ConvocaDocente/backend/api/director.php', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'actualizar_estado',
                    postulacion_id: postulante.postulacion_id,
                    nuevo_estado: nuevoEstado,
                    mensaje_entrevista: mensajeEntrevista,
                    director_id: user.id
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                toast.success(data.message);
                setEvaluacionDialog(false);
                setNuevoEstado('');
                setMensajeEntrevista('');
                cargarPostulantes();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            toast.error('Error al actualizar estado');
        }
    };

    // DESCARGAR DOCUMENTO
    const descargarDocumento = (tipo, archivo, userId) => {
        const url = `http://localhost/ConvocaDocente/backend/api/documentos.php?action=descargar&tipo=${tipo}&archivo=${archivo}&user_id=${userId}`;
        window.open(url, '_blank');
    };

    // GENERAR PDF DEL PERFIL
    const generarPerfilPDF = (userId) => {
        const url = `http://localhost/ConvocaDocente/backend/api/documentos.php?action=perfil_pdf&user_id=${userId}`;
        window.open(url, '_blank');
    };

    // OBTENER COLOR DEL CHIP SEGÚN ESTADO
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return 'warning';
            case 'EVALUANDO': return 'info';
            case 'APROBADO': return 'success';
            case 'RECHAZADO': return 'error';
            default: return 'default';
        }
    };

    // OBTENER ICONO SEGÚN ESTADO
    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return <HourglassEmptyIcon />;
            case 'EVALUANDO': return <RateReviewIcon />;
            case 'APROBADO': return <CheckCircleIcon />;
            case 'RECHAZADO': return <CancelIcon />;
            default: return null;
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* HEADER */}
            <Typography variant="h4" gutterBottom>
                Panel de Director - {user?.nom_esp || 'Especialidad'}
            </Typography>
            
            {/* ESTADÍSTICAS */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Cursos Activos
                            </Typography>
                            <Typography variant="h4">
                                {estadisticas.cursos_activos || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Postulaciones Recientes
                            </Typography>
                            <Typography variant="h4">
                                {estadisticas.postulaciones_recientes || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Estados de Postulaciones
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {estadisticas.estadisticas_por_estado?.map((stat) => (
                                    <Chip
                                        key={stat.estado}
                                        label={`${stat.estado}: ${stat.total}`}
                                        color={getEstadoColor(stat.estado)}
                                        size="small"
                                    />
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* TABS */}
            <Paper sx={{ width: '100%' }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="Gestión de Cursos" />
                    <Tab label="Evaluación de Postulantes" />
                </Tabs>

                {/* TAB 1: GESTIÓN DE CURSOS */}
                {activeTab === 0 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Cursos de {user?.nom_esp}
                        </Typography>
                        
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Código</TableCell>
                                        <TableCell>Nombre del Curso</TableCell>
                                        <TableCell>Ciclo</TableCell>
                                        <TableCell>Modalidad</TableCell>
                                        <TableCell>Estado</TableCell>
                                        <TableCell>Postulantes</TableCell>
                                        <TableCell>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {cursos.map((curso) => (
                                        <TableRow key={curso.id}>
                                            <TableCell>{curso.c_codcur}</TableCell>
                                            <TableCell>{curso.c_nomcur}</TableCell>
                                            <TableCell>{curso.n_ciclo}</TableCell>
                                            <TableCell>{curso.modalidad}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={curso.estado === 1 ? 'Activo' : 'Inactivo'}
                                                    color={curso.estado === 1 ? 'success' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Badge badgeContent={curso.total_postulantes} color="primary">
                                                    <SchoolIcon />
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="contained"
                                                    color={curso.estado === 1 ? 'error' : 'success'}
                                                    size="small"
                                                    onClick={() => cambiarEstadoCurso(curso.id, curso.estado === 1 ? 0 : 1)}
                                                >
                                                    {curso.estado === 1 ? 'Deshabilitar' : 'Habilitar'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 2: EVALUACIÓN DE POSTULANTES */}
                {activeTab === 1 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Postulantes a {user?.nom_esp}
                        </Typography>
                        
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Nombre Completo</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>DNI</TableCell>
                                        <TableCell>Estado</TableCell>
                                        <TableCell>Fecha Postulación</TableCell>
                                        <TableCell>Perfil</TableCell>
                                        <TableCell>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {postulantes.map((postulante) => (
                                        <TableRow key={postulante.postulacion_id}>
                                            <TableCell>
                                                {postulante.nombres} {postulante.apellidos}
                                            </TableCell>
                                            <TableCell>{postulante.email}</TableCell>
                                            <TableCell>{postulante.dni}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={getEstadoIcon(postulante.estado_postulacion)}
                                                    label={postulante.estado_postulacion}
                                                    color={getEstadoColor(postulante.estado_postulacion)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {new Date(postulante.fecha_postulacion).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Chip
                                                        label={`${postulante.total_formacion} Títulos`}
                                                        size="small"
                                                        color="primary"
                                                    />
                                                    <Chip
                                                        label={`${postulante.total_experiencia} Trabajos`}
                                                        size="small"
                                                        color="secondary"
                                                    />
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="Ver Perfil Completo">
                                                        <IconButton
                                                            color="primary"
                                                            onClick={() => verPerfilCompleto(postulante.user_id)}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Evaluar Postulación">
                                                        <IconButton
                                                            color="warning"
                                                            onClick={() => {
                                                                setSelectedPostulante({ perfil: { id: postulante.user_id } });
                                                                setEvaluacionDialog(true);
                                                            }}
                                                        >
                                                            <AssessmentIcon />
                                                        </IconButton>
                                                    </Tooltip>

                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Paper>

            {/* DIALOG: PERFIL COMPLETO */}
            <Dialog open={perfilDialog} onClose={() => setPerfilDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Perfil Completo del Postulante
                </DialogTitle>
                <DialogContent>
                    {selectedPostulante && (
                        <Box>
                            {/* Datos Personales */}
                            <Typography variant="h6" gutterBottom>
                                <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Datos Personales
                            </Typography>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6}>
                                    <Typography><strong>Nombre:</strong> {selectedPostulante.perfil.nombres} {selectedPostulante.perfil.apellidos}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography><strong>Email:</strong> {selectedPostulante.perfil.email}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography><strong>DNI:</strong> {selectedPostulante.perfil.dni}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography><strong>Teléfono:</strong> {selectedPostulante.perfil.telefono}</Typography>
                                </Grid>
                            </Grid>

                            {/* Formación Académica */}
                            <Typography variant="h6" gutterBottom>
                                <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Formación Académica ({selectedPostulante.formacion_academica?.length || 0})
                            </Typography>
                            {selectedPostulante.formacion_academica?.map((formacion, index) => (
                                <Card key={index} sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1"><strong>{formacion.titulo}</strong></Typography>
                                        <Typography>Institución: {formacion.institucion}</Typography>
                                        <Typography>Periodo: {formacion.fecha_inicio} - {formacion.fecha_fin}</Typography>
                                        {formacion.certificado_archivo && (
                                            <Button
                                                startIcon={<GetAppIcon />}
                                                onClick={() => descargarDocumento('certificados', formacion.certificado_archivo, selectedPostulante.perfil.id)}
                                            >
                                                Descargar Certificado
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Experiencia Laboral */}
                            <Typography variant="h6" gutterBottom>
                                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                Experiencia Laboral ({selectedPostulante.experiencia_laboral?.length || 0})
                            </Typography>
                            {selectedPostulante.experiencia_laboral?.map((experiencia, index) => (
                                <Card key={index} sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="subtitle1"><strong>{experiencia.cargo}</strong></Typography>
                                        <Typography>Empresa: {experiencia.empresa}</Typography>
                                        <Typography>Periodo: {experiencia.fecha_inicio} - {experiencia.fecha_fin}</Typography>
                                        {experiencia.constancia_archivo && (
                                            <Button
                                                startIcon={<GetAppIcon />}
                                                onClick={() => descargarDocumento('constancias', experiencia.constancia_archivo, selectedPostulante.perfil.id)}
                                            >
                                                Descargar Constancia
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </DialogContent>

            </Dialog>

            {/* DIALOG: EVALUACIÓN DE POSTULACIÓN */}
            <Dialog open={evaluacionDialog} onClose={() => setEvaluacionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    Evaluar Postulación
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Nuevo Estado</InputLabel>
                            <Select
                                value={nuevoEstado}
                                onChange={(e) => setNuevoEstado(e.target.value)}
                                label="Nuevo Estado"
                            >
                                <MenuItem value="PENDIENTE">PENDIENTE</MenuItem>
                                <MenuItem value="EVALUANDO">EVALUANDO</MenuItem>
                                <MenuItem value="APROBADO">APROBADO</MenuItem>
                                <MenuItem value="RECHAZADO">RECHAZADO</MenuItem>
                            </Select>
                        </FormControl>

                        {nuevoEstado === 'APROBADO' && (
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Mensaje de Entrevista"
                                value={mensajeEntrevista}
                                onChange={(e) => setMensajeEntrevista(e.target.value)}
                                placeholder="Escriba aquí el mensaje personalizado para la entrevista..."
                                helperText="Este mensaje será enviado al docente aprobado"
                            />
                        )}

                        {nuevoEstado && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                El estado se cambiará a: <strong>{nuevoEstado}</strong>
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEvaluacionDialog(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={actualizarEstadoPostulacion}
                        disabled={!nuevoEstado}
                    >
                        Actualizar Estado
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DirectorDashboard;