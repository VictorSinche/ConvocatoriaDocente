<?php
// ========================================================================
// API DE AUTENTICACIÓN - ConvocaDocente
// Endpoints: /login, /register
// Autor: Linder Revilla
// ========================================================================

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    sendResponse(false, "Error de conexión a la base de datos", null, 500);
}

// Obtener método HTTP y datos
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'POST':
        // Determinar endpoint por URL
        $endpoint = $_GET['action'] ?? '';
        
        switch ($endpoint) {
            case 'login':
                handleLogin($db, $input);
                break;
                
            case 'register':
                handleRegister($db, $input);
                break;
                
            default:
                sendResponse(false, "Endpoint no válido", null, 404);
        }
        break;
        
    default:
        sendResponse(false, "Método HTTP no permitido", null, 405);
}

// ========================================================================
// FUNCIÓN LOGIN
// ========================================================================
function handleLogin($db, $input) {
    // Log del intento de login
    error_log("🔐 Intento de login - Email: " . ($input['email'] ?? 'no proporcionado'));
    
    // Validar datos requeridos
    if (!isset($input['email']) || !isset($input['password'])) {
        error_log("❌ Login fallido: Datos faltantes");
        sendResponse(false, "Email y contraseña son requeridos", null, 400);
    }
    
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    
    // Validar formato de email
    if (!validateEmail($email)) {
        error_log("❌ Login fallido: Email inválido - " . $email);
        sendResponse(false, "Formato de email inválido", null, 400);
    }
    
    try {
        // Buscar usuario por email
        $query = "SELECT u.*, 
                         f.nom_fac,
                         e.nom_esp,
                         pp.nombres, pp.apellidos, pp.completado
                  FROM usuarios u
                  LEFT JOIN facultades f ON u.cod_fac = f.cod_fac
                  LEFT JOIN especialidades e ON u.cod_fac = e.cod_fac AND u.cod_esp = e.cod_esp
                  LEFT JOIN perfil_personal pp ON u.id = pp.user_id
                  WHERE u.email = ? AND u.estado = 1";
                  
        $stmt = $db->prepare($query);
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            error_log("❌ Login fallido: Email no encontrado - " . $email);
            sendResponse(false, "Correo no registrado en el sistema", null, 404);
        }
        
        // Verificar si la cuenta está activa
        if ($user['estado'] != 1) {
            error_log("❌ Login fallido: Cuenta inactiva - " . $email);
            sendResponse(false, "Cuenta desactivada. Contacte al administrador", null, 403);
        }
        
        // Verificar contraseña
        if (!password_verify($password, $user['password'])) {
            error_log("❌ Login fallido: Contraseña incorrecta - " . $email);
            sendResponse(false, "Contraseña incorrecta", null, 401);
        }
        
        error_log("✅ Login exitoso - " . $email . " - Rol: " . $user['rol']);
        
        // Preparar datos de respuesta (sin contraseña)
        unset($user['password']);
        
        // Generar token simple (en producción usar JWT)
        $token = base64_encode($user['id'] . ':' . $user['email'] . ':' . time());
        
        $userData = [
            'user' => $user,
            'token' => $token
        ];
        
        sendResponse(true, "Login exitoso", $userData);
        
    } catch (Exception $e) {
        error_log("Error en login: " . $e->getMessage());
        sendResponse(false, "Error interno del servidor", null, 500);
    }
}

// ========================================================================
// FUNCIÓN REGISTRO
// ========================================================================
function handleRegister($db, $input) {
    // Log del intento de registro
    error_log("📝 Intento de registro - Email: " . ($input['email'] ?? 'no proporcionado'));
    
    // Validar datos requeridos
    if (!isset($input['email']) || !isset($input['password'])) {
        error_log("❌ Registro fallido: Datos faltantes");
        sendResponse(false, "Email y contraseña son requeridos", null, 400);
    }
    
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    
    // Validar formato de email
    if (!validateEmail($email)) {
        sendResponse(false, "Formato de email inválido", null, 400);
    }
    
    // Validar longitud de contraseña
    if (strlen($password) < 6) {
        sendResponse(false, "La contraseña debe tener al menos 6 caracteres", null, 400);
    }
    
    try {
        // Verificar si el email ya existe
        $checkQuery = "SELECT id FROM usuarios WHERE email = ?";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->execute([$email]);
        
        if ($checkStmt->fetch()) {
            error_log("❌ Registro fallido: Email ya existe - " . $email);
            sendResponse(false, "El correo electrónico ya está registrado en el sistema", null, 409);
        }
        
        // Encriptar contraseña
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Insertar nuevo usuario (solo docentes pueden registrarse)
        $insertQuery = "INSERT INTO usuarios (email, password, rol, estado, created_at) 
                       VALUES (?, ?, 'docente', 1, NOW())";
        $insertStmt = $db->prepare($insertQuery);
        $insertStmt->execute([$email, $hashedPassword]);
        
        $userId = $db->lastInsertId();
        
        // Obtener datos del usuario recién creado
        $userQuery = "SELECT id, email, rol, estado, created_at FROM usuarios WHERE id = ?";
        $userStmt = $db->prepare($userQuery);
        $userStmt->execute([$userId]);
        $newUser = $userStmt->fetch();
        
        error_log("✅ Registro exitoso - " . $email . " - ID: " . $userId);
        sendResponse(true, "Registro exitoso. Ya puedes iniciar sesión", $newUser, 201);
        
    } catch (Exception $e) {
        error_log("Error en registro: " . $e->getMessage());
        sendResponse(false, "Error interno del servidor", null, 500);
    }
}
?>
