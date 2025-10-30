<?php
require_once '../config/database.php';

class UsuariosAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    public function obtenerUsuarios() {
        try {
            $query = "SELECT 
                        u.id,
                        u.email,
                        u.rol,
                        u.cod_fac,
                        u.cod_esp,
                        u.estado,
                        u.created_at,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad,
                        p.nombres,
                        p.apellidos,
                        p.dni,
                        p.telefono
                      FROM usuarios u
                      LEFT JOIN facultades f ON u.cod_fac = f.cod_fac
                      LEFT JOIN especialidades e ON u.cod_fac = e.cod_fac AND u.cod_esp = e.cod_esp
                      LEFT JOIN perfil_personal p ON u.id = p.user_id
                      ORDER BY u.created_at DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Transformar datos para el frontend
            foreach ($usuarios as &$usuario) {
                // Convertir estado TINYINT a string
                $usuario['estado'] = $usuario['estado'] == 1 ? 'activo' : 'inactivo';
                // Renombrar created_at a fecha_registro para compatibilidad
                $usuario['fecha_registro'] = $usuario['created_at'];
            }
            
            return [
                'success' => true,
                'data' => $usuarios,
                'message' => 'Usuarios obtenidos correctamente'
            ];
            
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener usuarios: ' . $e->getMessage()
            ];
        }
    }
    
    public function crearUsuario() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Validaciones básicas
            if (!isset($input['email']) || !isset($input['password']) || !isset($input['rol'])) {
                return [
                    'success' => false,
                    'message' => 'Email, password y rol son requeridos'
                ];
            }
            
            // Validar email
            if (!validateEmail($input['email'])) {
                return [
                    'success' => false,
                    'message' => 'Email inválido'
                ];
            }
            
            // Verificar que el email no exista
            $checkQuery = "SELECT id FROM usuarios WHERE email = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$input['email']]);
            
            if ($checkStmt->rowCount() > 0) {
                return [
                    'success' => false,
                    'message' => 'El email ya está registrado'
                ];
            }
            
            // Validar rol
            $rolesValidos = ['administrador', 'decano', 'director', 'docente'];
            if (!in_array($input['rol'], $rolesValidos)) {
                return [
                    'success' => false,
                    'message' => 'Rol inválido'
                ];
            }
            
            // Hash del password
            $hashedPassword = password_hash($input['password'], PASSWORD_DEFAULT);
            
            // Preparar datos
            $cod_fac = isset($input['cod_fac']) && !empty($input['cod_fac']) ? $input['cod_fac'] : null;
            $cod_esp = isset($input['cod_esp']) && !empty($input['cod_esp']) ? $input['cod_esp'] : null;
            // Convertir estado string a TINYINT
            $estado = isset($input['estado']) ? ($input['estado'] === 'activo' ? 1 : 0) : 1;
            
            // Validaciones específicas por rol
            if ($input['rol'] === 'decano' && !$cod_fac) {
                return [
                    'success' => false,
                    'message' => 'Los decanos deben tener una facultad asignada'
                ];
            }
            
            if ($input['rol'] === 'director' && (!$cod_fac || !$cod_esp)) {
                return [
                    'success' => false,
                    'message' => 'Los directores deben tener facultad y especialidad asignadas'
                ];
            }
            
            $query = "INSERT INTO usuarios (email, password, rol, cod_fac, cod_esp, estado) 
                     VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([
                $input['email'],
                $hashedPassword,
                $input['rol'],
                $cod_fac,
                $cod_esp,
                $estado
            ]);
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Usuario creado correctamente',
                    'data' => ['id' => $this->conn->lastInsertId()]
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'No se pudo crear el usuario'
                ];
            }
            
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al crear usuario: ' . $e->getMessage()
            ];
        }
    }
    
    public function actualizarUsuario() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Debug logging
            error_log("=== ACTUALIZAR USUARIO DEBUG ===");
            error_log("Raw input: " . file_get_contents('php://input'));
            error_log("Parsed input: " . json_encode($input));
            error_log("GET params: " . json_encode($_GET));
            error_log("REQUEST_METHOD: " . $_SERVER['REQUEST_METHOD']);
            
            // Obtener ID desde URL parameter
            $userId = $_GET['id'] ?? null;
            
            if (!$userId) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            // Verificar que el usuario existe
            $checkQuery = "SELECT id FROM usuarios WHERE id = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$userId]);
            
            if ($checkStmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ];
            }
            
            // Construir query dinámico
            $updateFields = [];
            $params = [];
            
            if (isset($input['email'])) {
                if (!validateEmail($input['email'])) {
                    return [
                        'success' => false,
                        'message' => 'Email inválido'
                    ];
                }
                
                // Verificar email único (excluyendo el usuario actual)
                $emailCheckQuery = "SELECT id FROM usuarios WHERE email = ? AND id != ?";
                $emailCheckStmt = $this->conn->prepare($emailCheckQuery);
                $emailCheckStmt->execute([$input['email'], $userId]);
                
                if ($emailCheckStmt->rowCount() > 0) {
                    return [
                        'success' => false,
                        'message' => 'El email ya está en uso'
                    ];
                }
                
                $updateFields[] = "email = ?";
                $params[] = $input['email'];
            }
            
            if (isset($input['password']) && !empty($input['password'])) {
                $updateFields[] = "password = ?";
                $params[] = password_hash($input['password'], PASSWORD_DEFAULT);
            }
            
            if (isset($input['rol'])) {
                $rolesValidos = ['administrador', 'decano', 'director', 'docente'];
                if (!in_array($input['rol'], $rolesValidos)) {
                    return [
                        'success' => false,
                        'message' => 'Rol inválido'
                    ];
                }
                $updateFields[] = "rol = ?";
                $params[] = $input['rol'];
            }
            
            if (isset($input['cod_fac'])) {
                $updateFields[] = "cod_fac = ?";
                $params[] = !empty($input['cod_fac']) ? $input['cod_fac'] : null;
            }
            
            if (isset($input['cod_esp'])) {
                $updateFields[] = "cod_esp = ?";
                $params[] = !empty($input['cod_esp']) ? $input['cod_esp'] : null;
            }
            
            if (isset($input['estado'])) {
                $updateFields[] = "estado = ?";
                // Convertir estado string a TINYINT
                $estadoValue = ($input['estado'] === 'activo') ? 1 : 0;
                $params[] = $estadoValue;
                error_log("Estado actualización: " . $input['estado'] . " -> " . $estadoValue);
            }
            
            if (empty($updateFields)) {
                return [
                    'success' => false,
                    'message' => 'No hay campos para actualizar'
                ];
            }
            
            $params[] = $userId; // Para el WHERE
            
            $query = "UPDATE usuarios SET " . implode(', ', $updateFields) . " WHERE id = ?";
            error_log("SQL Query: " . $query);
            error_log("SQL Params: " . json_encode($params));
            
            $stmt = $this->conn->prepare($query);
            $result = $stmt->execute($params);
            
            error_log("Query executed. Result: " . ($result ? 'true' : 'false'));
            error_log("Rows affected: " . $stmt->rowCount());
            
            return [
                'success' => true,
                'message' => 'Usuario actualizado correctamente'
            ];
            
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al actualizar usuario: ' . $e->getMessage()
            ];
        }
    }
    
    public function eliminarUsuario() {
        try {
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            // Verificar que no sea el administrador principal
            $checkQuery = "SELECT email, rol FROM usuarios WHERE id = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$id]);
            $usuario = $checkStmt->fetch();
            
            if (!$usuario) {
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ];
            }
            
            if ($usuario['email'] === 'admin@uma.edu.pe') {
                return [
                    'success' => false,
                    'message' => 'No se puede eliminar el administrador principal'
                ];
            }
            
            $query = "DELETE FROM usuarios WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Usuario eliminado correctamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'No se pudo eliminar el usuario'
                ];
            }
            
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al eliminar usuario: ' . $e->getMessage()
            ];
        }
    }
    
    public function obtenerFacultades() {
        try {
            $query = "SELECT cod_fac, nom_fac FROM facultades ORDER BY nom_fac";
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener facultades: ' . $e->getMessage()
            ];
        }
    }
    
    public function obtenerEspecialidades() {
        try {
            $cod_fac = $_GET['cod_fac'] ?? null;
            
            if ($cod_fac) {
                $query = "SELECT cod_esp, nom_esp FROM especialidades WHERE cod_fac = ? ORDER BY nom_esp";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$cod_fac]);
            } else {
                $query = "SELECT cod_esp, nom_esp, cod_fac FROM especialidades ORDER BY nom_esp";
                $stmt = $this->conn->prepare($query);
                $stmt->execute();
            }
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener especialidades: ' . $e->getMessage()
            ];
        }
    }

    public function asignarFacultadEspecialidad() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            // DEBUG: Log de datos recibidos
            error_log("Datos recibidos: " . json_encode($input));
            
            // Validaciones básicas
            if (!isset($input['user_id']) || !isset($input['facultad_id'])) {
                return [
                    'success' => false,
                    'message' => 'user_id y facultad_id son requeridos',
                    'debug' => $input
                ];
            }
            
            // Verificar que el usuario existe y es decano o director
            $checkQuery = "SELECT id, rol FROM usuarios WHERE id = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$input['user_id']]);
            $usuario = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$usuario) {
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ];
            }
            
            if (!in_array($usuario['rol'], ['decano', 'director'])) {
                return [
                    'success' => false,
                    'message' => 'Solo se puede asignar facultad/especialidad a decanos y directores'
                ];
            }
            
            // Verificar que la facultad existe
            $cod_fac = $input['facultad_id']; // El frontend envía el cod_fac directamente
            $facQuery = "SELECT cod_fac FROM facultades WHERE cod_fac = ?";
            $facStmt = $this->conn->prepare($facQuery);
            $facStmt->execute([$cod_fac]);
            
            if ($facStmt->rowCount() === 0) {
                return [
                    'success' => false,
                    'message' => 'Facultad no encontrada: ' . $cod_fac
                ];
            }
            
            $cod_esp = null;
            
            // Si se especifica especialidad, validarla
            if (isset($input['especialidad_id']) && !empty($input['especialidad_id'])) {
                $cod_esp = $input['especialidad_id']; // El frontend envía el cod_esp directamente
                $espQuery = "SELECT cod_esp FROM especialidades WHERE cod_fac = ? AND cod_esp = ?";
                $espStmt = $this->conn->prepare($espQuery);
                $espStmt->execute([$cod_fac, $cod_esp]);
                
                if ($espStmt->rowCount() === 0) {
                    return [
                        'success' => false,
                        'message' => 'Especialidad no encontrada para esta facultad: ' . $cod_esp
                    ];
                }
            }
            
            // Para directores es obligatorio especificar especialidad
            if ($usuario['rol'] === 'director' && !$cod_esp) {
                return [
                    'success' => false,
                    'message' => 'Los directores deben tener una especialidad asignada'
                ];
            }
            
            // Actualizar el usuario
            $updateQuery = "UPDATE usuarios SET cod_fac = ?, cod_esp = ? WHERE id = ?";
            $updateStmt = $this->conn->prepare($updateQuery);
            $result = $updateStmt->execute([$cod_fac, $cod_esp, $input['user_id']]);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Asignación realizada correctamente',
                    'data' => [
                        'user_id' => $input['user_id'],
                        'cod_fac' => $cod_fac,
                        'cod_esp' => $cod_esp,
                        'affected_rows' => $updateStmt->rowCount()
                    ]
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Error al ejecutar la actualización: ' . implode(', ', $updateStmt->errorInfo())
                ];
            }
            
        } catch(PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al asignar facultad/especialidad: ' . $e->getMessage()
            ];
        }
    }
}

// Procesar solicitudes
$usuariosAPI = new UsuariosAPI();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['action'])) {
            switch ($_GET['action']) {
                case 'facultades':
                    echo json_encode($usuariosAPI->obtenerFacultades());
                    break;
                case 'especialidades':
                    echo json_encode($usuariosAPI->obtenerEspecialidades());
                    break;
                default:
                    echo json_encode($usuariosAPI->obtenerUsuarios());
                    break;
            }
        } else {
            echo json_encode($usuariosAPI->obtenerUsuarios());
        }
        break;
        
    case 'POST':
        if (isset($_GET['action']) && $_GET['action'] === 'assign_faculty') {
            echo json_encode($usuariosAPI->asignarFacultadEspecialidad());
        } else {
            echo json_encode($usuariosAPI->crearUsuario());
        }
        break;
        
    case 'PUT':
        echo json_encode($usuariosAPI->actualizarUsuario());
        break;
        
    case 'DELETE':
        echo json_encode($usuariosAPI->eliminarUsuario());
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido'
        ]);
        break;
}
?>
