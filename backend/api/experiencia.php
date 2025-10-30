<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

// FUNCIÓN HELPER: Obtener ruta completa del archivo de experiencia
function obtenerRutaExperiencia($user_id, $nombre_archivo) {
    if (!$nombre_archivo) return null;
    
    $uploadBase = realpath("../../uploads/") ?: "../../uploads/";
    $uploadDir = $uploadBase . DIRECTORY_SEPARATOR . "experiencia" . DIRECTORY_SEPARATOR . "usuario_{$user_id}" . DIRECTORY_SEPARATOR;
    return $uploadDir . $nombre_archivo;
}

function enviarRespuesta($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Función removida - ya no necesitamos obtener DNI, usamos user_id directamente

function crearDirectorioExperiencia($user_id) {
    // Usar estructura consistente con los otros módulos
    $uploadBase = realpath("../../uploads/") ?: "../../uploads/";
    $directorioBase = $uploadBase . DIRECTORY_SEPARATOR . "experiencia" . DIRECTORY_SEPARATOR . "usuario_{$user_id}";
    
    // Crear directorios si no existen
    if (!is_dir($uploadBase . DIRECTORY_SEPARATOR . "experiencia")) {
        mkdir($uploadBase . DIRECTORY_SEPARATOR . "experiencia", 0777, true);
    }
    
    if (!is_dir($directorioBase)) {
        if (!mkdir($directorioBase, 0777, true)) {
            throw new Exception("No se pudo crear el directorio para documentos");
        }
    }
    
    return $directorioBase;
}

function eliminarArchivoAnterior($rutaArchivo) {
    if ($rutaArchivo && file_exists($rutaArchivo)) {
        unlink($rutaArchivo);
        error_log("Archivo anterior eliminado: " . $rutaArchivo);
    }
}

// Manejar GET - Obtener experiencias del usuario
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!isset($_GET['user_id'])) {
        enviarRespuesta(false, 'user_id es requerido');
    }

    $user_id = (int)$_GET['user_id'];
    
    try {
        $db = new Database();
        $conexion = $db->getConnection();
        
        // Verificar si tiene experiencias registradas
        $stmt = $conexion->prepare("
            SELECT * FROM experiencia_laboral 
            WHERE user_id = ? 
            ORDER BY fecha_inicio DESC
        ");
        $stmt->execute([$user_id]);
        $experiencias = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Si no hay experiencias, verificar si marcó "sin experiencia"
        $sinExperiencia = false;
        if (empty($experiencias)) {
            // Podríamos tener una tabla para este flag o verificar mediante algún otro método
            // Por simplicidad, si no hay registros asumimos que aún no ha llenado esta sección
            enviarRespuesta(true, 'No hay experiencias registradas', []);
        }
        
        enviarRespuesta(true, 'Experiencias encontradas', $experiencias);
        
    } catch (Exception $e) {
        error_log("Error al obtener experiencias: " . $e->getMessage());
        enviarRespuesta(false, 'Error al cargar experiencias: ' . $e->getMessage());
    }
}

