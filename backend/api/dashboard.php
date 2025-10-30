<?php
// ========================================================================
// API DE DASHBOARD - ConvocaDocente
// Endpoints para estadísticas del dashboard
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
$action = $_GET['action'] ?? '';

switch ($method) {
    case 'GET':
        switch ($action) {
            case 'stats':
                getStats($db);
                break;
            case 'postulaciones-distribucion':
                getPostulacionesDistribucion($db);
                break;
            case 'cursos-populares':
                getCursosPopulares($db);
                break;
            case 'actividad-reciente':
                getActividadReciente($db);
                break;
            default:
                sendResponse(false, "Endpoint no válido", null, 404);
        }
        break;
        
    default:
        sendResponse(false, "Método HTTP no permitido", null, 405);
}

// ========================================================================
// FUNCIÓN PARA OBTENER ESTADÍSTICAS GENERALES
// ========================================================================
function getStats($db) {
    try {
        // Obtener parámetros del usuario logueado
        $rol = $_GET['rol'] ?? null;
        $cod_esp = $_GET['cod_esp'] ?? null;
        
        // Total de docentes (filtrar por rol del usuario)
        if ($rol === 'director' && $cod_esp) {
            // Solo docentes que han postulado a la especialidad del director
            $queryDocentes = "SELECT COUNT(DISTINCT p.user_id) as total FROM postulaciones p WHERE p.cod_esp = ?";
            $stmtDocentes = $db->prepare($queryDocentes);
            $stmtDocentes->execute([$cod_esp]);
            $totalDocentes = $stmtDocentes->fetch()['total'];

            // Docentes activos con perfil completado que postularon a esta especialidad
            $queryDocentesActivos = "SELECT COUNT(DISTINCT p.user_id) as total FROM postulaciones p
                                    INNER JOIN usuarios u ON p.user_id = u.id
                                    INNER JOIN perfil_personal pp ON u.id = pp.user_id 
                                    WHERE p.cod_esp = ? AND u.rol = 'docente' AND pp.completado = 1";
            $stmtDocentesActivos = $db->prepare($queryDocentesActivos);
            $stmtDocentesActivos->execute([$cod_esp]);
            $docentesActivos = $stmtDocentesActivos->fetch()['total'];
        } else {
            // Todos los docentes del sistema (para admin, decano)
            $queryDocentes = "SELECT COUNT(*) as total FROM usuarios WHERE rol = 'docente'";
            $stmtDocentes = $db->prepare($queryDocentes);
            $stmtDocentes->execute();
            $totalDocentes = $stmtDocentes->fetch()['total'];

            // Docentes activos (con perfil completado)
            $queryDocentesActivos = "SELECT COUNT(*) as total FROM usuarios u 
                                    INNER JOIN perfil_personal pp ON u.id = pp.user_id 
                                    WHERE u.rol = 'docente' AND pp.completado = 1";
            $stmtDocentesActivos = $db->prepare($queryDocentesActivos);
            $stmtDocentesActivos->execute();
            $docentesActivos = $stmtDocentesActivos->fetch()['total'];
        }

        // Postulaciones pendientes (filtrar por rol del usuario)
        if ($rol === 'director' && $cod_esp) {
            // Solo postulaciones de la especialidad del director
            $queryPostulacionesPendientes = "SELECT COUNT(*) as total FROM postulaciones WHERE estado = 'PENDIENTE' AND cod_esp = ?";
            $stmtPostulacionesPendientes = $db->prepare($queryPostulacionesPendientes);
            $stmtPostulacionesPendientes->execute([$cod_esp]);
        } else {
            // Todas las postulaciones pendientes (para admin, decano)
            $queryPostulacionesPendientes = "SELECT COUNT(*) as total FROM postulaciones WHERE estado = 'PENDIENTE'";
            $stmtPostulacionesPendientes = $db->prepare($queryPostulacionesPendientes);
            $stmtPostulacionesPendientes->execute();
        }
        $postulacionesPendientes = $stmtPostulacionesPendientes->fetch()['total'];

        // Cursos activos (filtrar por rol del usuario)
        if ($rol === 'director' && $cod_esp) {
            // Solo cursos activos de la especialidad del director
            $queryCursosActivos = "SELECT COUNT(*) as total FROM cursos WHERE estado = 1 AND c_codesp = ?";
            $stmtCursosActivos = $db->prepare($queryCursosActivos);
            $stmtCursosActivos->execute([$cod_esp]);
        } else {
            // Todos los cursos activos (para admin, decano)
            $queryCursosActivos = "SELECT COUNT(*) as total FROM cursos WHERE estado = 1";
            $stmtCursosActivos = $db->prepare($queryCursosActivos);
            $stmtCursosActivos->execute();
        }
        $cursosActivos = $stmtCursosActivos->fetch()['total'];

        // Evaluaciones completas (filtrar por rol del usuario)
        if ($rol === 'director' && $cod_esp) {
            // Solo evaluaciones de la especialidad del director
            $queryEvaluacionesCompletas = "SELECT COUNT(*) as total FROM postulaciones WHERE estado IN ('APROBADO', 'RECHAZADO') AND cod_esp = ?";
            $stmtEvaluacionesCompletas = $db->prepare($queryEvaluacionesCompletas);
            $stmtEvaluacionesCompletas->execute([$cod_esp]);
        } else {
            // Todas las evaluaciones completas (para admin, decano)
            $queryEvaluacionesCompletas = "SELECT COUNT(*) as total FROM postulaciones WHERE estado IN ('APROBADO', 'RECHAZADO')";
            $stmtEvaluacionesCompletas = $db->prepare($queryEvaluacionesCompletas);
            $stmtEvaluacionesCompletas->execute();
        }
        $evaluacionesCompletas = $stmtEvaluacionesCompletas->fetch()['total'];

        // Tasa de aprobación (filtrar por rol del usuario)
        if ($rol === 'director' && $cod_esp) {
            // Solo postulaciones de la especialidad del director
            $queryTotalPostulaciones = "SELECT COUNT(*) as total FROM postulaciones WHERE estado IN ('APROBADO', 'RECHAZADO') AND cod_esp = ?";
            $stmtTotalPostulaciones = $db->prepare($queryTotalPostulaciones);
            $stmtTotalPostulaciones->execute([$cod_esp]);
            $totalEvaluadas = $stmtTotalPostulaciones->fetch()['total'];

            $queryAprobadas = "SELECT COUNT(*) as total FROM postulaciones WHERE estado = 'APROBADO' AND cod_esp = ?";
            $stmtAprobadas = $db->prepare($queryAprobadas);
            $stmtAprobadas->execute([$cod_esp]);
            $aprobadas = $stmtAprobadas->fetch()['total'];
        } else {
            // Todas las postulaciones (para admin, decano)
            $queryTotalPostulaciones = "SELECT COUNT(*) as total FROM postulaciones WHERE estado IN ('APROBADO', 'RECHAZADO')";
            $stmtTotalPostulaciones = $db->prepare($queryTotalPostulaciones);
            $stmtTotalPostulaciones->execute();
            $totalEvaluadas = $stmtTotalPostulaciones->fetch()['total'];

            $queryAprobadas = "SELECT COUNT(*) as total FROM postulaciones WHERE estado = 'APROBADO'";
            $stmtAprobadas = $db->prepare($queryAprobadas);
            $stmtAprobadas->execute();
            $aprobadas = $stmtAprobadas->fetch()['total'];
        }

        $tasaAprobacion = $totalEvaluadas > 0 ? round(($aprobadas / $totalEvaluadas) * 100) : 0;

        $stats = [
            'totalDocentes' => (int)$totalDocentes,
            'docentesActivos' => (int)$docentesActivos,
            'postulacionesPendientes' => (int)$postulacionesPendientes,
            'cursosActivos' => (int)$cursosActivos,
            'evaluacionesCompletas' => (int)$evaluacionesCompletas,
            'tasaAprobacion' => (int)$tasaAprobacion
        ];

        sendResponse(true, "Estadísticas obtenidas correctamente", $stats);

    } catch (Exception $e) {
        error_log("Error en getStats: " . $e->getMessage());
        sendResponse(false, "Error interno del servidor", null, 500);
    }
}

