<?php
// Habilitar reporte de errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

// FUNCIÓN HELPER: Obtener ruta completa del archivo de formación
function obtenerRutaFormacion($user_id, $nombre_archivo) {
    if (!$nombre_archivo) return null;
    
    $uploadBase = realpath("../../uploads/") ?: "../../uploads/";
    $uploadDir = $uploadBase . DIRECTORY_SEPARATOR . "formacion" . DIRECTORY_SEPARATOR . "usuario_{$user_id}" . DIRECTORY_SEPARATOR;
    return $uploadDir . $nombre_archivo;
}

try {
    // Log del método recibido
    error_log("Formación API - Método: " . $_SERVER['REQUEST_METHOD']);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        error_log("POST data: " . print_r($_POST, true));
        error_log("FILES data: " . print_r($_FILES, true));
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Obtener datos del formulario
        $user_id = $_POST['user_id'] ?? null;
        $id = $_POST['id'] ?? null; // Para actualizaciones
        $tipo = $_POST['tipo'] ?? '';
        $especialidad = $_POST['especialidad'] ?? '';
        $institucion = $_POST['institucion'] ?? '';
        $pais = $_POST['pais'] ?? '';
        $fecha_obtencion = $_POST['fecha_obtencion'] ?? null;
        
        // Validar datos requeridos
        if (empty($user_id) || empty($tipo) || empty($especialidad) || empty($institucion) || empty($pais)) {
            echo json_encode(['success' => false, 'message' => 'Faltan datos requeridos']);
            exit;
        }
        
        // Manejar subida de documento
        $documento_archivo = null;
        $archivoAnterior = null;
        
        // Si es actualización, obtener archivo anterior para eliminarlo
        if ($id && !empty($id)) {
            $selectQuery = "SELECT documento_archivo FROM formacion_academica WHERE id = :id AND user_id = :user_id";
            $selectStmt = $db->prepare($selectQuery);
            $selectStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $selectStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $selectStmt->execute();
            $archivoAnterior = $selectStmt->fetchColumn();
        }
        
        if (isset($_FILES['documento']) && $_FILES['documento']['error'] === UPLOAD_ERR_OK) {
            // Obtener DNI del usuario para crear directorio
            $dniQuery = "SELECT dni FROM perfil_personal WHERE user_id = :user_id";
            $dniStmt = $db->prepare($dniQuery);
            $dniStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $dniStmt->execute();
            $dniUsuario = $dniStmt->fetchColumn();
            
            if (!$dniUsuario) {
                echo json_encode(['success' => false, 'message' => 'Debe completar primero sus datos personales (DNI)']);
                exit;
            }
            
            // Crear directorio específico del usuario ID (más simple y consistente)
            $uploadBase = realpath("../../uploads/") ?: "../../uploads/";
            $userUploadDir = $uploadBase . DIRECTORY_SEPARATOR . "formacion" . DIRECTORY_SEPARATOR . "usuario_{$user_id}" . DIRECTORY_SEPARATOR;
            
            // Crear directorios si no existen
            if (!is_dir($uploadBase . DIRECTORY_SEPARATOR . "formacion")) {
                mkdir($uploadBase . DIRECTORY_SEPARATOR . "formacion", 0777, true);
            }
            
            if (!is_dir($userUploadDir)) {
                mkdir($userUploadDir, 0777, true);
            }
            
            // Validar tipo de archivo (solo PDF)
            $fileExtension = strtolower(pathinfo($_FILES['documento']['name'], PATHINFO_EXTENSION));
            if ($fileExtension !== 'pdf') {
                echo json_encode(['success' => false, 'message' => 'Solo se permiten archivos PDF']);
                exit;
            }
            
            // Generar nombre limpio del archivo
            $tipoLimpio = strtolower(str_replace(' ', '_', $tipo));
            $timestamp = time();
            $fileName = $tipoLimpio . '_' . $timestamp . '.pdf';
            $filePath = $userUploadDir . $fileName;
            
            // Log para debugging
            error_log("FORMACION - Subiendo archivo:");
            error_log("  Usuario: {$user_id}");
            error_log("  Directorio: {$userUploadDir}");
            error_log("  Archivo: {$fileName}");
            error_log("  Extensión detectada: {$fileExtension}");
            
            // Validar tamaño (máximo 5MB)
            if ($_FILES['documento']['size'] > 5 * 1024 * 1024) {
                echo json_encode(['success' => false, 'message' => 'El archivo no puede superar 5MB']);
                exit;
            }
            
            // Eliminar archivo anterior si existe (buscar en la nueva estructura)
            if ($archivoAnterior) {
                $archivoAnteriorPath = $userUploadDir . $archivoAnterior;
                if (file_exists($archivoAnteriorPath)) {
                    unlink($archivoAnteriorPath);
                    error_log("Archivo anterior eliminado: {$archivoAnteriorPath}");
                }
            }
            
            // Mover nuevo archivo
            if (move_uploaded_file($_FILES['documento']['tmp_name'], $filePath)) {
                $documento_archivo = $fileName;
                error_log("✅ Documento de formación subido: {$filePath}");
                
                // Verificar que el archivo existe
                if (file_exists($filePath)) {
                    error_log("✅ Archivo confirmado: " . filesize($filePath) . " bytes");
                } else {
                    error_log("❌ Error: Archivo no encontrado después de mover");
                }
            } else {
                error_log("❌ Error moviendo archivo de formación");
                echo json_encode(['success' => false, 'message' => 'Error al subir el documento']);
                exit;
            }
        }
        
        if ($id && !empty($id)) {
            // Verificar si el registro existe antes de actualizar
            $checkQuery = "SELECT id FROM formacion_academica WHERE id = :id AND user_id = :user_id";
            $checkStmt = $db->prepare($checkQuery);
            $checkStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $checkStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $checkStmt->execute();
            
            if ($checkStmt->fetchColumn()) {
                // Actualizar registro existente
                $updateQuery = "UPDATE formacion_academica SET 
                                tipo = :tipo,
                                especialidad = :especialidad,
                                institucion = :institucion,
                                pais = :pais,
                                fecha_obtencion = :fecha_obtencion";
                                
                if ($documento_archivo) {
                    $updateQuery .= ", documento_archivo = :documento_archivo";
                }
                
                $updateQuery .= " WHERE id = :id AND user_id = :user_id";
                
                $stmt = $db->prepare($updateQuery);
                $stmt->bindParam(':tipo', $tipo);
                $stmt->bindParam(':especialidad', $especialidad);
                $stmt->bindParam(':institucion', $institucion);
                $stmt->bindParam(':pais', $pais);
                $stmt->bindParam(':fecha_obtencion', $fecha_obtencion);
                $stmt->bindParam(':id', $id, PDO::PARAM_INT);
                $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
                
                if ($documento_archivo) {
                    $stmt->bindParam(':documento_archivo', $documento_archivo);
                }
            } else {
                // Si no existe, crear nuevo registro (fallback)
                $id = null; // Reset ID para crear nuevo
            }
        }
        
        if (!$id || empty($id)) {
            // Insertar nuevo registro
            $insertQuery = "INSERT INTO formacion_academica 
                           (user_id, tipo, especialidad, institucion, pais, fecha_obtencion, documento_archivo) 
                           VALUES 
                           (:user_id, :tipo, :especialidad, :institucion, :pais, :fecha_obtencion, :documento_archivo)";
            
            $stmt = $db->prepare($insertQuery);
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindParam(':tipo', $tipo);
            $stmt->bindParam(':especialidad', $especialidad);
            $stmt->bindParam(':institucion', $institucion);
            $stmt->bindParam(':pais', $pais);
            $stmt->bindParam(':fecha_obtencion', $fecha_obtencion);
            $stmt->bindParam(':documento_archivo', $documento_archivo);
        }
        
        if ($stmt->execute()) {
            $response = [
                'success' => true, 
                'message' => 'Formación académica guardada correctamente'
            ];
            
            if (!$id) {
                $response['id'] = $db->lastInsertId();
            }
            
            if ($documento_archivo) {
                $response['documento_archivo'] = $documento_archivo;
            }
            
            echo json_encode($response);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al guardar la formación académica']);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Obtener formación académica del usuario
        $user_id = $_GET['user_id'] ?? null;
        
        if (!$user_id) {
            echo json_encode(['success' => false, 'message' => 'user_id requerido']);
            exit;
        }
        
        $query = "SELECT * FROM formacion_academica WHERE user_id = :user_id ORDER BY fecha_obtencion DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        
        $formaciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $formaciones]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        // Eliminar registro de formación académica
        parse_str(file_get_contents("php://input"), $data);
        
        $id = $data['id'] ?? null;
        $user_id = $data['user_id'] ?? null;
        
        if (!$id || !$user_id) {
            echo json_encode(['success' => false, 'message' => 'ID y user_id requeridos']);
            exit;
        }
        
        // Obtener nombre del archivo antes de eliminar
        $selectQuery = "SELECT documento_archivo FROM formacion_academica WHERE id = :id AND user_id = :user_id";
        $selectStmt = $db->prepare($selectQuery);
        $selectStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $selectStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $selectStmt->execute();
        
        $archivo = $selectStmt->fetchColumn();
        
        // Eliminar registro de la base de datos
        $deleteQuery = "DELETE FROM formacion_academica WHERE id = :id AND user_id = :user_id";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->bindParam(':id', $id, PDO::PARAM_INT);
        $deleteStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        
        if ($deleteStmt->execute()) {
            // Obtener DNI para eliminar archivo
            $dniQuery = "SELECT dni FROM perfil_personal WHERE user_id = :user_id";
            $dniStmt = $db->prepare($dniQuery);
            $dniStmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $dniStmt->execute();
            $dniUsuario = $dniStmt->fetchColumn();
            
            // Eliminar archivo físico si existe (usar estructura usuario_id)
            if ($archivo) {
                $uploadBase = realpath("../../uploads/") ?: "../../uploads/";
                $userUploadDir = $uploadBase . DIRECTORY_SEPARATOR . "formacion" . DIRECTORY_SEPARATOR . "usuario_{$user_id}" . DIRECTORY_SEPARATOR;
                $archivoPath = $userUploadDir . $archivo;
                
                if (file_exists($archivoPath)) {
                    unlink($archivoPath);
                    error_log("Archivo de formación eliminado: {$archivoPath}");
                }
            }
            
            echo json_encode(['success' => true, 'message' => 'Registro eliminado correctamente']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Error al eliminar el registro']);
        }
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
