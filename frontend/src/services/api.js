import axios from 'axios';

// ========================================================================
// CONFIGURACIÓN DE API PARA ConvocaDocente
// Base URL apuntando al backend PHP
// ========================================================================

const API_BASE_URL = 'http://localhost/ConvocaDocente/backend/api';

// Crear instancia de axios con configuración predeterminada
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autorización
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('uma_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      data: error.response?.data
    });
    
    // Si el token es inválido, limpiar sesión
    if (error.response?.status === 401) {
      localStorage.removeItem('uma_user');
      localStorage.removeItem('uma_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// ========================================================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================================================

export const authAPI = {
  // Login de usuario
  login: async (credentials) => {
    const response = await api.post('/auth.php?action=login', credentials);
    return response.data;
  },

  // Registro de nuevo docente
  register: async (userData) => {
    const response = await api.post('/auth.php?action=register', userData);
    return response.data;
  },

  // Verificar token (futuro)
  verifyToken: async () => {
    const response = await api.get('/auth.php?action=verify');
    return response.data;
  },
};

// ========================================================================
// FUNCIONES PARA OTROS MÓDULOS (FUTURO)
// ========================================================================

export const userAPI = {
  // Obtener perfil del usuario
  getProfile: async () => {
    const response = await api.get('/user.php?action=profile');
    return response.data;
  },
  
  // Actualizar perfil
  updateProfile: async (profileData) => {
    const response = await api.put('/user.php?action=update', profileData);
    return response.data;
  },
};

export const coursesAPI = {
  // Obtener cursos activos
  getActiveCourses: async () => {
    const response = await api.get('/courses.php?action=active');
    return response.data;
  },
};

// ========================================================================
// FUNCIONES PARA GESTIÓN DE USUARIOS
// ========================================================================

export const usuariosAPI = {
  // Obtener todos los usuarios
  getAll: async () => {
    const response = await api.get('/usuarios.php?action=list');
    return response.data;
  },

  // Crear nuevo usuario
  create: async (userData) => {
    const response = await api.post('/usuarios.php?action=create', userData);
    return response.data;
  },

  // Actualizar usuario existente
  update: async (userId, userData) => {
    const response = await api.put(`/usuarios.php?action=update&id=${userId}`, userData);
    return response.data;
  },

  // Eliminar usuario
  delete: async (userId) => {
    const response = await api.delete(`/usuarios.php?action=delete&id=${userId}`);
    return response.data;
  },

  // Obtener facultades para asignación
  getFacultades: async () => {
    const response = await api.get('/usuarios.php?action=facultades');
    return response.data;
  },

  // Obtener especialidades por facultad
  getEspecialidades: async (facultadId = null) => {
    const url = facultadId 
      ? `/usuarios.php?action=especialidades&cod_fac=${facultadId}`
      : '/usuarios.php?action=especialidades';
    const response = await api.get(url);
    return response.data;
  },

  // Asignar facultad/especialidad a usuario administrativo
  assignFacultadEspecialidad: async (userId, facultadId, especialidadId = null) => {
    const response = await api.post('/usuarios.php?action=assign_faculty', {
      user_id: userId,
      facultad_id: facultadId,
      especialidad_id: especialidadId
    });
    return response.data;
  },
};

export default api;
