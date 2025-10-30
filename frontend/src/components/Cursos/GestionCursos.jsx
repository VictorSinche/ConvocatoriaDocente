import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Stack,
  Button,
  Switch,
  FormControlLabel,
  useMediaQuery
} from '@mui/material';
import {
  Search as SearchIcon,
  School as SchoolIcon,
  Business as BusinessIcon,
  Category as CategoryIcon,
  FileDownload as ExcelIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GestionCursos = () => {
  const { user } = useAuth();
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Cargar datos de cursos
  const cargarCursos = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost/ConvocaDocente/backend/api/cursos.php');
      const data = await response.json();
      
      if (data.success) {
        setCursos(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error de conexión: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  // Cambiar estado del curso
  const cambiarEstadoCurso = async (id, nuevoEstado) => {
    try {
      const response = await fetch('http://localhost/ConvocaDocente/backend/api/cursos.php', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: id,
          estado: nuevoEstado ? 1 : 0,
          user_id: user?.id || 1 // ID del usuario actual
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Actualizar el estado local
        setCursos(prevCursos => 
          prevCursos.map(curso => 
            curso.id === id ? { ...curso, estado: nuevoEstado ? 1 : 0 } : curso
          )
        );
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error al actualizar estado: ' + err.message);
    }
  };

  // Filtrar datos
  const cursosFiltrados = cursos.filter(item =>
    item.c_nomcur.toLowerCase().includes(filterText.toLowerCase()) ||
    item.c_codcur.toLowerCase().includes(filterText.toLowerCase()) ||
    item.nombre_facultad.toLowerCase().includes(filterText.toLowerCase()) ||
    item.nombre_especialidad.toLowerCase().includes(filterText.toLowerCase()) ||
    item.modalidad.toLowerCase().includes(filterText.toLowerCase())
  );

  // Paginación
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Exportar a Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(cursosFiltrados.map(item => ({
      'Código': item.c_codcur,
      'Curso': item.c_nomcur,
      'Ciclo': item.n_ciclo,
      'Facultad': item.nombre_facultad,
      'Especialidad': item.nombre_especialidad,
      'Modalidad': item.modalidad,
      'Estado': item.estado === 1 ? 'Activo' : 'Inactivo',
      'Período': item.n_codper
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cursos');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'cursos.xlsx');
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título del documento
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text('Lista de Cursos', 14, 22);
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 32);
    
    // Preparar datos para la tabla
    const tableData = cursosFiltrados.map(item => [
      item.c_codcur,
      item.c_nomcur,
      item.n_ciclo,
      item.nombre_especialidad,
      item.modalidad,
      item.estado === 1 ? 'Activo' : 'Inactivo'
    ]);
    
    // Crear tabla usando autoTable
    autoTable(doc, {
      startY: 40,
      head: [['Código', 'Curso', 'Ciclo', 'Especialidad', 'Modalidad', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [50, 50, 50]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });
    
    doc.save('cursos.pdf');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#3b82f6' }} size={50} />
      </Box>
    );
  }

  // Calcular datos para la página actual
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = cursosFiltrados.slice(startIndex, endIndex);

  return (
    <Box sx={{ width: '100%', p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', mb: 1 }}>
          Gestión de Cursos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualización y gestión del estado de cursos para reclutamiento docente
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Barra de herramientas */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
          <TextField
            placeholder="Buscar curso..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />
          <Stack direction="row" spacing={1}>
            <Tooltip title="Exportar a Excel">
              <Button
                variant="outlined"
                size="small"
                onClick={exportToExcel}
                startIcon={<ExcelIcon />}
                sx={{ 
                  color: '#10b981', 
                  borderColor: '#10b981',
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                }}
              >
                Excel
              </Button>
            </Tooltip>
            <Tooltip title="Exportar a PDF">
              <Button
                variant="outlined" 
                size="small"
                onClick={exportToPDF}
                startIcon={<PdfIcon />}
                sx={{ 
                  color: '#dc2626', 
                  borderColor: '#dc2626',
                  '&:hover': { backgroundColor: 'rgba(220, 38, 38, 0.1)' }
                }}
              >
                PDF
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Card>

      {/* Tabla responsive */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
        <Box sx={{ 
          background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', 
          color: 'white', 
          p: 2 
        }}>
          <Typography variant="h6" fontWeight="600">
            Lista de Cursos
          </Typography>
        </Box>

        {currentData.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <SchoolIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No hay cursos registrados
            </Typography>
          </Box>
        ) : (
          <>
            {/* Vista móvil - Cards */}
            {isMobile ? (
              <Box sx={{ p: 2 }}>
                {currentData.map((curso, index) => (
                  <Card 
                    key={curso.id} 
                    sx={{ 
                      mb: 2, 
                      p: 2, 
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        transform: 'translateY(-2px)', 
                        boxShadow: 3 
                      }
                    }}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                      <Avatar sx={{ 
                        bgcolor: 'rgba(59, 130, 246, 0.1)', 
                        color: '#3b82f6' 
                      }}>
                        <SchoolIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Chip 
                            label={curso.c_codcur}
                            size="small"
                            sx={{ 
                              bgcolor: '#3b82f6', 
                              color: 'white', 
                              fontWeight: 'bold'
                            }}
                          />
                          <Chip 
                            label={`Ciclo ${curso.n_ciclo}`}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              borderColor: '#3b82f6', 
                              color: '#3b82f6'
                            }}
                          />
                        </Stack>
                        <Typography variant="subtitle2" fontWeight="600" mb={1}>
                          {curso.c_nomcur}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {curso.nombre_especialidad}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {curso.modalidad} • Período {curso.n_codper}
                        </Typography>
                      </Box>
                    </Stack>
                    
                    <FormControlLabel
                      control={
                        <Switch 
                          checked={curso.estado === 1}
                          onChange={(e) => cambiarEstadoCurso(curso.id, e.target.checked)}
                          color="success"
                        />
                      }
                      label={curso.estado === 1 ? "Activo para Reclutamiento" : "Inactivo"}
                    />
                  </Card>
                ))}
              </Box>
            ) : (
              /* Vista desktop - Tabla */
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Código</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Curso</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Ciclo</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Especialidad</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Modalidad</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentData.map((curso) => (
                      <TableRow 
                        key={curso.id}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: 'rgba(59, 130, 246, 0.05)',
                            transform: 'scale(1.01)',
                            transition: 'all 0.2s ease'
                          }
                        }}
                      >
                        <TableCell>
                          <Chip 
                            label={curso.c_codcur}
                            sx={{ 
                              bgcolor: '#3b82f6', 
                              color: 'white', 
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ 
                              bgcolor: 'rgba(59, 130, 246, 0.1)', 
                              color: '#3b82f6',
                              width: 40,
                              height: 40
                            }}>
                              <SchoolIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="600">
                                {curso.c_nomcur}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Período: {curso.n_codper}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`Ciclo ${curso.n_ciclo}`}
                            variant="outlined"
                            sx={{ 
                              borderColor: '#3b82f6', 
                              color: '#3b82f6'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar sx={{ 
                              bgcolor: 'rgba(16, 185, 129, 0.1)', 
                              color: '#10b981',
                              width: 32,
                              height: 32
                            }}>
                              <CategoryIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="500">
                                {curso.nombre_especialidad}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {curso.nombre_facultad}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={curso.modalidad}
                            size="small"
                            sx={{ 
                              bgcolor: curso.modalidad === 'virtual' ? '#8b5cf6' : 
                                      curso.modalidad === 'hibrido' ? '#f59e0b' : '#06b6d4',
                              color: 'white'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Switch 
                                checked={curso.estado === 1}
                                onChange={(e) => cambiarEstadoCurso(curso.id, e.target.checked)}
                                color="success"
                              />
                            }
                            label=""
                          />
                          <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                            {curso.estado === 1 ? (
                              <ActiveIcon sx={{ color: '#10b981', fontSize: 16 }} />
                            ) : (
                              <InactiveIcon sx={{ color: '#ef4444', fontSize: 16 }} />
                            )}
                            <Typography variant="caption" color={curso.estado === 1 ? '#10b981' : '#ef4444'}>
                              {curso.estado === 1 ? 'Activo' : 'Inactivo'}
                            </Typography>
                          </Stack>
                        </TableCell>                    
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Paginación */}
            <TablePagination
              component="div"
              count={cursosFiltrados.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 15, 20]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
              }
              sx={{ borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}
            />
          </>
        )}
      </Card>
    </Box>
  );
};

export default GestionCursos;
