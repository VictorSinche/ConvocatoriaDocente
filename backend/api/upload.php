<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

$accion = $_REQUEST['accion'] ?? '';

try {
    switch ($accion) {
        case 'cv':
            uploadCV();
            break;
            
        case 'formacion':
            uploadFormacion();
            break;
            
        case 'experiencia':
            uploadExperiencia();
            break;
            
        default:
            throw new Exception('Tipo de upload no válido');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function uploadCV() {
    if (!isset($_FILES['cv']) || $_FILES['cv']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se recibió el archivo o hubo un error en la subida');
    }

    $archivo = $_FILES['cv'];
    $usuario_id = $_POST['usuario_id'] ?? '';

    if (empty($usuario_id)) {
        throw new Exception('ID de usuario requerido');
    }

    // Validar archivo
    validarArchivo($archivo, ['pdf', 'doc', 'docx'], 5); // 5MB máximo

    // Generar nombre único
    $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    $nombre_archivo = 'cv_' . $usuario_id . '_' . time() . '.' . $extension;
    
    // Crear directorio si no existe
    $directorio = '../../uploads/cv/';
    if (!is_dir($directorio)) {
        mkdir($directorio, 0755, true);
    }

    $ruta_destino = $directorio . $nombre_archivo;
    $ruta_relativa = 'uploads/cv/' . $nombre_archivo;

    if (move_uploaded_file($archivo['tmp_name'], $ruta_destino)) {
        echo json_encode([
            'success' => true,
            'message' => 'CV subido correctamente',
            'archivo' => $nombre_archivo,
            'ruta' => $ruta_relativa
        ]);
    } else {
        throw new Exception('Error al mover el archivo al directorio destino');
    }
}

function uploadFormacion() {
    if (!isset($_FILES['documento']) || $_FILES['documento']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se recibió el archivo o hubo un error en la subida');
    }

    $archivo = $_FILES['documento'];
    $usuario_id = $_POST['usuario_id'] ?? '';
    $tipo = $_POST['tipo'] ?? 'formacion';

    if (empty($usuario_id)) {
        throw new Exception('ID de usuario requerido');
    }

    // Validar archivo
    validarArchivo($archivo, ['pdf', 'jpg', 'jpeg', 'png'], 3); // 3MB máximo

    // Generar nombre único
    $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    $nombre_archivo = $tipo . '_' . $usuario_id . '_' . time() . '.' . $extension;
    
    // Crear directorio si no existe
    $directorio = '../../uploads/formacion/';
    if (!is_dir($directorio)) {
        mkdir($directorio, 0755, true);
    }

    $ruta_destino = $directorio . $nombre_archivo;
    $ruta_relativa = 'uploads/formacion/' . $nombre_archivo;

    if (move_uploaded_file($archivo['tmp_name'], $ruta_destino)) {
        echo json_encode([
            'success' => true,
            'message' => 'Documento de formación subido correctamente',
            'archivo' => $nombre_archivo,
            'ruta' => $ruta_relativa
        ]);
    } else {
        throw new Exception('Error al mover el archivo al directorio destino');
    }
}

function uploadExperiencia() {
    if (!isset($_FILES['documento']) || $_FILES['documento']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se recibió el archivo o hubo un error en la subida');
    }

    $archivo = $_FILES['documento'];
    $usuario_id = $_POST['usuario_id'] ?? '';
    $tipo = $_POST['tipo'] ?? 'experiencia';

    if (empty($usuario_id)) {
        throw new Exception('ID de usuario requerido');
    }

    // Validar archivo
    validarArchivo($archivo, ['pdf', 'jpg', 'jpeg', 'png'], 3); // 3MB máximo

    // Generar nombre único
    $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    $nombre_archivo = $tipo . '_' . $usuario_id . '_' . time() . '.' . $extension;
    
    // Crear directorio si no existe
    $directorio = '../../uploads/experiencia/';
    if (!is_dir($directorio)) {
        mkdir($directorio, 0755, true);
    }

    $ruta_destino = $directorio . $nombre_archivo;
    $ruta_relativa = 'uploads/experiencia/' . $nombre_archivo;

    if (move_uploaded_file($archivo['tmp_name'], $ruta_destino)) {
        echo json_encode([
            'success' => true,
            'message' => 'Documento de experiencia subido correctamente',
            'archivo' => $nombre_archivo,
            'ruta' => $ruta_relativa
        ]);
    } else {
        throw new Exception('Error al mover el archivo al directorio destino');
    }
}

function validarArchivo($archivo, $extensiones_permitidas, $tamaño_max_mb) {
    // Validar tamaño
    $tamaño_max_bytes = $tamaño_max_mb * 1024 * 1024;
    if ($archivo['size'] > $tamaño_max_bytes) {
        throw new Exception("El archivo no puede superar los {$tamaño_max_mb}MB");
    }

    // Validar extensión
    $extension = strtolower(pathinfo($archivo['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, $extensiones_permitidas)) {
        $extensiones_texto = implode(', ', $extensiones_permitidas);
        throw new Exception("Solo se permiten archivos: {$extensiones_texto}");
    }

    // Validar tipo MIME (seguridad adicional)
    $tipos_mime_permitidos = [
        'pdf' => 'application/pdf',
        'doc' => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png'
    ];

    if (isset($tipos_mime_permitidos[$extension])) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime_type = finfo_file($finfo, $archivo['tmp_name']);
        finfo_close($finfo);

        if ($mime_type !== $tipos_mime_permitidos[$extension]) {
            throw new Exception('El tipo de archivo no coincide con la extensión');
        }
    }

    // Validar que no sea un archivo ejecutable
    $extensiones_peligrosas = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'php', 'asp', 'aspx', 'jsp'];
    if (in_array($extension, $extensiones_peligrosas)) {
        throw new Exception('Tipo de archivo no permitido por seguridad');
    }
}

function eliminarArchivo($ruta_relativa) {
    if (!empty($ruta_relativa)) {
        $ruta_completa = '../../' . $ruta_relativa;
        if (file_exists($ruta_completa)) {
            unlink($ruta_completa);
            return true;
        }
    }
    return false;
}
?>
