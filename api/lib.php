<?php
declare(strict_types=1);

function json_out(array $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function config(): array {
    static $c = null;
    if ($c === null) {
        $f = __DIR__ . '/config.php';
        $c = is_file($f) ? require $f : require __DIR__ . '/config.sample.php';
    }
    return $c;
}

// не больше $max запросов за $window секунд с одного IP
function rate_limit(string $key, int $max, int $window): void {
    $dir = sys_get_temp_dir() . '/vbs-rl';
    @mkdir($dir, 0700, true);
    $file = $dir . '/' . md5($key . ($_SERVER['REMOTE_ADDR'] ?? ''));
    $now = time();
    $hits = is_file($file) ? array_filter(array_map('intval', explode(',', (string)file_get_contents($file))), fn($t) => $t > $now - $window) : [];
    if (count($hits) >= $max) json_out(['error' => 'Слишком много запросов, попробуйте позже'], 429);
    $hits[] = $now;
    file_put_contents($file, implode(',', $hits), LOCK_EX);
}

function ip_in_cidr(string $ip, string $cidr): bool {
    [$net, $bits] = array_pad(explode('/', $cidr, 2), 2, null);
    $a = @inet_pton($ip); $b = @inet_pton((string)$net);
    if ($a === false || $b === false || strlen($a) !== strlen($b)) return false;
    $bits = $bits === null ? strlen($a) * 8 : (int)$bits;
    $bytes = intdiv($bits, 8); $rest = $bits % 8;
    if ($bytes && substr($a, 0, $bytes) !== substr($b, 0, $bytes)) return false;
    if ($rest === 0) return true;
    $mask = (0xFF << (8 - $rest)) & 0xFF;
    return (ord($a[$bytes]) & $mask) === (ord($b[$bytes]) & $mask);
}