// ========================================================================
// FUNCIÓN PARA OBTENER DISTRIBUCIÓN DE POSTULACIONES
// ========================================================================
function getPostulacionesDistribucion($db) {
    try {
        // Obtener parámetros del usuario logueado
        $rol = $_GET['rol'] ?? null;
        $cod_esp = $_GET['cod_esp'] ?? null;
        
        if ($rol === 'director' && $cod_esp) {
            // Solo postulaciones de la especialidad del director
            $query = "SELECT 
                        estado,
                        COUNT(*) as cantidad
                      FROM postulaciones 
                      WHERE cod_esp = ?
                      GROUP BY estado
                      ORDER BY cantidad DESC";
            $stmt = $db->prepare($query);
            $stmt->execute([$cod_esp]);
        } else {
            // Todas las postulaciones (para admin, decano)
            $query = "SELECT 
                        estado,
                        COUNT(*) as cantidad
                      FROM postulaciones 
                      GROUP BY estado
                      ORDER BY cantidad DESC";
            $stmt = $db->prepare($query);
            $stmt->execute();
        }
        $resultados = $stmt->fetchAll();

        $total = array_sum(array_column($resultados, 'cantidad'));
        
        $distribucion = [];
        $colores = [
            'PENDIENTE' => '#f59e0b',
            'EVALUANDO' => '#3b82f6', 
            'APROBADO' => '#10b981',
            'RECHAZADO' => '#ef4444'
        ];

        $etiquetas = [
            'PENDIENTE' => 'En Revisión',
            'EVALUANDO' => 'Evaluando',
            'APROBADO' => 'Aprobado',
            'RECHAZADO' => 'Rechazado'
        ];

        foreach ($resultados as $resultado) {
            $estado = $resultado['estado'];
            $cantidad = (int)$resultado['cantidad'];
            $porcentaje = $total > 0 ? round(($cantidad / $total) * 100) : 0;

            $distribucion[] = [
                'estado' => $etiquetas[$estado] ?? $estado,
                'cantidad' => $cantidad,
                'porcentaje' => $porcentaje,
                'color' => $colores[$estado] ?? '#6b7280'
            ];
        }

        sendResponse(true, "Distribución de postulaciones obtenida correctamente", $distribucion);

    } catch (Exception $e) {
        error_log("Error en getPostulacionesDistribucion: " . $e->getMessage());
        sendResponse(false, "Error interno del servidor", null, 500);
    }
}

