<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'Method not allowed'], 405);
rate_limit('lead', 5, 600);

if (!empty($_POST['website'])) json_out(['ok' => true]); // honeypot

$clean = fn(string $k, int $max) => mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string)($_POST[$k] ?? ''))), 0, $max);
$domain = $clean('domain', 253); $name = $clean('name', 100); $contact = $clean('contact', 100); $plan = $clean('plan', 60);
if ($domain === '' || $name === '' || $contact === '') json_out(['error' => 'Заполните все поля'], 400);

$cfg = config();
$text = "Новая заявка\nСайт: $domain\nИмя: $name\nКонтакт: $contact" . ($plan !== '' ? "\nТариф: $plan" : '') . "\nIP: " . ($_SERVER['REMOTE_ADDR'] ?? '-');
$sent = false;

if (!empty($cfg['telegram_token']) && !empty($cfg['telegram_chat_id'])) {
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'timeout' => 8, 'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query(['chat_id' => $cfg['telegram_chat_id'], 'text' => $text])]]);
    $sent = @file_get_contents("https://api.telegram.org/bot{$cfg['telegram_token']}/sendMessage", false, $ctx) !== false;
}
if (!$sent && !empty($cfg['mail_to'])) {
    $sent = mail($cfg['mail_to'], '=?UTF-8?B?' . base64_encode('Заявка: ' . $domain) . '?=', $text,
        "Content-Type: text/plain; charset=utf-8\r\nFrom: " . ($cfg['mail_from'] ?? 'noreply@v-belye-spiski.ru'));
}

// резерв: всегда пишем в лог вне публичной директории, если есть куда
$logDir = $cfg['leads_dir'] ?? '';
if ($logDir !== '' && is_dir($logDir)) {
    file_put_contents($logDir . '/leads.log', date('c') . "\n$text\n\n", FILE_APPEND | LOCK_EX);
    $sent = true;
}

if (!$sent) json_out(['error' => 'Не удалось отправить заявку, напишите нам напрямую'], 500);
json_out(['ok' => true]);
