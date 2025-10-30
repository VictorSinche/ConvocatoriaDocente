import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  ButtonGroup
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import GestionAdministrativos from './GestionAdministrativos';
import GestionDocentes from './GestionDocentes';

function GestionUsuarios() {
  const [currentView, setCurrentView] = useState('administrativos'); // 'administrativos' o 'docentes'

  const renderCurrentView = () => {
    switch (currentView) {
      case 'administrativos':
        return <GestionAdministrativos />;
      case 'docentes':
        return <GestionDocentes />;
      default:
        return <GestionAdministrativos />;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header Principal */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                👥 Gestión de Usuarios
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Administra usuarios del sistema ConvocaDocente por categorías
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Navegación entre páginas */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <ButtonGroup 
              variant="outlined" 
              size="large"
              sx={{
                '& .MuiButton-root': {
                  px: 4,
                  py: 2,
                  textTransform: 'none',
                  fontWeight: 500
                }
              }}
            >
              <Button
                startIcon={<AdminIcon />}
                onClick={() => setCurrentView('administrativos')}
                variant={currentView === 'administrativos' ? 'contained' : 'outlined'}
                sx={{ 
                  minWidth: 200,
                  backgroundColor: currentView === 'administrativos' ? '#1976d2' : 'transparent'
                }}
              >
                Administrativos
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                  (Admin, Decanos, Directores)
                </Typography>
              </Button>
              <Button
                startIcon={<SchoolIcon />}
                onClick={() => setCurrentView('docentes')}
                variant={currentView === 'docentes' ? 'contained' : 'outlined'}
                sx={{ 
                  minWidth: 200,
                  backgroundColor: currentView === 'docentes' ? '#1976d2' : 'transparent'
                }}
              >
                Docentes
                <Typography variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
                  (Postulantes)
                </Typography>
              </Button>
            </ButtonGroup>
          </Box>
        </CardContent>
      </Card>

      {/* Renderizar vista actual */}
      {renderCurrentView()}
    </Box>
  );
}

export default GestionUsuarios;
