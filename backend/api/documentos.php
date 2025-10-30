<?php
// ========================================================================
// API DE DOCUMENTOS - ConvocaDocente
// Descarga y visualización de archivos PDF
// Autor: Linder Revilla
// ========================================================================

require_once '../config/database.php';

class DocumentosAPI {
    private $conn;
    private $uploadsPath;
    
    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
        // Ruta base de uploads desde el directorio backend/api/
        $this->uploadsPath = dirname(dirname(__DIR__)) . '/uploads/';
    }
    
    // DESCARGAR ARCHIVO PDF
    public function descargarArchivo() {
        try {
            $tipo = $_GET['tipo'] ?? null;
            $archivo = $_GET['archivo'] ?? null;
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$tipo || !$archivo || !$user_id) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Parámetros incompletos (tipo, archivo y user_id requeridos)'
                ]);
                return;
            }
            
            // Obtener DNI del usuario para construir la ruta
            $dniQuery = "SELECT pp.dni FROM perfil_personal pp WHERE pp.user_id = ?";
            $dniStmt = $this->conn->prepare($dniQuery);
            $dniStmt->execute([$user_id]);
            $dniResult = $dniStmt->fetch();
            
            if (!$dniResult || !$dniResult['dni']) {
                // Log para debug
                error_log("❌ DNI no encontrado para user_id: $user_id");
                
                // Intentar buscar por el ID directo en usuarios
                $userQuery = "SELECT u.id, pp.dni FROM usuarios u LEFT JOIN perfil_personal pp ON u.id = pp.user_id WHERE u.id = ?";
                $userStmt = $this->conn->prepare($userQuery);
                $userStmt->execute([$user_id]);
                $userResult = $userStmt->fetch();
                
                if (!$userResult) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Usuario no encontrado con ID: ' . $user_id
                    ]);
                    return;
                }
                
                if (!$userResult['dni']) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'DNI del usuario no encontrado. El usuario debe completar su perfil personal.'
                    ]);
                    return;
                }
                
                $dni = $userResult['dni'];
            } else {
                $dni = $dniResult['dni'];
            }
            
            // Verificar que el archivo está registrado en la base de datos
            if (!$this->verificarArchivoEnBD($user_id, $tipo, $archivo)) {
                http_response_code(403);
                echo json_encode([
                    'success' => false,
                    'message' => 'Archivo no autorizado o no existe en la base de datos'
                ]);
                return;
            }
            
            // Construir ruta del archivo según el tipo
            switch ($tipo) {
                case 'cv':
                    $filePath = $this->uploadsPath . "cv/{$dni}/" . $archivo;
                    break;
                case 'formacion':
                    $filePath = $this->uploadsPath . "formacion/{$dni}/" . $archivo;
                    break;
                case 'experiencia':
                    $filePath = $this->uploadsPath . "experiencia/{$dni}/" . $archivo;
                    break;
                default:
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Tipo de archivo no válido'
                    ]);
                    return;
            }
            
            // Log para debug
            error_log("🔍 Buscando archivo: $filePath");
            
            // Verificar que el archivo existe físicamente
            if (!file_exists($filePath)) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Archivo no encontrado: ' . $archivo,
                    'debug_info' => [
                        'user_id' => $user_id,
                        'dni' => $dni,
                        'tipo' => $tipo,
                        'archivo' => $archivo,
                        'path_buscado' => $filePath,
                        'existe' => file_exists($filePath)
                    ]
                ]);
                return;
            }
            
            // Verificar que es un archivo PDF
            $mimeType = mime_content_type($filePath);
            if ($mimeType !== 'application/pdf') {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'El archivo no es un PDF válido'
                ]);
                return;
            }
            
            // Configurar headers para visualización inline de PDF
            header('Content-Type: application/pdf');
            header('Content-Disposition: inline; filename="' . basename($archivo) . '"');
            header('Content-Length: ' . filesize($filePath));
            header('Cache-Control: private, max-age=0, must-revalidate');
            header('Pragma: public');
            
            // Leer y enviar el archivo
            readfile($filePath);
            exit;
            
        } catch (Exception $e) {
            error_log("Error en descargarArchivo: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al descargar archivo: ' . $e->getMessage()
            ]);
        }
    }
    
    // VERIFICAR QUE EL ARCHIVO ESTÁ REGISTRADO EN LA BASE DE DATOS
    private function verificarArchivoEnBD($user_id, $tipo, $archivo) {
        try {
            switch ($tipo) {
                case 'cv':
                    $query = "SELECT cv_archivo FROM perfil_personal WHERE user_id = ? AND cv_archivo = ?";
                    break;
                case 'formacion':
                    $query = "SELECT documento_archivo FROM formacion_academica WHERE user_id = ? AND documento_archivo = ?";
                    break;
                case 'experiencia':
                    $query = "SELECT constancia_archivo FROM experiencia_laboral WHERE user_id = ? AND constancia_archivo = ?";
                    break;
                default:
                    return false;
            }
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$user_id, $archivo]);
            
            return $stmt->rowCount() > 0;
            
        } catch (PDOException $e) {
            error_log("Error verificando archivo en BD: " . $e->getMessage());
            return false;
        }
    }
    
    // VERIFICAR EXISTENCIA DE ARCHIVO
    public function verificarArchivo() {
        try {
            $tipo = $_GET['tipo'] ?? null;
            $archivo = $_GET['archivo'] ?? null;
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$tipo || !$archivo || !$user_id) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Parámetros incompletos'
                ]);
                return;
            }
            
            // Obtener DNI del usuario
            $dniQuery = "SELECT pp.dni FROM perfil_personal pp WHERE pp.user_id = ?";
            $dniStmt = $this->conn->prepare($dniQuery);
            $dniStmt->execute([$user_id]);
            $dniResult = $dniStmt->fetch();
            
            if (!$dniResult) {
                echo json_encode([
                    'success' => false,
                    'exists' => false,
                    'message' => 'Usuario no encontrado'
                ]);
                return;
            }
            
            $dni = $dniResult['dni'];
            
            // Construir ruta del archivo
            switch ($tipo) {
                case 'cv':
                    $filePath = $this->uploadsPath . "cv/{$dni}/" . $archivo;
                    break;
                case 'formacion':
                    $filePath = $this->uploadsPath . "formacion/{$dni}/" . $archivo;
                    break;
                case 'experiencia':
                    $filePath = $this->uploadsPath . "experiencia/{$dni}/" . $archivo;
                    break;
                default:
                    echo json_encode([
                        'success' => false,
                        'exists' => false,
                        'message' => 'Tipo no válido'
                    ]);
                    return;
            }
            
            $exists = file_exists($filePath);
            $size = $exists ? filesize($filePath) : 0;
            $inDB = $this->verificarArchivoEnBD($user_id, $tipo, $archivo);
            
            echo json_encode([
                'success' => true,
                'exists' => $exists,
                'in_database' => $inDB,
                'size' => $size,
                'path' => $filePath,
                'debug_info' => [
                    'user_id' => $user_id,
                    'dni' => $dni,
                    'tipo' => $tipo,
                    'archivo' => $archivo
                ]
            ]);
            
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error al verificar archivo: ' . $e->getMessage()
            ]);
        }
    }
    
    // GENERAR PDF DEL PERFIL COMPLETO
    public function generarPerfilPDF() {
        try {
            $user_id = $_GET['user_id'] ?? null;
            
            if (!$user_id) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'ID de usuario requerido'
                ]);
                return;
            }
            
            // Obtener datos completos del usuario
            $perfilQuery = "SELECT u.*, pp.* 
                           FROM usuarios u 
                           LEFT JOIN perfil_personal pp ON u.id = pp.user_id 
                           WHERE u.id = ?";
            $perfilStmt = $this->conn->prepare($perfilQuery);
            $perfilStmt->execute([$user_id]);
            $perfil = $perfilStmt->fetch();
            
            if (!$perfil) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Usuario no encontrado'
                ]);
                return;
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
            
            // Generar HTML para el PDF
            $html = $this->generarHTMLPerfil($perfil, $formacion, $experiencia);
            
            // Configurar headers para HTML (ya que no tenemos librería PDF)
            header('Content-Type: text/html; charset=utf-8');
            header('Content-Disposition: inline; filename="perfil_' . $perfil['dni'] . '.html"');
            
            echo $html;
            exit;
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al generar PDF del perfil: ' . $e->getMessage()
            ]);
        }
    }
    
    // GENERAR HTML PARA PERFIL PDF
    private function generarHTMLPerfil($perfil, $formacion, $experiencia) {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Perfil Docente - ' . $perfil['nombres'] . ' ' . $perfil['apellidos'] . '</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    line-height: 1.6;
                    color: #333;
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                    border-bottom: 3px solid #e50a5e;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #e50a5e;
                    margin-bottom: 10px;
                }
                .section { 
                    margin-bottom: 30px; 
                    page-break-inside: avoid;
                }
                .section h2 { 
                    color: #e50a5e; 
                    border-bottom: 2px solid #e50a5e; 
                    padding-bottom: 5px; 
                    margin-bottom: 15px;
                }
                .info-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 15px; 
                    margin-bottom: 20px;
                }
                .info-item {
                    background: #f9f9f9;
                    padding: 10px;
                    border-radius: 5px;
                }
                .item { 
                    margin-bottom: 15px; 
                    padding: 15px; 
                    border: 1px solid #ddd; 
                    border-radius: 5px;
                    background: #fafafa;
                }
                .item h3 { 
                    margin: 0 0 10px 0; 
                    color: #e50a5e; 
                    font-size: 1.1em;
                }
                .footer {
                    margin-top: 50px; 
                    text-align: center; 
                    font-size: 12px; 
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                @media print {
                    body { margin: 0; }
                    .section { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>PERFIL DOCENTE</h1>
                <h2>' . htmlspecialchars($perfil['nombres']) . ' ' . htmlspecialchars($perfil['apellidos']) . '</h2>
                <p><strong>DNI:</strong> ' . htmlspecialchars($perfil['dni']) . '</p>
                <p>Universidad María Auxiliadora - Sistema ConvocaDocente</p>
            </div>
            
            <div class="section">
                <h2>DATOS PERSONALES</h2>
                <div class="info-grid">
                    <div class="info-item"><strong>Email:</strong> ' . htmlspecialchars($perfil['email']) . '</div>
                    <div class="info-item"><strong>Teléfono:</strong> ' . htmlspecialchars($perfil['telefono']) . '</div>
                    <div class="info-item"><strong>Fecha de Nacimiento:</strong> ' . htmlspecialchars($perfil['fecha_nacimiento']) . '</div>
                    <div class="info-item"><strong>Género:</strong> ' . htmlspecialchars($perfil['genero']) . '</div>
                    <div class="info-item"><strong>Nacionalidad:</strong> ' . htmlspecialchars($perfil['nacionalidad']) . '</div>
                    <div class="info-item"><strong>Dirección:</strong> ' . htmlspecialchars($perfil['direccion']) . '</div>
                </div>
            </div>';
            
        if (!empty($formacion)) {
            $html .= '<div class="section">
                <h2>FORMACIÓN ACADÉMICA (' . count($formacion) . ' registros)</h2>';
            foreach ($formacion as $f) {
                $html .= '<div class="item">
                    <h3>' . htmlspecialchars($f['tipo']) . ' en ' . htmlspecialchars($f['especialidad']) . '</h3>
                    <p><strong>Institución:</strong> ' . htmlspecialchars($f['institucion']) . '</p>
                    <p><strong>País:</strong> ' . htmlspecialchars($f['pais']) . '</p>
                    <p><strong>Fecha de Obtención:</strong> ' . htmlspecialchars($f['fecha_obtencion']) . '</p>
                    ' . ($f['documento_archivo'] ? '<p><strong>Documento:</strong> ' . htmlspecialchars($f['documento_archivo']) . '</p>' : '') . '
                </div>';
            }
            $html .= '</div>';
        }
        
        if (!empty($experiencia)) {
            $html .= '<div class="section">
                <h2>EXPERIENCIA LABORAL (' . count($experiencia) . ' registros)</h2>';
            foreach ($experiencia as $e) {
                $html .= '<div class="item">
                    <h3>' . htmlspecialchars($e['cargo']) . '</h3>
                    <p><strong>Empresa:</strong> ' . htmlspecialchars($e['empresa']) . '</p>
                    <p><strong>Sector:</strong> ' . htmlspecialchars($e['sector']) . '</p>
                    <p><strong>País:</strong> ' . htmlspecialchars($e['pais']) . '</p>
                    <p><strong>Período:</strong> ' . htmlspecialchars($e['fecha_inicio']) . ' - ' . ($e['actual'] ? 'Actualidad' : htmlspecialchars($e['fecha_fin'])) . '</p>
                    ' . ($e['constancia_archivo'] ? '<p><strong>Constancia:</strong> ' . htmlspecialchars($e['constancia_archivo']) . '</p>' : '') . '
                </div>';
            }
            $html .= '</div>';
        }
        
        $html .= '
            <div class="footer">
                <p>Documento generado el ' . date('d/m/Y H:i:s') . '</p>
                <p>Universidad María Auxiliadora - Sistema ConvocaDocente</p>
            </div>
        </body>
        </html>';
        
        return $html;
    }
}

// Procesar solicitudes
$api = new DocumentosAPI();
$action = $_GET['action'] ?? 'descargar';

switch ($action) {
    case 'descargar':
        $api->descargarArchivo();
        break;
        
    case 'perfil_pdf':
        $api->generarPerfilPDF();
        break;
        
    case 'verificar':
        $api->verificarArchivo();
        break;
        
    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Acción no válida'
        ]);
        break;
}
?>