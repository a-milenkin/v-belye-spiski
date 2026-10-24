<?php
// Скопируйте в config.php и заполните. config.php не коммитится в git.
return [
    'operators' => ['mts' => 'МТС', 'beeline' => 'Билайн', 'megafon' => 'МегаФон', 'tele2' => 'Tele2'],
    'telegram_token' => '',     // токен бота от @BotFather
    'telegram_chat_id' => '',   // id чата/канала, куда слать заявки
    'mail_to' => '',            // запасной вариант: email для заявок
    'mail_from' => 'noreply@v-belye-spiski.ru',
    'leads_dir' => '',          // абсолютный путь к папке ВНЕ public_html для leads.log (необязательно)
];
