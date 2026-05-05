<!DOCTYPE html>
<html>
<head></head>
<body>

<h1>CaloRight Register</h1>

<?php
// HTML registration form for testing account creation outside of React.
// Submitting the form creates a user in the database and saves their 2FA secret.

require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/db.php';

session_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\QRServerProvider;

// Setting up the 2FA library with QR Server to generate the QR code image.
$tfa = new TwoFactorAuth(new QRServerProvider(), "CaloRight");

// Generating a new 2FA secret when the page loads and storing it in the session.
// This keeps the same secret on screen until the user submits the form.
if (!isset($_SESSION['userSecret'])) {
    $_SESSION['userSecret'] = $tfa->createSecret();
}
?>

<h2>Enter your information below</h2>

<form method="post" action="<?php echo $_SERVER['PHP_SELF']; ?>">
    <input type="text" placeholder="Full Name" name="full_name" value="<?php if (isset($_POST['full_name'])) echo htmlspecialchars($_POST['full_name']); ?>" required><br>
    <input type="email" placeholder="Email" name="email" value="<?php if (isset($_POST['email'])) echo htmlspecialchars($_POST['email']); ?>" required><br>
    <input type="password" placeholder="Password" name="password" required><br>
    <input type="text" placeholder="2FA Code" name="authcode"><br>
    <input type="submit" name="regSubmit" value="Register">
</form>

<img src="<?php echo $tfa->getQRCodeImageAsDataUri('', $_SESSION['userSecret']); ?>">
<br>
<p>Scan this QR code or enter this code in Google Authenticator:</p>
<b><?php echo $_SESSION['userSecret']; ?></b>

<?php
// Handling the form submission when the user clicks Register.
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['regSubmit'])) {
    $full_name = trim($_POST['full_name']);
    $email     = trim($_POST['email']);
    $password  = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $authcode  = $_POST['authcode'];

    // Checking the submitted 2FA code against the secret stored in the session.
    $result = $tfa->verifyCode($_SESSION['userSecret'], $authcode);

    if ($result) {
        try {
            // Inserting the new user into the users table and storing the new user ID.
            $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)");
            $stmt->execute([$full_name, $email, $password]);
            $userId = $pdo->lastInsertId();

            // Saving the 2FA secret to the twofact table so the user can log in with Google Authenticator.
            $stmt2 = $pdo->prepare("INSERT INTO twofact (user_id, secret, is_enabled, verified_at) VALUES (?, ?, 1, NOW())");
            $stmt2->execute([$userId, $_SESSION['userSecret']]);

            unset($_SESSION['userSecret']);
            header("Location: login.php");
            exit;
        } catch (PDOException $e) {
            echo "<br>Email already in use.";
        }
    } else {
        echo "<br>2FA code invalid.";
    }
}
?>

</body>
</html>