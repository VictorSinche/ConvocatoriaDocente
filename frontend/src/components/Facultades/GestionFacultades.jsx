import React, { useState, useEffect } from 'react';
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
  useMediaQuery
} from '@mui/material';
import {
  Business as BusinessIcon,
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const GestionFacultades = () => {
  const [facultades, setFacultades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Cargar datos de facultades
  const cargarFacultades = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost/ConvocaDocente/backend/api/facultades.php');
      const data = await response.json();
      
      if (data.success) {
        setFacultades(data.data);
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
    cargarFacultades();
  }, []);

  // Filtrar datos
  const facultadesFiltradas = facultades.filter(item =>
    item.nombre.toLowerCase().includes(filterText.toLowerCase()) ||
    item.codigo.toLowerCase().includes(filterText.toLowerCase())
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
    const ws = XLSX.utils.json_to_sheet(facultadesFiltradas.map(item => ({
      'Código': item.codigo,
      'Nombre de Facultad': item.nombre
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Facultades');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, 'facultades.xlsx');
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título del documento
    doc.setFontSize(20);
    doc.setTextColor(229, 10, 94);
    doc.text('Lista de Facultades', 14, 22);
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 14, 32);
    
    // Preparar datos para la tabla
    const tableData = facultadesFiltradas.map(item => [
      item.codigo,
      item.nombre
    ]);
    
    // Crear tabla usando autoTable
    autoTable(doc, {
      startY: 40,
      head: [['Código', 'Nombre de Facultad', 'Fecha de Registro']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [229, 10, 94],
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
    
    doc.save('facultades.pdf');
  };



  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#e50a5e' }} size={50} />
      </Box>
    );
  }

  // Calcular datos para la página actual
  const startIndex = page * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = facultadesFiltradas.slice(startIndex, endIndex);

  return (
    <Box sx={{ width: '100%', p: 0 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b', mb: 1 }}>
          Gestión de Facultades
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualización y consulta de facultades registradas en el sistema
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
            placeholder="Buscar facultad..."
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
          background: 'linear-gradient(135deg, #e50a5e 0%, #ff4081 100%)', 
          color: 'white', 
          p: 2 
        }}>
          <Typography variant="h6" fontWeight="600">
            Lista de Facultades
          </Typography>
        </Box>

        {currentData.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <BusinessIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No hay facultades registradas
            </Typography>
          </Box>
        ) : (
          <>
            {/* Vista móvil - Cards */}
            {isMobile ? (
              <Box sx={{ p: 2 }}>
                {currentData.map((facultad, index) => (
                  <Card 
                    key={facultad.codigo} 
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
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ 
                        bgcolor: 'rgba(229, 10, 94, 0.1)', 
                        color: '#e50a5e' 
                      }}>
                        <BusinessIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                          <Chip 
                            label={facultad.codigo}
                            size="small"
                            sx={{ 
                              bgcolor: '#e50a5e', 
                              color: 'white', 
                              fontWeight: 'bold'
                            }}
                          />
                        </Stack>
                        <Typography variant="subtitle2" fontWeight="600">
                          {facultad.nombre}
                        </Typography>
                      </Box>
                    </Stack>
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
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>Facultad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentData.map((facultad) => (
                      <TableRow 
                        key={facultad.codigo}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: 'rgba(229, 10, 94, 0.05)',
                            transform: 'scale(1.01)',
                            transition: 'all 0.2s ease'
                          }
                        }}
                      >
                        <TableCell>
                          <Chip 
                            label={facultad.codigo}
                            sx={{ 
                              bgcolor: '#e50a5e', 
                              color: 'white', 
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ 
                              bgcolor: 'rgba(229, 10, 94, 0.1)', 
                              color: '#e50a5e',
                              width: 40,
                              height: 40
                            }}>
                              <BusinessIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="600">
                                {facultad.nombre}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Código: {facultad.codigo}
                              </Typography>
                            </Box>
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
              count={facultadesFiltradas.length}
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

export default GestionFacultades;