// Manejar POST - Crear o actualizar experiencia
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $user_id = isset($_POST['user_id']) ? (int)$_POST['user_id'] : null;
        
        if (!$user_id) {
            enviarRespuesta(false, 'user_id es requerido');
        }
        
        // Verificar si es marcado como "sin experiencia" (usado también para limpiar antes de reinsertar)
        if (isset($_POST['sin_experiencia']) && $_POST['sin_experiencia'] == '1') {
            $db = new Database();
            $conexion = $db->getConnection();
            
            // PASO 1: Obtener todos los archivos existentes para eliminarlos
            $stmt = $conexion->prepare("SELECT constancia_archivo FROM experiencia_laboral WHERE user_id = ? AND constancia_archivo IS NOT NULL");
            $stmt->execute([$user_id]);
            $archivosExistentes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // PASO 2: Eliminar archivos físicos
            if (!empty($archivosExistentes)) {
                $directorioExperiencia = crearDirectorioExperiencia($user_id);
                foreach ($archivosExistentes as $archivo) {
                    $rutaArchivo = $directorioExperiencia . DIRECTORY_SEPARATOR . $archivo['constancia_archivo'];
                    eliminarArchivoAnterior($rutaArchivo);
                }
            }
            
            // PASO 3: Eliminar registros de la base de datos
            $stmt = $conexion->prepare("DELETE FROM experiencia_laboral WHERE user_id = ?");
            $stmt->execute([$user_id]);
            
            enviarRespuesta(true, 'Experiencias anteriores eliminadas correctamente');
        }
        
        // Validar campos requeridos
        $campos_requeridos = ['pais', 'sector', 'empresa', 'cargo', 'fecha_inicio'];
        foreach ($campos_requeridos as $campo) {
            if (!isset($_POST[$campo]) || empty($_POST[$campo])) {
                enviarRespuesta(false, "El campo $campo es requerido");
            }
        }
        
        $pais = $_POST['pais'];
        $sector = $_POST['sector'];
        $empresa = $_POST['empresa'];
        $ruc = !empty($_POST['ruc']) ? $_POST['ruc'] : null;
        $cargo = $_POST['cargo'];
        $fecha_inicio = $_POST['fecha_inicio'];
        $fecha_fin = !empty($_POST['fecha_fin']) ? $_POST['fecha_fin'] : null;
        $actual = isset($_POST['actual']) && $_POST['actual'] == '1' ? 1 : 0;
        $id = (isset($_POST['id']) && !empty($_POST['id'])) ? (int)$_POST['id'] : null;
        
        error_log("DEBUG - user_id: $user_id, id recibido: " . ($id ? $id : 'NULL'));
        
        // Si es trabajo actual, fecha_fin debe ser null
        if ($actual) {
            $fecha_fin = null;
        }
        
        // Validar RUC si se proporciona
        if ($ruc && (strlen($ruc) !== 11 || !ctype_digit($ruc))) {
            enviarRespuesta(false, 'El RUC debe tener exactamente 11 dígitos numéricos');
        }
        
        $db = new Database();
        $conexion = $db->getConnection();
        
        // Manejar archivo de constancia si se subió
        $nombreArchivo = null;
        if (isset($_FILES['constancia']) && $_FILES['constancia']['error'] === UPLOAD_ERR_OK) {
            $archivo = $_FILES['constancia'];
            
            // Log para debugging
            error_log("EXPERIENCIA - Subiendo archivo:");
            error_log("  Usuario: {$user_id}");
            error_log("  Sector: {$sector}");
            error_log("  Archivo: " . $archivo['name']);
            
            // Validar tipo de archivo
            if ($archivo['type'] !== 'application/pdf') {
                enviarRespuesta(false, 'Solo se permiten archivos PDF para la constancia');
            }
            
            // Validar tamaño (5MB máximo)
            if ($archivo['size'] > 5 * 1024 * 1024) {
                enviarRespuesta(false, 'El archivo de constancia no puede superar 5MB');
            }
            
            // Crear directorio usando la nueva estructura consistente
            $directorioExperiencia = crearDirectorioExperiencia($user_id);
            
            // CORREGIDO: Generar nombre único para cada experiencia
            $timestamp = time();
            $empresaLimpia = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', substr($empresa, 0, 20)));
            $sectorLimpio = strtolower(str_replace(' ', '_', $sector));
            $nombreArchivo = "constancia_{$empresaLimpia}_{$sectorLimpio}_{$timestamp}.pdf";
            $rutaCompleta = $directorioExperiencia . DIRECTORY_SEPARATOR . $nombreArchivo;
            
            error_log("  Ruta destino: {$rutaCompleta}");
            
            // Si es actualización, eliminar archivo anterior
            if ($id) {
                $stmt = $conexion->prepare("SELECT constancia_archivo FROM experiencia_laboral WHERE id = ? AND user_id = ?");
                $stmt->execute([$id, $user_id]);
                $experienciaActual = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($experienciaActual && $experienciaActual['constancia_archivo']) {
                    $archivoAnterior = $directorioExperiencia . DIRECTORY_SEPARATOR . $experienciaActual['constancia_archivo'];
                    eliminarArchivoAnterior($archivoAnterior);
                }
            }
            
            // Mover archivo subido
            if (move_uploaded_file($archivo['tmp_name'], $rutaCompleta)) {
                error_log("✅ Constancia de experiencia subida: {$rutaCompleta}");
                
                // Verificar que el archivo existe
                if (file_exists($rutaCompleta)) {
                    error_log("✅ Archivo confirmado: " . filesize($rutaCompleta) . " bytes");
                } else {
                    error_log("❌ Error: Archivo no encontrado después de mover");
                }
            } else {
                error_log("❌ Error moviendo archivo de experiencia");
                enviarRespuesta(false, 'Error al subir la constancia');
            }
        }
        
        // Insertar o actualizar en base de datos
        if ($id) {
            // CORREGIDO: Verificar primero que la experiencia existe antes de actualizar
            $checkStmt = $conexion->prepare("SELECT id FROM experiencia_laboral WHERE id = ? AND user_id = ?");
            $checkStmt->execute([$id, $user_id]);
            
            if ($checkStmt->rowCount() === 0) {
                error_log("❌ ADVERTENCIA: ID $id no existe para user_id $user_id, creando nueva experiencia");
                // Si no existe, crear como nueva experiencia (sin ID)
                $id = null;
            } else {
                // Actualizar experiencia existente
                $sql = "UPDATE experiencia_laboral SET 
                        pais = ?, sector = ?, empresa = ?, ruc = ?, cargo = ?, 
                        fecha_inicio = ?, fecha_fin = ?, actual = ?";
                $parametros = [$pais, $sector, $empresa, $ruc, $cargo, $fecha_inicio, $fecha_fin, $actual];
                
                if ($nombreArchivo) {
                    $sql .= ", constancia_archivo = ?";
                    $parametros[] = $nombreArchivo;
                }
                
                $sql .= " WHERE id = ? AND user_id = ?";
                $parametros[] = $id;
                $parametros[] = $user_id;
                
                $stmt = $conexion->prepare($sql);
                $stmt->execute($parametros);
                
                error_log("✅ Experiencia ID $id actualizada correctamente");
                enviarRespuesta(true, 'Experiencia laboral actualizada correctamente', ['id' => $id]);
            }
        }
        
        // Insertar nueva experiencia (si $id es null o no existía)
        if (!$id) {
            
            // Insertar nueva experiencia
            $stmt = $conexion->prepare("
                INSERT INTO experiencia_laboral 
                (user_id, pais, sector, empresa, ruc, cargo, fecha_inicio, fecha_fin, actual, constancia_archivo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $user_id, $pais, $sector, $empresa, $ruc, $cargo, 
                $fecha_inicio, $fecha_fin, $actual, $nombreArchivo
            ]);
            
            $nuevoId = $conexion->lastInsertId();
            error_log("✅ Nueva experiencia creada con ID: $nuevoId");
            enviarRespuesta(true, 'Experiencia laboral registrada correctamente', ['id' => $nuevoId]);
        }
        
    } catch (Exception $e) {
        error_log("Error al procesar experiencia: " . $e->getMessage());
        enviarRespuesta(false, 'Error al procesar experiencia: ' . $e->getMessage());
    }
}

