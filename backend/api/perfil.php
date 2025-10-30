<?php
// ========================================================================
// API DE PERFIL DOCENTE - ConvocaDocente
// Endpoints para gestionar el perfil completo del docente
// Autor: Linder Revilla
// ========================================================================

require_once '../config/database.php';

class PerfilAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // OBTENER PERFIL PERSONAL DEL DOCENTE
    public function obtenerPerfil() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $query = "SELECT * FROM perfil_personal WHERE user_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            
            $perfil = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $perfil ?: [],
                'message' => 'Perfil obtenido correctamente'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener perfil: ' . $e->getMessage()
            ];
        }
    }
    
    // GUARDAR O ACTUALIZAR PERFIL PERSONAL
    public function guardarPerfil($input = null, $files = []) {
        try {
            // Si no se pasa input, intentar obtenerlo como antes (compatibilidad)
            if ($input === null) {
                $input = json_decode(file_get_contents('php://input'), true);
            }
            
            if (!isset($input['user_id']) || empty($input['user_id'])) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $user_id = $input['user_id'];
            
            // Manejar subida de archivo CV si existe
            $cv_archivo = $input['cv_archivo'] ?? null;
            
            if (isset($files['cv'])) {
                error_log("DEBUG: Archivo CV detectado - Error: " . $files['cv']['error']);
                
                if ($files['cv']['error'] === UPLOAD_ERR_OK) {
                    try {
                        $cv_archivo = $this->subirCV($files['cv'], $user_id);
                        // Actualizar el input con la ruta del archivo
                        $input['cv_archivo'] = $cv_archivo;
                        error_log("DEBUG: CV subido exitosamente: " . $cv_archivo);
                    } catch (Exception $e) {
                        error_log("ERROR subiendo CV: " . $e->getMessage());
                        return [
                            'success' => false,
                            'message' => $e->getMessage()
                        ];
                    }
                } else {
                    error_log("ERROR en archivo CV: " . $files['cv']['error']);
                }
            } else {
                error_log("DEBUG: No se detectó archivo CV en la petición");
            }
            
            // Verificar si ya existe un perfil
            $checkQuery = "SELECT id FROM perfil_personal WHERE user_id = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$user_id]);
            $exists = $checkStmt->fetch();
            
            if ($exists) {
                // Actualizar perfil existente
                $updateFields = [];
                $params = [];
                
                $allowedFields = [
                    'nombres', 'apellidos', 'dni', 'fecha_nacimiento', 
                    'genero', 'nacionalidad', 'direccion', 'telefono', 
                    'email', 'cv_archivo'
                ];
                
                foreach ($allowedFields as $field) {
                    if (isset($input[$field])) {
                        $updateFields[] = "$field = ?";
                        $params[] = $input[$field];
                    }
                }
                
                if (!empty($updateFields)) {
                    $params[] = $user_id;
                    $query = "UPDATE perfil_personal SET " . implode(', ', $updateFields) . " WHERE user_id = ?";
                    $stmt = $this->conn->prepare($query);
                    $stmt->execute($params);
                }
                
                return [
                    'success' => true,
                    'message' => 'Perfil actualizado correctamente',
                    'cv_archivo' => $cv_archivo
                ];
                
            } else {
                // Crear nuevo perfil
                $query = "INSERT INTO perfil_personal (
                    user_id, nombres, apellidos, dni, fecha_nacimiento, 
                    genero, nacionalidad, direccion, telefono, email, cv_archivo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                
                $stmt = $this->conn->prepare($query);
                $stmt->execute([
                    $user_id,
                    $input['nombres'] ?? null,
                    $input['apellidos'] ?? null,
                    $input['dni'] ?? null,
                    $input['fecha_nacimiento'] ?? null,
                    $input['genero'] ?? null,
                    $input['nacionalidad'] ?? null,
                    $input['direccion'] ?? null,
                    $input['telefono'] ?? null,
                    $input['email'] ?? null,
                    $input['cv_archivo'] ?? null
                ]);
                
                return [
                    'success' => true,
                    'message' => 'Perfil creado correctamente',
                    'data' => ['id' => $this->conn->lastInsertId()],
                    'cv_archivo' => $cv_archivo
                ];
            }
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al guardar perfil: ' . $e->getMessage()
            ];
        }
    }
    
    // VALIDAR COMPLETITUD DEL PERFIL
    public function validarPerfil() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $validacion = [
                'datos_personales' => $this->validarDatosPersonales($user_id),
                'formacion_academica' => $this->validarFormacionAcademica($user_id),
                'experiencia_laboral' => $this->validarExperienciaLaboral($user_id),
                'disponibilidad_academica' => $this->validarDisponibilidadAcademica($user_id)
            ];
            
            $porcentaje = 0;
            foreach ($validacion as $seccion) {
                if ($seccion['completado']) {
                    $porcentaje += 25;
                }
            }
            
            return [
                'success' => true,
                'data' => [
                    'validacion' => $validacion,
                    'porcentaje_completitud' => $porcentaje,
                    'perfil_completo' => $porcentaje >= 100
                ],
                'message' => 'Validación completada'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al validar perfil: ' . $e->getMessage()
            ];
        }
    }
    
    private function validarDatosPersonales($user_id) {
        $query = "SELECT nombres, apellidos, dni, telefono, direccion, cv_archivo FROM perfil_personal WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$user_id]);
        $datos = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $campos_requeridos = ['nombres', 'apellidos', 'dni', 'telefono', 'direccion', 'cv_archivo'];
        $campos_completados = [];
        $observaciones = [];
        
        if ($datos) {
            foreach ($campos_requeridos as $campo) {
                if (!empty($datos[$campo])) {
                    $campos_completados[] = $campo;
                }
            }
        }
        
        $completado = count($campos_completados) === count($campos_requeridos);
        
        if (!$completado) {
            $observaciones[] = 'Complete toda su información personal';
        }
        
        return [
            'completado' => $completado,
            'observaciones' => $observaciones,
            'campos_completados' => count($campos_completados),
            'campos_totales' => count($campos_requeridos)
        ];
    }
    
    private function validarFormacionAcademica($user_id) {
        $query = "SELECT COUNT(*) as total FROM formacion_academica WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$user_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $total = $result['total'];
        $completado = $total >= 1;
        $observaciones = [];
        
        if (!$completado) {
            $observaciones[] = 'Debe registrar al menos un título o certificación';
        }
        
        return [
            'completado' => $completado,
            'observaciones' => $observaciones,
            'registros_actuales' => $total,
            'minimo_requerido' => 1
        ];
    }
    
    private function validarExperienciaLaboral($user_id) {
        $query = "SELECT COUNT(*) as total FROM experiencia_laboral WHERE user_id = ? AND sin_experiencia = 0";
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$user_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $total = $result['total'];
        $completado = $total >= 1;
        $observaciones = [];
        
        if (!$completado) {
            $observaciones[] = 'Debe registrar al menos una experiencia laboral';
        }
        
        return [
            'completado' => $completado,
            'observaciones' => $observaciones,
            'registros_actuales' => $total,
            'minimo_requerido' => 1
        ];
    }
    
    private function validarDisponibilidadAcademica($user_id) {
        // Verificar horarios
        $queryHorarios = "SELECT COUNT(*) as total FROM docente_horarios WHERE user_id = ?";
        $stmtHorarios = $this->conn->prepare($queryHorarios);
        $stmtHorarios->execute([$user_id]);
        $horarios = $stmtHorarios->fetch(PDO::FETCH_ASSOC)['total'];
        
        // Verificar postulaciones
        $queryPostulaciones = "SELECT COUNT(*) as total FROM docente_cursos WHERE user_id = ?";
        $stmtPostulaciones = $this->conn->prepare($queryPostulaciones);
        $stmtPostulaciones->execute([$user_id]);
        $postulaciones = $stmtPostulaciones->fetch(PDO::FETCH_ASSOC)['total'];
        
        $completado = $horarios >= 1 && $postulaciones >= 1;
        $observaciones = [];
        
        if ($horarios === 0) {
            $observaciones[] = 'Debe definir al menos un horario disponible';
        }
        if ($postulaciones === 0) {
            $observaciones[] = 'Debe postularse a al menos un curso';
        }
        
        return [
            'completado' => $completado,
            'observaciones' => $observaciones,
            'horarios_definidos' => $horarios,
            'postulaciones_realizadas' => $postulaciones
        ];
    }
    
    // ENVIAR PERFIL PARA VALIDACIÓN
    public function enviarValidacion() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id'])) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $user_id = $input['user_id'];
            
            // Verificar que el perfil esté completo usando validación directa
            $validacion = [
                'datos_personales' => $this->validarDatosPersonales($user_id),
                'formacion_academica' => $this->validarFormacionAcademica($user_id),
                'experiencia_laboral' => $this->validarExperienciaLaboral($user_id),
                'disponibilidad_academica' => $this->validarDisponibilidadAcademica($user_id)
            ];
            
            $porcentaje = 0;
            foreach ($validacion as $seccion) {
                if ($seccion['completado']) {
                    $porcentaje += 25;
                }
            }
            
            $perfil_completo = $porcentaje >= 100;
            
            if (!$perfil_completo) {
                // Crear mensaje detallado de qué falta
                $faltantes = [];
                foreach ($validacion as $nombre => $seccion) {
                    if (!$seccion['completado']) {
                        $faltantes[] = str_replace('_', ' ', $nombre) . ': ' . implode(', ', $seccion['observaciones']);
                    }
                }
                
                return [
                    'success' => false,
                    'message' => 'El perfil debe estar 100% completo para enviar a validación. Faltan: ' . implode('; ', $faltantes)
                ];
            }
            
            // Marcar perfil como completado
            $query = "UPDATE perfil_personal SET completado = 1 WHERE user_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            
            // Si no existe registro en perfil_personal, crearlo
            if ($stmt->rowCount() === 0) {
                $insertQuery = "INSERT INTO perfil_personal (user_id, completado) VALUES (?, 1) 
                               ON DUPLICATE KEY UPDATE completado = 1";
                $insertStmt = $this->conn->prepare($insertQuery);
                $insertStmt->execute([$user_id]);
            }
            
            return [
                'success' => true,
                'message' => 'Perfil enviado para validación correctamente'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al enviar perfil para validación: ' . $e->getMessage()
            ];
        }
    }
    
    // OBTENER ESTADO DEL PERFIL
    public function obtenerEstado() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $query = "SELECT completado, created_at FROM perfil_personal WHERE user_id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            $estado = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $estado ?: ['completado' => 0, 'created_at' => null]
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener estado: ' . $e->getMessage()
            ];
        }
    }
    
    // SUBIR ARCHIVO CV - VERSIÓN SIMPLE PARA DEBUGGING
    private function subirCV($archivo, $user_id) {
        // LOG COMPLETO del archivo recibido
        error_log("=== SUBIR CV INICIADO ===");
        error_log("Usuario ID: " . $user_id);
        error_log("Archivo recibido: " . print_r($archivo, true));
        
        try {
            // Validaciones básicas
            if (!isset($archivo['tmp_name']) || !$archivo['tmp_name']) {
                throw new Exception('No se recibió archivo temporal');
            }
            
            if (!file_exists($archivo['tmp_name'])) {
                throw new Exception('Archivo temporal no existe: ' . $archivo['tmp_name']);
            }
            
            // Crear carpeta simple dentro de cv
            $uploadDir = __DIR__ . "/../../uploads/cv/usuario_{$user_id}/";
            error_log("Directorio destino: " . $uploadDir);
            
            if (!is_dir($uploadDir)) {
                $created = mkdir($uploadDir, 0777, true);
                error_log("Directorio creado: " . ($created ? 'SÍ' : 'NO'));
            }
            
            // Archivo destino
            $destFile = $uploadDir . "cv.pdf";
            error_log("Archivo destino: " . $destFile);
            
            // Intentar mover archivo
            if (move_uploaded_file($archivo['tmp_name'], $destFile)) {
                error_log("✅ ARCHIVO MOVIDO EXITOSAMENTE");
                
                // Verificar que existe
                if (file_exists($destFile)) {
                    error_log("✅ ARCHIVO CONFIRMADO: " . filesize($destFile) . " bytes");
                    // CAMBIO: Solo retornar el nombre del archivo, NO la ruta completa
                    return "cv.pdf";
                } else {
                    throw new Exception('Archivo no encontrado después de mover');
                }
            } else {
                throw new Exception('move_uploaded_file falló');
            }
            
        } catch (Exception $e) {
            error_log("❌ ERROR EN SUBIR CV: " . $e->getMessage());
            throw $e;
        }
    }
    
    // ELIMINAR CV ANTERIOR para evitar archivos basura
    private function eliminarCVAnterior($user_id, $userUploadDir) {
        try {
            // Eliminar CV actual del usuario
            $currentCV = $userUploadDir . "cv.pdf";
            if (file_exists($currentCV)) {
                unlink($currentCV);
            }
            
            // Limpiar también archivos del formato anterior (retrocompatibilidad)
            $oldFormatDir = "../uploads/cv/";
            if (is_dir($oldFormatDir)) {
                $oldFiles = glob($oldFormatDir . "cv_usuario_{$user_id}.pdf");
                foreach ($oldFiles as $file) {
                    if (file_exists($file)) {
                        unlink($file);
                    }
                }
                
                // También archivos con timestamp
                $timestampFiles = glob($oldFormatDir . "cv_{$user_id}_*.pdf");
                foreach ($timestampFiles as $file) {
                    if (file_exists($file)) {
                        unlink($file);
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Error eliminando CV anterior: " . $e->getMessage());
        }
    }
    
    // FUNCIÓN HELPER: Obtener ruta completa del archivo CV
    public static function obtenerRutaCV($user_id, $nombre_archivo) {
        if (!$nombre_archivo) return null;
        
        $uploadDir = __DIR__ . "/../../uploads/cv/usuario_{$user_id}/";
        return $uploadDir . $nombre_archivo;
    }
}

// Procesar solicitudes
$api = new PerfilAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'perfil';
        
        switch ($action) {
            case 'perfil':
                echo json_encode($api->obtenerPerfil());
                break;
            case 'validar':
                echo json_encode($api->validarPerfil());
                break;
            case 'estado':
                echo json_encode($api->obtenerEstado());
                break;
            default:
                echo json_encode($api->obtenerPerfil());
                break;
        }
        break;
        
    case 'POST':
        // DEBUG: Log de información de la petición
        error_log("=== DEBUG POST REQUEST ===");
        error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'No definido'));
        error_log("POST data: " . print_r($_POST, true));
        error_log("FILES data: " . print_r($_FILES, true));
        
        // Verificar si es FormData (cuando hay archivos) o JSON
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        
        if (strpos($contentType, 'multipart/form-data') !== false || !empty($_FILES)) {
            // Es FormData, usar $_POST y $_FILES
            $input = $_POST;
            $files = $_FILES;
            error_log("Usando FormData - POST y FILES");
        } else {
            // Es JSON
            $input = json_decode(file_get_contents('php://input'), true);
            $files = [];
            error_log("Usando JSON input");
        }
        
        $action = $input['action'] ?? 'guardar';
        
        switch ($action) {
            case 'guardar':
                echo json_encode($api->guardarPerfil($input, $files));
                break;
            case 'enviar_validacion':
                echo json_encode($api->enviarValidacion());
                break;
            case 'completar_perfil':
                echo json_encode($api->enviarValidacion());
                break;
            default:
                echo json_encode($api->guardarPerfil($input, $files));
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