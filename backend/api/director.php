<?php
// ========================================================================
// API DEL DIRECTOR - ConvocaDocente
// Gestión de postulantes y evaluación de perfiles
// Autor: Linder Revilla
// ========================================================================

require_once '../config/database.php';

class DirectorAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // OBTENER POSTULANTES DE LA ESPECIALIDAD DEL DIRECTOR
    public function obtenerPostulantes() {
        try {
            $cod_fac = $_GET['cod_fac'] ?? null;
            $cod_esp = $_GET['cod_esp'] ?? null;
            
            if (!$cod_fac || !$cod_esp) {
                return [
                    'success' => false,
                    'message' => 'Código de facultad y especialidad requeridos'
                ];
            }
            
            $query = "SELECT 
                        p.id as postulacion_id,
                        p.user_id,
                        p.estado as estado_postulacion,
                        p.mensaje_entrevista,
                        p.fecha_postulacion,
                        u.email,
                        pp.nombres,
                        pp.apellidos,
                        pp.dni,
                        pp.telefono,
                        pp.direccion,
                        pp.fecha_nacimiento,
                        pp.cv_archivo,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad,
                        -- Contadores de formación y experiencia
                        (SELECT COUNT(*) FROM formacion_academica fa WHERE fa.user_id = u.id) as total_formacion,
                        (SELECT COUNT(*) FROM experiencia_laboral el WHERE el.user_id = u.id) as total_experiencia,
                        (SELECT COUNT(*) FROM docente_horarios dh WHERE dh.user_id = u.id) as total_horarios,
                        (SELECT COUNT(*) FROM docente_cursos dc WHERE dc.user_id = u.id) as total_cursos
                      FROM postulaciones p
                      INNER JOIN usuarios u ON p.user_id = u.id
                      LEFT JOIN perfil_personal pp ON u.id = pp.user_id
                      INNER JOIN facultades f ON p.cod_fac = f.cod_fac
                      INNER JOIN especialidades e ON p.cod_fac = e.cod_fac AND p.cod_esp = e.cod_esp
                      WHERE p.cod_fac = ? AND p.cod_esp = ?
                      ORDER BY 
                        CASE p.estado 
                            WHEN 'PENDIENTE' THEN 1
                            WHEN 'EVALUANDO' THEN 2
                            WHEN 'APROBADO' THEN 3
                            WHEN 'RECHAZADO' THEN 4
                        END,
                        p.fecha_postulacion DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$cod_fac, $cod_esp]);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener postulantes: ' . $e->getMessage()
            ];
        }
    }
    
    // OBTENER TODAS LAS POSTULACIONES (SOLO PARA ADMINISTRADOR)
    public function obtenerPostulantesAdmin() {
        try {
            $query = "SELECT 
                        p.id as postulacion_id,
                        p.user_id,
                        p.estado as estado_postulacion,
                        p.mensaje_entrevista,
                        p.fecha_postulacion,
                        u.email,
                        pp.nombres,
                        pp.apellidos,
                        pp.dni,
                        pp.telefono,
                        pp.direccion,
                        pp.fecha_nacimiento,
                        pp.cv_archivo,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad,
                        -- Contadores de formación y experiencia
                        (SELECT COUNT(*) FROM formacion_academica fa WHERE fa.user_id = u.id) as total_formacion,
                        (SELECT COUNT(*) FROM experiencia_laboral el WHERE el.user_id = u.id) as total_experiencia,
                        (SELECT COUNT(*) FROM docente_horarios dh WHERE dh.user_id = u.id) as total_horarios,
                        (SELECT COUNT(*) FROM docente_cursos dc WHERE dc.user_id = u.id) as total_cursos
                      FROM postulaciones p
                      INNER JOIN usuarios u ON p.user_id = u.id
                      LEFT JOIN perfil_personal pp ON u.id = pp.user_id
                      INNER JOIN facultades f ON p.cod_fac = f.cod_fac
                      INNER JOIN especialidades e ON p.cod_fac = e.cod_fac AND p.cod_esp = e.cod_esp
                      ORDER BY 
                        CASE p.estado 
                            WHEN 'PENDIENTE' THEN 1
                            WHEN 'EVALUANDO' THEN 2
                            WHEN 'APROBADO' THEN 3
                            WHEN 'RECHAZADO' THEN 4
                        END,
                        p.fecha_postulacion DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener postulantes: ' . $e->getMessage()
            ];
        }
    }
    
    // OBTENER PERFIL COMPLETO DEL POSTULANTE
    public function obtenerPerfilCompleto() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            // Datos personales
            $perfilQuery = "SELECT u.*, pp.* 
                           FROM usuarios u 
                           LEFT JOIN perfil_personal pp ON u.id = pp.user_id 
                           WHERE u.id = ?";
            $perfilStmt = $this->conn->prepare($perfilQuery);
            $perfilStmt->execute([$user_id]);
            $perfil = $perfilStmt->fetch();
            
            if (!$perfil) {
                return [
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ];
            }
            
            // Formación académica
            $formacionQuery = "SELECT * FROM formacion_academica WHERE user_id = ? ORDER BY fecha_obtencion DESC";
            $formacionStmt = $this->conn->prepare($formacionQuery);
            $formacionStmt->execute([$user_id]);
            $formacion = $formacionStmt->fetchAll();
            
            // Experiencia laboral
            $experienciaQuery = "SELECT * FROM experiencia_laboral WHERE user_id = ? ORDER BY fecha_inicio DESC";
            $experienciaStmt = $this->conn->prepare($experienciaQuery);
            $experienciaStmt->execute([$user_id]);
            $experiencia = $experienciaStmt->fetchAll();
            
            // Cursos postulados (de docente_cursos)
            $cursosQuery = "SELECT dc.*, c.c_nomcur, c.n_ciclo, c.modalidad, c.c_codcur, c.c_codfac, c.c_codesp
                           FROM docente_cursos dc
                           INNER JOIN cursos c ON dc.curso_id = c.id
                           WHERE dc.user_id = ?";
            $cursosStmt = $this->conn->prepare($cursosQuery);
            $cursosStmt->execute([$user_id]);
            $cursos = $cursosStmt->fetchAll();
            
            // Horarios disponibles
            $horariosQuery = "SELECT * FROM docente_horarios WHERE user_id = ? ORDER BY dia, hora_inicio";
            $horariosStmt = $this->conn->prepare($horariosQuery);
            $horariosStmt->execute([$user_id]);
            $horarios = $horariosStmt->fetchAll();
            
            return [
                'success' => true,
                'data' => [
                    'perfil' => $perfil,
                    'formacion_academica' => $formacion,
                    'experiencia_laboral' => $experiencia,
                    'docente_cursos' => $cursos,
                    'docente_horarios' => $horarios
                ]
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener perfil completo: ' . $e->getMessage()
            ];
        }
    }
    
    // ACTUALIZAR ESTADO DE POSTULACIÓN
    public function actualizarEstadoPostulacion() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['postulacion_id']) || !isset($input['nuevo_estado']) || !isset($input['director_id'])) {
                return [
                    'success' => false,
                    'message' => 'Datos incompletos (postulacion_id, nuevo_estado y director_id requeridos)'
                ];
            }
            
            $postulacion_id = $input['postulacion_id'];
            $nuevo_estado = $input['nuevo_estado'];
            $director_id = $input['director_id'];
            $mensaje_entrevista = $input['mensaje_entrevista'] ?? null;
            
            // Validar estados permitidos
            $estados_validos = ['PENDIENTE', 'EVALUANDO', 'APROBADO', 'RECHAZADO'];
            if (!in_array($nuevo_estado, $estados_validos)) {
                return [
                    'success' => false,
                    'message' => 'Estado no válido'
                ];
            }
            
            // Si es APROBADO, el mensaje es obligatorio
            if ($nuevo_estado === 'APROBADO' && empty($mensaje_entrevista)) {
                return [
                    'success' => false,
                    'message' => 'El mensaje de entrevista es obligatorio para postulaciones aprobadas'
                ];
            }
            
            // Actualizar postulación
            $updateQuery = "UPDATE postulaciones 
                           SET estado = ?, 
                               mensaje_entrevista = ?, 
                               evaluacion_director = ?,
                               updated_at = NOW()
                           WHERE id = ?";
            
            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->execute([$nuevo_estado, $mensaje_entrevista, $director_id, $postulacion_id]);
            
            if ($updateStmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => "Estado actualizado a: {$nuevo_estado}"
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'No se pudo actualizar el estado de la postulación'
                ];
            }
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al actualizar estado: ' . $e->getMessage()
            ];
        }
    }
}

// Procesar solicitudes
$api = new DirectorAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'postulantes';
        
        switch ($action) {
            case 'postulantes':
                echo json_encode($api->obtenerPostulantes());
                break;
                
            case 'postulantes_admin':
                echo json_encode($api->obtenerPostulantesAdmin());
                break;
                
            case 'perfil_completo':
                echo json_encode($api->obtenerPerfilCompleto());
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Acción no válida'
                ]);
                break;
        }
        break;
        
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'actualizar_estado';
        
        switch ($action) {
            case 'actualizar_estado':
                echo json_encode($api->actualizarEstadoPostulacion());
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Acción no válida'
                ]);
                break;
        }
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido'
        ]);
        break;
}
?>