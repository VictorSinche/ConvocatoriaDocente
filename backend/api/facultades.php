<?php
require_once '../config/database.php';

class FacultadesAPI {
    private $conn;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }
    
    // OBTENER TODAS LAS FACULTADES - SOLO LECTURA
    public function obtenerFacultades() {
        try {
            $query = "SELECT 
                        cod_fac as codigo,
                        nom_fac as nombre
                      FROM facultades 
                      ORDER BY cod_fac ASC";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            $facultades = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $facultades[] = [
                    'codigo' => $row['codigo'],
                    'nombre' => $row['nombre']
                ];
            }
            
            return [
                'success' => true,
                'data' => $facultades,
                'total' => count($facultades),
                'message' => 'Facultades obtenidas correctamente'
            ];
            
        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Error al obtener facultades: ' . $e->getMessage()
            ];
        }
    }
}

// Procesar solicitudes
$api = new FacultadesAPI();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        echo json_encode($api->obtenerFacultades());
        break;
        
    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método no permitido. Solo se permite GET para consultar facultades.'
        ]);
        break;
}
?>
