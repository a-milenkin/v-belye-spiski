<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';

rate_limit('check', 30, 60);

$q = strtolower(trim((string)($_GET['q'] ?? '')));
$q = preg_replace('~^[a-z]+://~', '', $q);
$q = preg_replace('~[/?#:].*$~', '', $q);
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

// Списки операторов: data/whitelist/<id>.txt — по одному IP или CIDR в строке, # — комментарий
$ops = config()['operators'];
$res = [];
foreach ($ops as $id => $name) {
    $file = dirname(__DIR__) . '/data/whitelist/' . $id . '.txt';
    $rules = is_file($file) ? preg_split('/\R/', (string)file_get_contents($file), -1, PREG_SPLIT_NO_EMPTY) : [];
    $rules = array_values(array_filter(array_map(fn($l) => trim(preg_replace('/#.*/', '', $l)), $rules)));
    $listed = false;
    foreach ($ips as $ip) foreach ($rules as $rule) if (ip_in_cidr($ip, $rule)) { $listed = true; break 2; }
    $res[] = ['id' => $id, 'name' => $name, 'listed' => $listed];
}

json_out(['query' => $q, 'ips' => $ips, 'operators' => $res]);