// ========================================================================
// FUNCIÓN PARA OBTENER CURSOS MÁS POPULARES
// ========================================================================
function getCursosPopulares($db) {
    try {
        $query = "SELECT 
                    c.c_nomcur as curso,
                    f.nom_fac as facultad,
                    e.nom_esp as especialidad,
                    c.n_ciclo as ciclo,
                    COUNT(dc.id) as postulaciones
                  FROM cursos c
                  LEFT JOIN docente_cursos dc ON c.id = dc.curso_id
                  LEFT JOIN facultades f ON c.c_codfac = f.cod_fac
                  LEFT JOIN especialidades e ON c.c_codfac = e.cod_fac AND c.c_codesp = e.cod_esp
                  WHERE c.estado = 1
                  GROUP BY c.id, c.c_nomcur, f.nom_fac, e.nom_esp, c.n_ciclo
                  ORDER BY postulaciones DESC
                  LIMIT 5";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $cursosPopulares = $stmt->fetchAll();

        // Formatear los resultados
        $cursosFormateados = [];
        foreach ($cursosPopulares as $curso) {
            $cursosFormateados[] = [
                'curso' => $curso['curso'],
                'postulaciones' => (int)$curso['postulaciones'],
                'facultad' => $curso['facultad'] ?? 'Sin facultad',
                'especialidad' => $curso['especialidad'] ?? 'Sin especialidad',
                'nivel' => 'Ciclo ' . $curso['ciclo']
            ];
        }

        sendResponse(true, "Cursos populares obtenidos correctamente", $cursosFormateados);

    } catch (Exception $e) {
        error_log("Error en getCursosPopulares: " . $e->getMessage());
        sendResponse(false, "Error interno del servidor", null, 500);
    }
}

// ========================================================================
// FUNCIÓN PARA OBTENER ACTIVIDAD RECIENTE
// ========================================================================
function getActividadReciente($db) {
    try {
        // Obtener actividades recientes de diferentes tablas
        $actividades = [];

        // Postulaciones recientes
        $queryPostulaciones = "SELECT 
                                'Nueva postulación registrada' as accion,
                                created_at,
                                'postulacion' as tipo
                               FROM postulaciones 
                               ORDER BY created_at DESC 
                               LIMIT 3";
        $stmtPostulaciones = $db->prepare($queryPostulaciones);
        $stmtPostulaciones->execute();
        $postulaciones = $stmtPostulaciones->fetchAll();

        // Usuarios recientes
        $queryUsuarios = "SELECT 
                           'Nuevo docente registrado' as accion,
                           created_at,
                           'usuario' as tipo
                          FROM usuarios 
                          WHERE rol = 'docente'
                          ORDER BY created_at DESC 
                          LIMIT 2";
        $stmtUsuarios = $db->prepare($queryUsuarios);
        $stmtUsuarios->execute();
        $usuarios = $stmtUsuarios->fetchAll();

        // Combinar y ordenar actividades
        $todasActividades = array_merge($postulaciones, $usuarios);
        
        // Ordenar por fecha
        usort($todasActividades, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        // Formatear tiempo relativo
        $actividadesFormateadas = [];
        foreach (array_slice($todasActividades, 0, 4) as $actividad) {
            $tiempo = time() - strtotime($actividad['created_at']);
            
            if ($tiempo < 60) {
                $tiempoTexto = $tiempo . ' seg';
            } elseif ($tiempo < 3600) {
                $tiempoTexto = floor($tiempo / 60) . ' min';
            } elseif ($tiempo < 86400) {
                $tiempoTexto = floor($tiempo / 3600) . ' h';
            } else {
                $tiempoTexto = floor($tiempo / 86400) . ' días';
            }

            $actividadesFormateadas[] = [
                'accion' => $actividad['accion'],
                'tiempo' => $tiempoTexto,
                'tipo' => $actividad['tipo']
            ];
        }

        sendResponse(true, "Actividad reciente obtenida correctamente", $actividadesFormateadas);

    } catch (Exception $e) {
        error_log("Error en getActividadReciente: " . $e->getMessage());
        sendResponse(false, "Error interno del servidor", null, 500);
    }
}
?>