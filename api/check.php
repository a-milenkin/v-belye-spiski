<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

rate_limit('check', 30, 60);

$q = strtolower(trim((string)($_GET['q'] ?? '')));
$q = preg_replace('~^[a-z]+://~', '', $q);
$q = preg_replace('~[/?#:].*$~', '', $q);
$q = preg_replace('~^www\.~', '', $q);
if ($q === '' || strlen($q) > 253) json_out(['error' => 'Введите домен или IP'], 400);

$isIp = filter_var($q, FILTER_VALIDATE_IP) !== false;
if (!$isIp) {
    $idn = function_exists('idn_to_ascii') ? idn_to_ascii($q, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46) : $q;
    if ($idn === false || !preg_match('/^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$/', $idn)) {
        json_out(['error' => 'Некорректный домен'], 400);
    }
    $host = $idn;
}

$ips = [];
if ($isIp) {
    $ips = [$q];
} else {
    foreach (@dns_get_record($host, DNS_A) ?: [] as $r) if (!empty($r['ip'])) $ips[] = $r['ip'];
    foreach (@dns_get_record($host, DNS_AAAA) ?: [] as $r) if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
    $ips = array_values(array_unique($ips));
}

$cfg = config();
$regions = $cfg['regions'];

// Сервисы, которые операторы держат в белых списках по всей стране (список правится в config.sample.php)
$known = false;
if (!$isIp) {
    foreach ($cfg['known_domains'] as $d) {
        if ($host === $d || str_ends_with($host, '.' . $d)) { $known = true; break; }
    }
}

// Реальные списки операторов: data/whitelist/<id>.txt — по одному IP или CIDR в строке, # — комментарий.
// Пока там только тестовые адреса, данные считаются демонстрационными.
$demo = false;
$ops = [];
foreach ($cfg['operators'] as $id => $name) {
    $file = dirname(__DIR__) . '/data/whitelist/' . $id . '.txt';
    $rules = is_file($file) ? preg_split('/\R/', (string)file_get_contents($file), -1, PREG_SPLIT_NO_EMPTY) : [];
    $rules = array_values(array_filter(array_map(fn($l) => trim(preg_replace('/#.*/', '', $l)), $rules)));
    $inList = false;
    foreach ($ips as $ip) foreach ($rules as $rule) if (ip_in_cidr($ip, $rule)) { $inList = true; break 2; }

    $cells = [];
    foreach ($regions as $rid => $rname) {
        if ($known || $inList) {
            $cells[$rid] = true;
        } else {
            // Демо: у «чужих» сайтов доступность зависит от региона и провайдера.
            // Детерминированно по домену, чтобы повторная проверка давала тот же ответ.
            $demo = true;
            $cells[$rid] = (crc32($q . '|' . $id . '|' . $rid) % 100) < (int)$cfg['demo_open_percent'];
        }
    }
    $ops[] = ['id' => $id, 'name' => $name, 'regions' => $cells, 'open' => count(array_filter($cells))];
}

$total = count($ops) * count($regions);
$open = array_sum(array_column($ops, 'open'));

json_out([
    'query' => $q,
    'ips' => $ips,
    'known' => $known,
    'demo' => $demo,
    'regions' => $regions,
    'operators' => $ops,
    'open' => $open,
    'total' => $total,
]);
