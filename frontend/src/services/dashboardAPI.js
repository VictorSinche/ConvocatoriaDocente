import api from './api.js';

// ========================================================================
// API DE DASHBOARD - Frontend
// Funciones para obtener datos del dashboard
// ========================================================================

export const dashboardAPI = {
  // Obtener estadísticas generales
  getStats: async (userParams = {}) => {
    try {
      const params = new URLSearchParams({ action: 'stats', ...userParams });
      const response = await api.get(`/dashboard.php?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  },

  // Obtener distribución de postulaciones
  getPostulacionesDistribucion: async (userParams = {}) => {
    try {
      const params = new URLSearchParams({ action: 'postulaciones-distribucion', ...userParams });
      const response = await api.get(`/dashboard.php?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener distribución de postulaciones:', error);
      throw error;
    }
  },

  // Obtener cursos más populares
  getCursosPopulares: async () => {
    try {
      const response = await api.get('/dashboard.php?action=cursos-populares');
      return response.data;
    } catch (error) {
      console.error('Error al obtener cursos populares:', error);
      throw error;
    }
  },

  // Obtener actividad reciente
  getActividadReciente: async () => {
    try {
      const response = await api.get('/dashboard.php?action=actividad-reciente');
      return response.data;
    } catch (error) {
      console.error('Error al obtener actividad reciente:', error);
      throw error;
    }
  }
};

export default dashboardAPI;