import React, { useState, useEffect } from 'react';
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
    IconButton,
    Tooltip,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Divider,
    LinearProgress
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
    RateReview as RateReviewIcon,
    ExpandMore as ExpandMoreIcon,
    Person as PersonIcon,
    Business as BusinessIcon,
    AccessTime as AccessTimeIcon,
    Phone as PhoneIcon,
    LocationOn as LocationOnIcon,
    CalendarToday as CalendarTodayIcon,
    Refresh as RefreshIcon,
    PictureAsPdf as PdfIcon,
    OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const GestionPostulantes = () => {
    const { user } = useAuth();
    const [postulantes, setPostulantes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPostulante, setSelectedPostulante] = useState(null);
    const [perfilDialog, setPerfilDialog] = useState(false);
    const [evaluacionDialog, setEvaluacionDialog] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [mensajeEntrevista, setMensajeEntrevista] = useState('');
    const [loadingPerfil, setLoadingPerfil] = useState(false);
    const [loadingEvaluacion, setLoadingEvaluacion] = useState(false);

    // Base URL para las APIs
    const API_BASE_URL = 'http://localhost/ConvocaDocente/backend/api';

    // Cargar postulantes según el rol del usuario
    useEffect(() => {
        if (user && (user.rol === 'director' || user.rol === 'administrador')) {
            cargarPostulantes();
        }
    }, [user]);

    const cargarPostulantes = async () => {
        try {
            setLoading(true);
            
            // URL según el rol del usuario
            let url;
            if (user.rol === 'administrador') {
                // Administrador ve TODAS las postulaciones
                url = `${API_BASE_URL}/director.php?action=postulantes_admin`;
            } else {
                // Director ve solo su especialidad
                url = `${API_BASE_URL}/director.php?action=postulantes&cod_esp=${user.cod_esp}&cod_fac=${user.cod_fac}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                setPostulantes(data.data || []);
            } else {
                toast.error(data.message || 'Error al cargar postulantes');
            }
        } catch (error) {
            toast.error('Error al cargar la información de postulantes');
        } finally {
            setLoading(false);
        }
    };

    // Ver perfil completo del postulante
    const verPerfilCompleto = async (userId) => {
        try {
            setLoadingPerfil(true);
            
            const response = await fetch(
                `${API_BASE_URL}/director.php?action=perfil_completo&user_id=${userId}`
            );
            const data = await response.json();
            
            if (data.success) {
                setSelectedPostulante(data.data);
                setPerfilDialog(true);
            } else {
                toast.error(data.message || 'Error al cargar perfil completo');
            }
        } catch (error) {
            toast.error('Error al cargar el perfil del postulante');
        } finally {
            setLoadingPerfil(false);
        }
    };

    // Actualizar estado de postulación
    const actualizarEstadoPostulacion = async () => {
        if (!nuevoEstado) {
            toast.error('Debe seleccionar un estado');
            return;
        }

        if (nuevoEstado === 'APROBADO' && !mensajeEntrevista.trim()) {
            toast.error('El mensaje de entrevista es obligatorio para postulaciones aprobadas');
            return;
        }

        try {
            setLoadingEvaluacion(true);
            
            // Encontrar la postulación actual
            const postulante = postulantes.find(p => p.user_id === selectedPostulante.perfil.id);
            
            if (!postulante) {
                toast.error('No se pudo encontrar la postulación');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/director.php`, {
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
                
                // Recargar postulantes
                await cargarPostulantes();
            } else {
                toast.error(data.message || 'Error al actualizar estado');
            }
        } catch (error) {
            toast.error('Error al actualizar la evaluación');
        } finally {
            setLoadingEvaluacion(false);
        }
    };

    // Abrir evaluación con datos precargados
    const abrirEvaluacion = (postulante) => {
        setSelectedPostulante({ perfil: { id: postulante.user_id } });
        setNuevoEstado(postulante.estado_postulacion);
        setMensajeEntrevista(postulante.mensaje_entrevista || '');
        setEvaluacionDialog(true);
    };

    // Descargar documento con verificación mejorada
    const descargarDocumento = (tipo, archivo, userId) => {
        if (!archivo) {
            toast.error('No hay archivo disponible para descargar');
            return;
        }
        
        // Construir URL de descarga directa SIN verificación fetch (evita CORS)
        const url = `http://localhost/ConvocaDocente/uploads/${tipo}/usuario_${userId}/${archivo}`;
        
        // Descargar directamente sin verificación previa (evita CORS)
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success(`Descargando: ${archivo}`);
    };

    // Visualizar PDF en nueva ventana
    const visualizarPDF = (tipo, archivo, userId) => {
        if (!archivo) {
            toast.error('No hay archivo disponible para visualizar');
            return;
        }
        
        // Construir URL de visualización directa SIN verificación fetch (evita CORS)
        const url = `http://localhost/ConvocaDocente/uploads/${tipo}/usuario_${userId}/${archivo}`;
        
        // Abrir directamente sin verificación previa (evita CORS)
        const newWindow = window.open(url, '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
        
        if (!newWindow) {
            toast.error('Por favor, permita ventanas emergentes para visualizar el PDF');
        } else {
            toast.success('Abriendo documento...');
        }
    };

    // Obtener color del chip según estado
    const getEstadoColor = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return 'warning';
            case 'EVALUANDO': return 'info';
            case 'APROBADO': return 'success';
            case 'RECHAZADO': return 'error';
            default: return 'default';
        }
    };

    // Obtener icono según estado
    const getEstadoIcon = (estado) => {
        switch (estado) {
            case 'PENDIENTE': return <HourglassEmptyIcon />;
            case 'EVALUANDO': return <RateReviewIcon />;
            case 'APROBADO': return <CheckCircleIcon />;
            case 'RECHAZADO': return <CancelIcon />;
            default: return null;
        }
    };

    // Componente para botones de documento mejorado
    const DocumentButton = ({ tipo, archivo, userId, label }) => {
        if (!archivo) {
            return (
                <Box sx={{ 
                    p: 2, 
                    border: '1px dashed #e0e0e0', 
                    borderRadius: 1, 
                    textAlign: 'center',
                    bgcolor: '#f9f9f9'
                }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        📄 Sin {label?.toLowerCase() || 'documento'}
                    </Typography>
                </Box>
            );
        }

        return (
            <Box sx={{ 
                p: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PdfIcon sx={{ color: 'error.main' }} />
                    <Box>
                        <Typography variant="body2" fontWeight="500">
                            {archivo}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {label || 'Documento PDF'}
                        </Typography>
                    </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Ver documento">
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => visualizarPDF(tipo, archivo, userId)}
                        >
                            <VisibilityIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Descargar documento">
                        <IconButton
                            size="small"
                            color="success"
                            onClick={() => descargarDocumento(tipo, archivo, userId)}
                        >
                            <GetAppIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* HEADER */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AssessmentIcon sx={{ color: '#e50a5e', fontSize: 32 }} />
                    <Box>
                        <Typography variant="h4" fontWeight="bold">
                            Gestión de Postulantes
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            {user?.rol === 'administrador' ? 'Todas las especialidades' : user?.nom_esp || 'Especialidad no definida'}
                        </Typography>
                    </Box>
                </Box>
                
                <Button
                    startIcon={<RefreshIcon />}
                    variant="outlined"
                    onClick={cargarPostulantes}
                    disabled={loading}
                >
                    Actualizar
                </Button>
            </Box>

            {/* INFORMACIÓN */}
            <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                    <strong>Instrucciones:</strong> {user?.rol === 'administrador' 
                        ? 'Como administrador, puedes evaluar y gestionar todas las postulaciones del sistema.' 
                        : `Como director de ${user?.nom_esp}, puedes evaluar y gestionar las postulaciones de docentes que se postulan a cursos de tu especialidad.`
                    } Los estados disponibles son:
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" label="PENDIENTE" color="warning" />
                    <Chip size="small" label="EVALUANDO" color="info" />
                    <Chip size="small" label="APROBADO" color="success" />
                    <Chip size="small" label="RECHAZADO" color="error" />
                </Box>
            </Alert>

            {/* TABLA DE POSTULANTES */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {user?.rol === 'administrador' ? 'Todas las Postulaciones' : `Postulantes a ${user?.nom_esp}`}
                    </Typography>
                    
                    {loading && <LinearProgress sx={{ mb: 2 }} />}
                    
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>Nombre Completo</strong></TableCell>
                                    <TableCell><strong>Email</strong></TableCell>
                                    <TableCell><strong>DNI</strong></TableCell>
                                    <TableCell><strong>Estado</strong></TableCell>
                                    <TableCell><strong>Fecha Postulación</strong></TableCell>
                                    <TableCell><strong>Acciones</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Box sx={{ py: 3 }}>
                                                <Typography>⏳ Cargando información...</Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : postulantes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            <Box sx={{ py: 3 }}>
                                                <Typography color="text.secondary">
                                                    📋 No hay postulaciones disponibles
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    postulantes.map((postulante, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">
                                                    {postulante.nombres || 'Sin nombre'} {postulante.apellidos || ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {postulante.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {postulante.dni || 'Sin DNI'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={getEstadoIcon(postulante.estado_postulacion)}
                                                    label={postulante.estado_postulacion}
                                                    color={getEstadoColor(postulante.estado_postulacion)}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(postulante.fecha_postulacion).toLocaleDateString('es-ES')}
                                                </Typography>
                                            </TableCell>

                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="Ver Perfil Completo">
                                                        <IconButton
                                                            color="primary"
                                                            onClick={() => verPerfilCompleto(postulante.user_id)}
                                                            disabled={loadingPerfil}
                                                        >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Evaluar Postulación">
                                                        <IconButton
                                                            color="warning"
                                                            onClick={() => abrirEvaluacion(postulante)}
                                                        >
                                                            <AssessmentIcon />
                                                        </IconButton>
                                                    </Tooltip>
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

            {/* DIALOG: PERFIL COMPLETO */}
            <Dialog open={perfilDialog} onClose={() => setPerfilDialog(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PersonIcon sx={{ color: '#e50a5e' }} />
                        Perfil Completo del Postulante
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedPostulante && (
                        <Box sx={{ pt: 2 }}>
                            {/* DATOS PERSONALES */}
                            <Accordion defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <PersonIcon sx={{ color: '#e50a5e' }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            Datos Personales
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <PersonIcon fontSize="small" />
                                                <Typography><strong>Nombre:</strong> {selectedPostulante.perfil.nombres} {selectedPostulante.perfil.apellidos}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <EmailIcon fontSize="small" />
                                                <Typography><strong>Email:</strong> {selectedPostulante.perfil.email}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography><strong>DNI:</strong> {selectedPostulante.perfil.dni}</Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <PhoneIcon fontSize="small" />
                                                <Typography><strong>Teléfono:</strong> {selectedPostulante.perfil.telefono}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <LocationOnIcon fontSize="small" />
                                                <Typography><strong>Dirección:</strong> {selectedPostulante.perfil.direccion}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                <CalendarTodayIcon fontSize="small" />
                                                <Typography><strong>Fecha de Nacimiento:</strong> {selectedPostulante.perfil.fecha_nacimiento}</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle2" gutterBottom>
                                                <strong>Curriculum Vitae:</strong>
                                            </Typography>
                                            <DocumentButton
                                                tipo="cv"
                                                archivo={selectedPostulante.perfil.cv_archivo}
                                                userId={selectedPostulante.perfil.id}
                                                label="Curriculum Vitae"
                                            />
                                        </Grid>
                                    </Grid>
                                </AccordionDetails>
                            </Accordion>

                            {/* FORMACIÓN ACADÉMICA */}
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <SchoolIcon sx={{ color: '#e50a5e' }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            🎓 Formación Académica
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {selectedPostulante.formacion_academica?.length > 0 ? (
                                        selectedPostulante.formacion_academica.map((formacion, index) => (
                                            <Card key={index} sx={{ mb: 2 }}>
                                                <CardContent>
                                                    <Typography variant="subtitle1" fontWeight="bold">{formacion.tipo} en {formacion.especialidad}</Typography>
                                                    <Typography>Institución: {formacion.institucion}</Typography>
                                                    <Typography>País: {formacion.pais}</Typography>
                                                    <Typography>Fecha de Obtención: {formacion.fecha_obtencion}</Typography>
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            Documento:
                                                        </Typography>
                                                        <DocumentButton
                                                            tipo="formacion"
                                                            archivo={formacion.documento_archivo}
                                                            userId={selectedPostulante.perfil.id}
                                                            label="Documento de Formación Académica"
                                                        />
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <Typography color="text.secondary">📚 No hay formación académica registrada</Typography>
                                    )}
                                </AccordionDetails>
                            </Accordion>

                            {/* EXPERIENCIA LABORAL */}
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <WorkIcon sx={{ color: '#e50a5e' }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            💼 Experiencia Laboral
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {selectedPostulante.experiencia_laboral?.length > 0 ? (
                                        selectedPostulante.experiencia_laboral.map((experiencia, index) => (
                                            <Card key={index} sx={{ mb: 2 }}>
                                                <CardContent>
                                                    <Typography variant="subtitle1" fontWeight="bold">{experiencia.cargo}</Typography>
                                                    <Typography>Empresa: {experiencia.empresa}</Typography>
                                                    <Typography>Sector: {experiencia.sector}</Typography>
                                                    <Typography>País: {experiencia.pais}</Typography>
                                                    <Typography>
                                                        Período: {experiencia.fecha_inicio} - {experiencia.actual ? 'Actualidad' : experiencia.fecha_fin}
                                                    </Typography>
                                                    <Box sx={{ mt: 2 }}>
                                                        <Typography variant="subtitle2" gutterBottom>
                                                            Constancia:
                                                        </Typography>
                                                        <DocumentButton
                                                            tipo="experiencia"
                                                            archivo={experiencia.constancia_archivo}
                                                            userId={selectedPostulante.perfil.id}
                                                            label="Constancia de Experiencia Laboral"
                                                        />
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <Typography color="text.secondary">💼 No hay experiencia laboral registrada</Typography>
                                    )}
                                </AccordionDetails>
                            </Accordion>

                            {/* CURSOS POSTULADOS */}
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <BusinessIcon sx={{ color: '#e50a5e' }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            📚 Cursos Postulados
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {(() => {
                                        // Filtrar solo cursos de la especialidad del director
                                        const cursosEspecialidad = selectedPostulante.docente_cursos?.filter(curso => 
                                            curso.c_codesp === user?.cod_esp
                                        ) || [];
                                        
                                        return cursosEspecialidad.length > 0 ? (
                                            cursosEspecialidad.map((curso, index) => (
                                                <Card key={index} sx={{ mb: 2 }}>
                                                    <CardContent>
                                                        <Typography variant="subtitle1" fontWeight="bold">{curso.c_nomcur}</Typography>
                                                        <Typography>📖 Ciclo: {curso.n_ciclo}</Typography>
                                                        <Typography>💻 Modalidad: {curso.modalidad}</Typography>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        ) : (
                                            <Typography color="text.secondary">
                                                📋 No hay cursos postulados disponibles
                                            </Typography>
                                        );
                                    })()}
                                </AccordionDetails>
                            </Accordion>

                            {/* HORARIOS DISPONIBLES */}
                            <Accordion>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <AccessTimeIcon sx={{ color: '#e50a5e' }} />
                                        <Typography variant="h6" fontWeight="bold">
                                            ⏰ Disponibilidad Horaria
                                        </Typography>
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {selectedPostulante.docente_horarios?.length > 0 ? (
                                        selectedPostulante.docente_horarios.map((horario, index) => (
                                            <Card key={index} sx={{ mb: 2 }}>
                                                <CardContent>
                                                    <Typography variant="subtitle1" fontWeight="bold">{horario.dia}</Typography>
                                                    <Typography>Horario: {horario.hora_inicio} - {horario.hora_fin}</Typography>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <Typography color="text.secondary">⏰ No hay horarios disponibles registrados</Typography>
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPerfilDialog(false)}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIALOG: EVALUACIÓN DE POSTULACIÓN */}
            <Dialog open={evaluacionDialog} onClose={() => setEvaluacionDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AssessmentIcon sx={{ color: '#e50a5e' }} />
                        Evaluar Postulación
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Estado de la Postulación</InputLabel>
                            <Select
                                value={nuevoEstado}
                                onChange={(e) => setNuevoEstado(e.target.value)}
                                label="Estado de la Postulación"
                            >
                                <MenuItem value="PENDIENTE">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <HourglassEmptyIcon fontSize="small" />
                                        PENDIENTE
                                    </Box>
                                </MenuItem>
                                <MenuItem value="EVALUANDO">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <RateReviewIcon fontSize="small" />
                                        EVALUANDO
                                    </Box>
                                </MenuItem>
                                <MenuItem value="APROBADO">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon fontSize="small" />
                                        APROBADO
                                    </Box>
                                </MenuItem>
                                <MenuItem value="RECHAZADO">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CancelIcon fontSize="small" />
                                        RECHAZADO
                                    </Box>
                                </MenuItem>
                            </Select>
                        </FormControl>

                        {nuevoEstado === 'APROBADO' && (
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                label="Mensaje de Entrevista *"
                                value={mensajeEntrevista}
                                onChange={(e) => setMensajeEntrevista(e.target.value)}
                                placeholder="Escriba aquí el mensaje personalizado para la entrevista..."
                                helperText="Este mensaje será enviado al docente aprobado. Incluya detalles sobre la entrevista, fecha, hora y lugar."
                                required
                            />
                        )}

                        {nuevoEstado && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                El estado se cambiará a: <strong>{nuevoEstado}</strong>
                                {nuevoEstado === 'APROBADO' && (
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                        ✅ El docente recibirá el mensaje de entrevista
                                    </Typography>
                                )}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => {
                            setEvaluacionDialog(false);
                            setNuevoEstado('');
                            setMensajeEntrevista('');
                        }}
                        disabled={loadingEvaluacion}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={actualizarEstadoPostulacion}
                        disabled={!nuevoEstado || loadingEvaluacion}
                        sx={{ 
                            bgcolor: '#e50a5e', 
                            '&:hover': { bgcolor: '#c1084f' }
                        }}
                    >
                        {loadingEvaluacion ? '⏳ Guardando...' : '💾 Guardar Evaluación'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GestionPostulantes;