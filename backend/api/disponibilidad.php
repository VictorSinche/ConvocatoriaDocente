<?php
// ========================================================================
// API DE DISPONIBILIDAD ACADÉMICA - ConvocaDocente
// Endpoints para gestionar horarios y cursos seleccionados
// CORRECCIÓN: Verificar si perfil está completado antes de permitir cambios
// Autor: Linder Revilla
// ========================================================================

require_once '../config/database.php';

class DisponibilidadAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // VERIFICAR SI EL PERFIL YA FUE ENVIADO (completado=1)
    private function verificarPerfilCompletado($user_id) {
        try {
            $query = "SELECT completado FROM perfil_personal WHERE user_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return $result && $result['completado'] == 1;
        } catch (PDOException $e) {
            return false;
        }
    }
    
    // OBTENER CURSOS ACTIVOS POR FACULTAD Y ESPECIALIDAD
    public function obtenerCursosActivos() {
        try {
            $cod_fac = $_GET['cod_fac'] ?? null;
            $cod_esp = $_GET['cod_esp'] ?? null;
            
            $query = "SELECT 
                        c.id,
                        c.c_codcur as codigo_curso,
                        c.c_nomcur as nombre_curso,
                        c.n_ciclo as ciclo,
                        c.modalidad,
                        c.c_codfac as codigo_facultad,
                        c.c_codesp as codigo_especialidad,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad
                      FROM cursos c
                      INNER JOIN facultades f ON c.c_codfac = f.cod_fac
                      INNER JOIN especialidades e ON c.c_codfac = e.cod_fac AND c.c_codesp = e.cod_esp
                      WHERE c.estado = 1"; // Solo cursos activos
            
            $params = [];
            
            if ($cod_fac) {
                $query .= " AND c.c_codfac = ?";
                $params[] = $cod_fac;
            }
            
            if ($cod_esp) {
                $query .= " AND c.c_codesp = ?";
                $params[] = $cod_esp;
            }
            
            $query .= " ORDER BY f.nom_fac, e.nom_esp, c.n_ciclo, c.c_nomcur";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            
            $cursos = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $cursos,
                'message' => 'Cursos activos obtenidos correctamente'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener cursos activos: ' . $e->getMessage()
            ];
        }
    }
    
    // OBTENER HORARIOS DEL DOCENTE
    public function obtenerHorarios() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $query = "SELECT id, dia, hora_inicio, hora_fin 
                     FROM docente_horarios 
                     WHERE user_id = ? 
                     ORDER BY 
                       CASE dia 
                         WHEN 'Lunes' THEN 1
                         WHEN 'Martes' THEN 2
                         WHEN 'Miércoles' THEN 3
                         WHEN 'Jueves' THEN 4
                         WHEN 'Viernes' THEN 5
                         WHEN 'Sábado' THEN 6
                         WHEN 'Domingo' THEN 7
                       END, hora_inicio";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener horarios: ' . $e->getMessage()
            ];
        }
    }
    
    // OBTENER CURSOS SELECCIONADOS DEL DOCENTE (DESDE docente_cursos)
    public function obtenerCursosSeleccionados() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $query = "SELECT 
                        dc.curso_id,
                        c.c_codcur as codigo_curso,
                        c.c_nomcur as nombre_curso,
                        c.n_ciclo as ciclo,
                        c.modalidad,
                        c.c_codfac as codigo_facultad,
                        c.c_codesp as codigo_especialidad,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad
                      FROM docente_cursos dc
                      INNER JOIN cursos c ON dc.curso_id = c.id
                      INNER JOIN facultades f ON c.c_codfac = f.cod_fac
                      INNER JOIN especialidades e ON c.c_codfac = e.cod_fac AND c.c_codesp = e.cod_esp
                      WHERE dc.user_id = ?
                      ORDER BY f.nom_fac, e.nom_esp, c.n_ciclo, c.c_nomcur";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener cursos seleccionados: ' . $e->getMessage()
            ];
        }
    }
    
    // GUARDAR HORARIOS DEL DOCENTE
    public function guardarHorarios() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['horarios'])) {
                return [
                    'success' => false,
                    'message' => 'Datos incompletos (user_id y horarios requeridos)'
                ];
            }
            
            $user_id = $input['user_id'];
            $horarios = $input['horarios'];
            
            // CORRECCIÓN: Verificar si el perfil ya fue completado
            if ($this->verificarPerfilCompletado($user_id)) {
                return [
                    'success' => false,
                    'message' => 'No se pueden modificar los horarios. El perfil ya ha sido enviado para evaluación.'
                ];
            }
            
            // Iniciar transacción
            $this->conn->beginTransaction();
            
            // Eliminar horarios existentes
            $deleteQuery = "DELETE FROM docente_horarios WHERE user_id = ?";
            $deleteStmt = $this->conn->prepare($deleteQuery);
            $deleteStmt->execute([$user_id]);
            
            // Insertar nuevos horarios
            $insertQuery = "INSERT INTO docente_horarios (user_id, dia, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)";
            $insertStmt = $this->conn->prepare($insertQuery);
            
            foreach ($horarios as $horario) {
                $insertStmt->execute([
                    $user_id,
                    $horario['dia'],
                    $horario['hora_inicio'],
                    $horario['hora_fin']
                ]);
            }
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Horarios guardados correctamente'
            ];
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            return [
                'success' => false,
                'message' => 'Error al guardar horarios: ' . $e->getMessage()
            ];
        }
    }

    // GUARDAR CURSOS SELECCIONADOS (SOLO EN docente_cursos)
    public function guardarCursos() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['cursos_seleccionados'])) {
                return [
                    'success' => false,
                    'message' => 'Datos incompletos (user_id y cursos_seleccionados requeridos)'
                ];
            }
            
            $user_id = $input['user_id'];
            $cursos_seleccionados = $input['cursos_seleccionados'];
            
            // CORRECCIÓN: Verificar si el perfil ya fue completado
            if ($this->verificarPerfilCompletado($user_id)) {
                return [
                    'success' => false,
                    'message' => 'No se pueden modificar los cursos seleccionados. El perfil ya ha sido enviado para evaluación.'
                ];
            }
            
            if (empty($cursos_seleccionados)) {
                return [
                    'success' => false,
                    'message' => 'Debe seleccionar al menos un curso'
                ];
            }
            
            // Iniciar transacción
            $this->conn->beginTransaction();
            
            // Eliminar cursos existentes del usuario
            $deleteQuery = "DELETE FROM docente_cursos WHERE user_id = ?";
            $deleteStmt = $this->conn->prepare($deleteQuery);
            $deleteStmt->execute([$user_id]);
            
            // Insertar cursos seleccionados
            $insertQuery = "INSERT INTO docente_cursos (user_id, curso_id) VALUES (?, ?)";
            $insertStmt = $this->conn->prepare($insertQuery);
            
            foreach ($cursos_seleccionados as $curso_id) {
                $insertStmt->execute([$user_id, $curso_id]);
            }
            
            $this->conn->commit();
            
            return [
                'success' => true,
                'message' => 'Cursos guardados correctamente'
            ];
            
        } catch (PDOException $e) {
            $this->conn->rollBack();
            return [
                'success' => false,
                'message' => 'Error al guardar cursos: ' . $e->getMessage()
            ];
        }
    }
    
    // AGREGAR HORARIO INDIVIDUAL
    public function agregarHorario() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['dia']) || 
                !isset($input['hora_inicio']) || !isset($input['hora_fin'])) {
                return [
                    'success' => false,
                    'message' => 'Datos incompletos (user_id, dia, hora_inicio, hora_fin requeridos)'
                ];
            }
            
            $user_id = $input['user_id'];
            
            // Verificar si el perfil ya fue completado
            if ($this->verificarPerfilCompletado($user_id)) {
                return [
                    'success' => false,
                    'message' => 'No se pueden agregar horarios. El perfil ya ha sido enviado para evaluación.'
                ];
            }
            
            $insertQuery = "INSERT INTO docente_horarios (user_id, dia, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)";
            $stmt = $this->conn->prepare($insertQuery);
            $stmt->execute([
                $user_id,
                $input['dia'],
                $input['hora_inicio'],
                $input['hora_fin']
            ]);
            
            return [
                'success' => true,
                'message' => 'Horario agregado exitosamente',
                'id' => $this->conn->lastInsertId()
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al agregar horario: ' . $e->getMessage()
            ];
        }
    }
    
    // ELIMINAR HORARIO INDIVIDUAL
    public function eliminarHorario() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['horario_id'])) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario y horario requeridos'
                ];
            }
            
            $user_id = $input['user_id'];
            $horario_id = $input['horario_id'];
            
            // Verificar si el perfil ya fue completado
            if ($this->verificarPerfilCompletado($user_id)) {
                return [
                    'success' => false,
                    'message' => 'No se pueden eliminar horarios. El perfil ya ha sido enviado para evaluación.'
                ];
            }
            
            $deleteQuery = "DELETE FROM docente_horarios WHERE id = ? AND user_id = ?";
            $stmt = $this->conn->prepare($deleteQuery);
            $stmt->execute([$horario_id, $user_id]);
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Horario eliminado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'No se encontró el horario a eliminar'
                ];
            }
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al eliminar horario: ' . $e->getMessage()
            ];
        }
    }
    
    // AGREGAR CURSO INDIVIDUAL
    public function agregarCurso() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['curso_id'])) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario y curso requeridos'
                ];
            }
            
            $user_id = $input['user_id'];
            $curso_id = $input['curso_id'];
            
            // Verificar si el perfil ya fue completado
            if ($this->verificarPerfilCompletado($user_id)) {
                return [
                    'success' => false,
                    'message' => 'No se pueden agregar cursos. El perfil ya ha sido enviado para evaluación.'
                ];
            }
            
            // Verificar si el curso ya está seleccionado
            $checkQuery = "SELECT id FROM docente_cursos WHERE user_id = ? AND curso_id = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$user_id, $curso_id]);
            
            if ($checkStmt->fetch()) {
                return [
                    'success' => false,
                    'message' => 'Este curso ya está seleccionado'
                ];
            }
            
            $insertQuery = "INSERT INTO docente_cursos (user_id, curso_id) VALUES (?, ?)";
            $stmt = $this->conn->prepare($insertQuery);
            $stmt->execute([$user_id, $curso_id]);
            
            return [
                'success' => true,
                'message' => 'Curso agregado exitosamente',
                'id' => $this->conn->lastInsertId()
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al agregar curso: ' . $e->getMessage()
            ];
        }
    }
    
    // ELIMINAR CURSO INDIVIDUAL
    public function eliminarCurso() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['curso_id'])) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario y curso requeridos'
                ];
            }
            
            $user_id = $input['user_id'];
            $curso_id = $input['curso_id'];
            
            // Verificar si el perfil ya fue completado
            if ($this->verificarPerfilCompletado($user_id)) {
                return [
                    'success' => false,
                    'message' => 'No se pueden eliminar cursos. El perfil ya ha sido enviado para evaluación.'
                ];
            }
            
            $deleteQuery = "DELETE FROM docente_cursos WHERE user_id = ? AND curso_id = ?";
            $stmt = $this->conn->prepare($deleteQuery);
            $stmt->execute([$user_id, $curso_id]);
            
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Curso eliminado exitosamente'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'No se encontró el curso a eliminar'
                ];
            }
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al eliminar curso: ' . $e->getMessage()
            ];
        }
    }

    // NUEVO: VERIFICAR ESTADO DEL PERFIL
    public function verificarEstadoPerfil() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $perfilCompletado = $this->verificarPerfilCompletado($user_id);
            
            return [
                'success' => true,
                'data' => [
                    'perfil_completado' => $perfilCompletado,
                    'puede_modificar' => !$perfilCompletado
                ],
                'message' => 'Estado del perfil verificado'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al verificar estado: ' . $e->getMessage()
            ];
        }
    }
}

// Procesar solicitudes
$api = new DisponibilidadAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'cursos';
        
        switch ($action) {
            case 'cursos':
                echo json_encode($api->obtenerCursosActivos());
                break;
            case 'horarios':
                echo json_encode($api->obtenerHorarios());
                break;
            case 'cursos_seleccionados':
                echo json_encode($api->obtenerCursosSeleccionados());
                break;
            case 'verificar_estado':
                echo json_encode($api->verificarEstadoPerfil());
                break;
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Acción no válida'
                ]);
                break;
        }
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'guardar';
        
        switch ($action) {
            case 'guardar_horarios':
                echo json_encode($api->guardarHorarios());
                break;
            case 'guardar_cursos':
                echo json_encode($api->guardarCursos());
                break;
            case 'agregar_horario':
                echo json_encode($api->agregarHorario());
                break;
            case 'agregar_curso':
                echo json_encode($api->agregarCurso());
                break;
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Acción no válida'
                ]);
                break;
        }
        break;
        
    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
        
        switch ($action) {
            case 'eliminar_horario':
                echo json_encode($api->eliminarHorario());
                break;
            case 'eliminar_curso':
                echo json_encode($api->eliminarCurso());
                break;
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Acción no válida para DELETE'
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