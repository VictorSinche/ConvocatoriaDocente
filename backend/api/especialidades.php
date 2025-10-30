<?php
require_once '../config/database.php';

class EspecialidadesAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // OBTENER TODAS LAS ESPECIALIDADES - SOLO LECTURA
    public function obtenerEspecialidades() {
        try {
            $query = "SELECT 
                        e.cod_esp as codigo,
                        e.nom_esp as nombre,
                        e.cod_fac as codigo_facultad,
                        f.nom_fac as nombre_facultad
                      FROM especialidades e
                      INNER JOIN facultades f ON e.cod_fac = f.cod_fac
                      ORDER BY e.cod_fac ASC, e.cod_esp ASC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            $especialidades = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $especialidades[] = [
                    'codigo' => $row['codigo'],
                    'nombre' => $row['nombre'],
                    'codigo_facultad' => $row['codigo_facultad'],
                    'nombre_facultad' => $row['nombre_facultad']
                ];
            }
            
            return [
                'success' => true,
                'data' => $especialidades,
                'total' => count($especialidades),
                'message' => 'Especialidades obtenidas correctamente'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener especialidades: ' . $e->getMessage()
            ];
        }
    }
}

// Procesar solicitudes
$api = new EspecialidadesAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        echo json_encode($api->obtenerEspecialidades());
        break;
        
    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido. Solo se permite GET para consultar especialidades.'
        ]);
        break;
}
?>
