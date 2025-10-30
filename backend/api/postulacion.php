<?php
// ========================================================================
// API DE POSTULACIONES - ConvocaDocente
//  postulaciones a especialidades
// ========================================================================

require_once '../config/database.php';

class PostulacionAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // OBTENER POSTULACIONES DEL DOCENTE (SOLO DE TABLA postulaciones)
    public function obtenerPostulaciones() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                return [
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ];
            }
            
            $query = "SELECT 
                        p.id,
                        p.cod_fac,
                        p.cod_esp,
                        p.estado,
                        p.mensaje_entrevista,
                        p.fecha_postulacion,
                        f.nom_fac as nombre_facultad,
                        e.nom_esp as nombre_especialidad
                      FROM postulaciones p
                      INNER JOIN facultades f ON p.cod_fac = f.cod_fac
                      INNER JOIN especialidades e ON p.cod_fac = e.cod_fac AND p.cod_esp = e.cod_esp
                      WHERE p.user_id = ?
                      ORDER BY p.fecha_postulacion DESC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id]);
            
            return [
                'success' => true,
                'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener postulaciones: ' . $e->getMessage()
            ];
        }
    }
    
    // POSTULAR A UNA ESPECIALIDAD (SOLO REGISTRA EN TABLA postulaciones)
    public function postularEspecialidad() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['user_id']) || !isset($input['cod_fac']) || !isset($input['cod_esp'])) {
                return [
                    'success' => false,
                    'message' => 'Datos incompletos (user_id, cod_fac y cod_esp requeridos)'
                ];
            }
            
            $user_id = $input['user_id'];
            $cod_fac = $input['cod_fac'];
            $cod_esp = $input['cod_esp'];
            
            // Verificar si ya se postuló a esta especialidad
            $checkQuery = "SELECT id FROM postulaciones WHERE user_id = ? AND cod_fac = ? AND cod_esp = ?";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->execute([$user_id, $cod_fac, $cod_esp]);
            
            if ($checkStmt->rowCount() > 0) {
                return [
                    'success' => false,
                    'message' => 'Ya se encuentra postulado a esta especialidad'
                ];
            }
            
            // Verificar que la especialidad existe
            $espQuery = "SELECT nom_esp FROM especialidades WHERE cod_fac = ? AND cod_esp = ?";
            $espStmt = $this->conn->prepare($espQuery);
            $espStmt->execute([$cod_fac, $cod_esp]);
            $especialidad = $espStmt->fetch();
            
            if (!$especialidad) {
                return [
                    'success' => false,
                    'message' => 'La especialidad seleccionada no existe'
                ];
            }
            
            // Insertar postulación a la especialidad
            $insertQuery = "INSERT INTO postulaciones (user_id, cod_fac, cod_esp, estado, fecha_postulacion) 
                           VALUES (?, ?, ?, 'PENDIENTE', NOW())";
            $insertStmt = $this->conn->prepare($insertQuery);
            $insertStmt->execute([$user_id, $cod_fac, $cod_esp]);
            
            return [
                'success' => true,
                'message' => 'Postulación a la especialidad registrada correctamente',
                'data' => ['id' => $this->conn->lastInsertId()]
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al registrar postulación: ' . $e->getMessage()
            ];
        }
    }
    
}

// Procesar solicitudes
$api = new PostulacionAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $action = $_GET['action'] ?? 'postulaciones';
        
        switch ($action) {
            case 'postulaciones':
                echo json_encode($api->obtenerPostulaciones());
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
        $action = $input['action'] ?? 'postular';
        
        switch ($action) {
            case 'postular_especialidad':
                echo json_encode($api->postularEspecialidad());
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