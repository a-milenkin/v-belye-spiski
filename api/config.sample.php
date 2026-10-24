<?php
// Скопируйте в config.php и заполните. config.php не коммитится в git.
return [
    'operators' => ['mts' => 'МТС', 'beeline' => 'Билайн', 'megafon' => 'МегаФон', 'tele2' => 'Tele2'],
    'regions' => ['szfo' => 'СЗФО', 'cfo' => 'ЦФО', 'yfo' => 'ЮФО', 'skfo' => 'СКФО', 'pfo' => 'ПФО', 'ufo' => 'УФО', 'sfo' => 'СФО', 'dfo' => 'ДФО'],
    // Сервисы, доступные у операторов по всей стране (поддомены учитываются). Проверяйте актуальность.
    'known_domains' => [
        'gosuslugi.ru', 'sber.ru', 'sberbank.ru', 'sberbank.com', 'yandex.ru', 'ya.ru', 'yandex.com', 'dzen.ru', 'kinopoisk.ru',
        'vk.com', 'vk.ru', 'ok.ru', 'mail.ru', 'ozon.ru', 'wildberries.ru', 'avito.ru', 'rzd.ru', 'mos.ru', 'nalog.gov.ru',
        'tbank.ru', 'tinkoff.ru', 'alfabank.ru', 'gazprombank.ru', 'vtb.ru', 'nspk.ru', 'mir-pay.ru', 'hh.ru', '2gis.ru',
        'magnit.ru', '5ka.ru', 'x5.ru', 'perekrestok.ru', 'rutube.ru', 'kremlin.ru', 'government.ru', 'cbr.ru',
    ],
    // Для демо: шанс, что чужой сайт открывается у конкретного оператора в конкретном округе
    'demo_open_percent' => 12,
    'telegram_token' => '',     // токен бота от @BotFather
    'telegram_chat_id' => '',   // id чата/канала, куда слать заявки
    'mail_to' => '',            // запасной вариант: email для заявок
    'mail_from' => 'noreply@v-belye-spiski.ru',
    'leads_dir' => '',          // абсолютный путь к папке ВНЕ public_html для leads.log (необязательно)
];
