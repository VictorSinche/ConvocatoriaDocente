<?php
// Test script to verify user update functionality
header('Content-Type: application/json');
require_once 'backend/config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Get all users to see their current state
    $query = "SELECT id, email, rol, estado FROM usuarios ORDER BY id";
    $stmt = $conn->prepare($query);
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current users:\n";
    foreach ($users as $user) {
        echo "ID: {$user['id']}, Email: {$user['email']}, Rol: {$user['rol']}, Estado: {$user['estado']}\n";
    }
    
    // Test updating the first non-admin user
    foreach ($users as $user) {
        if ($user['rol'] !== 'administrador') {
            echo "\nTesting update for user ID: {$user['id']}\n";
            
            // Toggle estado
            $newEstado = ($user['estado'] == 1) ? 0 : 1;
            $updateQuery = "UPDATE usuarios SET estado = ? WHERE id = ?";
            $updateStmt = $conn->prepare($updateQuery);
            $result = $updateStmt->execute([$newEstado, $user['id']]);
            
            if ($result) {
                echo "✅ Successfully updated user {$user['id']} estado from {$user['estado']} to {$newEstado}\n";
                
                // Verify the update
                $verifyQuery = "SELECT estado FROM usuarios WHERE id = ?";
                $verifyStmt = $conn->prepare($verifyQuery);
                $verifyStmt->execute([$user['id']]);
                $updatedUser = $verifyStmt->fetch();
                echo "✅ Verified: new estado is {$updatedUser['estado']}\n";
                
                // Revert the change
                $revertQuery = "UPDATE usuarios SET estado = ? WHERE id = ?";
                $revertStmt = $conn->prepare($revertQuery);
                $revertStmt->execute([$user['estado'], $user['id']]);
                echo "✅ Reverted back to original estado: {$user['estado']}\n";
            } else {
                echo "❌ Failed to update user {$user['id']}\n";
            }
            break; // Only test first non-admin user
        }
    }
    
} catch(Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
