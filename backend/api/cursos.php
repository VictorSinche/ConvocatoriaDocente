<?php
// ========================================================================
// API DE CURSOS - ConvocaDocente (MEJORADA PARA DIRECTORES)
// Endpoints: GET /cursos, PUT /cursos (con filtros por especialidad)
// Autor: Linder Revilla - Mejorado por Alex
// ========================================================================

require_once '../config/database.php';

class CursosAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // OBTENER CURSOS (FILTRADO POR ROL Y ESPECIALIDAD)
    public function obtenerCursos() {
        try {
            // Obtener parámetros de filtro
            $user_id = $_GET['user_id'] ?? null;
            $rol = $_GET['rol'] ?? null;
            $cod_esp = $_GET['cod_esp'] ?? null;
            
            // Query base
            $query = "SELECT 
                        c.id,
                        c.n_codper,
                        c.c_codfac,
                        c.c_codesp, 
                        c.c_codcur,
                        c.c_nomcur,
                        c.n_ciclo,
                        c.estado,
                        c.user_id,
                        c.modalidad,
                        c.created_at,
                        c.updated_at,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad,
                        u.email as activado_por,
                        u.rol as rol_activador,
                        COUNT(dc.id) as total_postulantes
                      FROM cursos c
                      INNER JOIN facultades f ON c.c_codfac = f.cod_fac
                      INNER JOIN especialidades e ON c.c_codfac = e.cod_fac AND c.c_codesp = e.cod_esp
                      LEFT JOIN usuarios u ON c.user_id = u.id
                      LEFT JOIN docente_cursos dc ON c.id = dc.curso_id";
            
            $params = [];
            $whereConditions = [];
            
            // FILTRO PARA DIRECTORES: Solo cursos de su especialidad
            if ($rol === 'director' && $cod_esp) {
                $whereConditions[] = "c.c_codesp = ?";
                $params[] = $cod_esp;
            }
            
            // Agregar WHERE si hay condiciones
            if (!empty($whereConditions)) {
                $query .= " WHERE " . implode(" AND ", $whereConditions);
            }
            
            $query .= " GROUP BY c.id ORDER BY c.c_nomcur ASC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            
            $cursos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $cursos,
                'message' => 'Cursos obtenidos correctamente',
                'filtros_aplicados' => [
                    'rol' => $rol,
                    'cod_esp' => $cod_esp
                ]
            ];
            
        } catch(PDOException $e) {
            error_log("Error en obtenerCursos: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error al obtener cursos: ' . $e->getMessage()
            ];
        }
    }
    
    // ACTUALIZAR ESTADO DE CURSO (CON VALIDACIÓN DE PERMISOS)
    public function actualizarEstadoCurso() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['id']) || !isset($input['estado']) || !isset($input['user_id'])) {
                return [
                    'success' => false,
                    'message' => 'Datos incompletos (id, estado, user_id requeridos)'
                ];
            }
            
            $curso_id = $input['id'];
            $nuevo_estado = $input['estado'];
            $user_id = $input['user_id'];
            $rol = $input['rol'] ?? null;
            $cod_esp_usuario = $input['cod_esp'] ?? null;
            
            // VALIDACIÓN: Solo directores pueden modificar cursos de su especialidad
            if ($rol === 'director' && $cod_esp_usuario) {
                $validationQuery = "SELECT c.c_codesp FROM cursos c WHERE c.id = ?";
                $validationStmt = $this->conn->prepare($validationQuery);
                $validationStmt->execute([$curso_id]);
                $curso = $validationStmt->fetch();
                
                if (!$curso || $curso['c_codesp'] !== $cod_esp_usuario) {
                    return [
                        'success' => false,
                        'message' => 'No tiene permisos para modificar este curso'
                    ];
                }
            }
            
            // Actualizar estado del curso
            if ($nuevo_estado == 1) {
                // Activar curso: registrar quién lo activó
                $query = "UPDATE cursos SET estado = ?, user_id = ?, updated_at = NOW() WHERE id = ?";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$nuevo_estado, $user_id, $curso_id]);
            } else {
                // Desactivar curso: mantener user_id pero cambiar estado
                $query = "UPDATE cursos SET estado = ?, updated_at = NOW() WHERE id = ?";
                $stmt = $this->conn->prepare($query);
                $stmt->execute([$nuevo_estado, $curso_id]);
            }
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Estado del curso actualizado correctamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'No se pudo actualizar el estado del curso'
                ];
            }
            
        } catch(PDOException $e) {
            error_log("Error en actualizarEstadoCurso: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error al actualizar estado: ' . $e->getMessage()
            ];
        }
    }
    
    // OBTENER POSTULANTES A CURSOS DE UNA ESPECIALIDAD (PARA DIRECTORES)
    public function obtenerPostulantesPorEspecialidad() {
        try {
            $cod_esp = $_GET['cod_esp'] ?? null;
            $cod_fac = $_GET['cod_fac'] ?? null;
            
            if (!$cod_esp || !$cod_fac) {
                return [
                    'success' => false,
                    'message' => 'Código de especialidad y facultad requeridos'
                ];
            }
            
            $query = "SELECT 
                        p.id as postulacion_id,
                        p.estado as estado_postulacion,
                        p.mensaje_entrevista,
                        p.fecha_postulacion,
                        p.updated_at,
                        u.id as user_id,
                        u.email,
                        pp.nombres,
                        pp.apellidos,
                        pp.dni,
                        pp.telefono,
                        pp.cv_archivo,
                        pp.completado as perfil_completado,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad,
                        -- Contar formación académica
                        (SELECT COUNT(*) FROM formacion_academica fa WHERE fa.user_id = u.id) as total_formacion,
                        -- Contar experiencia laboral
                        (SELECT COUNT(*) FROM experiencia_laboral el WHERE el.user_id = u.id) as total_experiencia,
                        -- Contar disponibilidad horaria
                        (SELECT COUNT(*) FROM docente_horarios dh WHERE dh.user_id = u.id) as total_horarios
                      FROM postulaciones p
                      INNER JOIN usuarios u ON p.user_id = u.id
                      INNER JOIN facultades f ON p.cod_fac = f.cod_fac
                      INNER JOIN especialidades e ON p.cod_fac = e.cod_fac AND p.cod_esp = e.cod_esp
                      LEFT JOIN perfil_personal pp ON u.id = pp.user_id
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
            
            $postulantes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $postulantes,
                'message' => 'Postulantes obtenidos correctamente',
                'total' => count($postulantes)
            ];
            
        } catch(PDOException $e) {
            error_log("Error en obtenerPostulantesPorEspecialidad: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error al obtener postulantes: ' . $e->getMessage()
            ];
        }
    }
}

// ========================================================================
// PROCESAMIENTO DE SOLICITUDES
// ========================================================================

$cursosAPI = new CursosAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'cursos';
        
        switch ($action) {
            case 'cursos':
                echo json_encode($cursosAPI->obtenerCursos());
                break;
                
            case 'postulantes':
                echo json_encode($cursosAPI->obtenerPostulantesPorEspecialidad());
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
        echo json_encode($cursosAPI->actualizarEstadoCurso());
        break;
        
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido'
        ]);
        break;
}
?>