// Manejar DELETE - Eliminar experiencia
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str(file_get_contents("php://input"), $_DELETE);
    
    $id = isset($_DELETE['id']) ? (int)$_DELETE['id'] : null;
    $user_id = isset($_DELETE['user_id']) ? (int)$_DELETE['user_id'] : null;
    
    if (!$id || !$user_id) {
        enviarRespuesta(false, 'ID y user_id son requeridos');
    }
    
    try {
        $db = new Database();
        $conexion = $db->getConnection();
        
        // Obtener información de la experiencia antes de eliminar
        $stmt = $conexion->prepare("SELECT constancia_archivo FROM experiencia_laboral WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user_id]);
        $experiencia = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$experiencia) {
            enviarRespuesta(false, 'Experiencia no encontrada');
        }
        
        // Eliminar archivo de constancia si existe
        if ($experiencia['constancia_archivo']) {
            $directorioExperiencia = crearDirectorioExperiencia($user_id);
            $rutaArchivo = $directorioExperiencia . DIRECTORY_SEPARATOR . $experiencia['constancia_archivo'];
            eliminarArchivoAnterior($rutaArchivo);
        }
        
        // Eliminar registro de la base de datos
        $stmt = $conexion->prepare("DELETE FROM experiencia_laboral WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $user_id]);
        
        if ($stmt->rowCount() === 0) {
            enviarRespuesta(false, 'No se pudo eliminar la experiencia');
        }
        
        enviarRespuesta(true, 'Experiencia laboral y constancia eliminadas correctamente');
        
    } catch (Exception $e) {
        error_log("Error al eliminar experiencia: " . $e->getMessage());
        enviarRespuesta(false, 'Error al eliminar experiencia: ' . $e->getMessage());
    }
}

enviarRespuesta(false, 'Método no permitido');
?>
