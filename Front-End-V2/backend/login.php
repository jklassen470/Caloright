<!DOCTYPE html>
<html>
<head></head>
<body>

<h1>CaloRight Login</h1>

<?php
// HTML login form for testing authentication outside of React.
// Verifying the email, password, and 2FA code against the database and starting a session if everything passes.

require __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/db.php';

session_start();

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\QRServerProvider;

// Setting up the 2FA library to verify the code the user enters.
$tfa = new TwoFactorAuth(new QRServerProvider(), "CaloRight");

// Handling the form submission when the user clicks Log in.
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['authSubmit'])) {
    $email    = trim($_POST['email']);
    $password = $_POST['password'];
    $authcode = $_POST['authcode'];

    // Looking up the user in the database by their email address.
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $error = "No account found with that email.";
    } elseif (!password_verify($password, $user['password_hash'])) {
        $error = "Incorrect password.";
    } else {
        // Fetching the 2FA secret for this user to verify their authenticator code.
        $stmt2 = $pdo->prepare("SELECT secret FROM twofact WHERE user_id = ? AND is_enabled = 1");
        $stmt2->execute([$user['user_id']]);
        $twofact = $stmt2->fetch(PDO::FETCH_ASSOC);

        if (!$twofact) {
            $error = "2FA is not set up for this account.";
        } elseif (!$tfa->verifyCode($twofact['secret'], $authcode)) {
            $error = "Invalid 2FA code.";
        } else {
            // Storing the user ID and name in the session so other pages know who is logged in.
            $_SESSION['user_id']   = $user['user_id'];
            $_SESSION['full_name'] = $user['full_name'];
            header("Location: register.php");
            exit;
        }
    }
}
?>

<h2>Enter your information below</h2>

<?php if (isset($error)) echo "<p style='color:red;'>$error</p>"; ?>

<form method="post" action="<?php echo $_SERVER['PHP_SELF']; ?>">
    <input type="email" placeholder="Email" name="email" value="<?php if (isset($_POST['email'])) echo htmlspecialchars($_POST['email']); ?>" required><br>
    <input type="password" placeholder="Password" name="password" required><br>
    <input type="text" placeholder="2FA Code" name="authcode"><br>
    <input type="submit" name="authSubmit" value="Log in">
</form>

<h2>Don't have an account?</h2>
<form method="post" action="register.php">
    <button type="submit">Register here</button>
</form>

</body>
</html>