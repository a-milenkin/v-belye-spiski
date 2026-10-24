(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };

  // ---- мобильное меню
  var burger = $('#burger'), nav = $('#nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', function () { nav.classList.remove('open'); });

  // ---- чекер
  var form = $('#checkForm'), input = $('#checkInput'), btn = $('#checkBtn'), out = $('#result');
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };

  function normalize(v) {
    return v.trim().replace(/^[a-z]+:\/\//i, '').replace(/[\/?#].*$/, '').replace(/:\d+$/, '').toLowerCase();
  }

  function render(d) {
    var inCount = d.operators.filter(function (o) { return o.listed; }).length;
    var total = d.operators.length, cls, title;
    if (!d.ips.length) { cls = 'bad'; title = 'Не удалось определить IP-адрес'; }
    else if (inCount === total) { cls = 'ok'; title = 'Есть в белых списках всех операторов'; }
    else if (inCount === 0) { cls = 'bad'; title = 'В белых списках не найден'; }
    else { cls = 'warn'; title = 'Есть у ' + inCount + ' из ' + total + ' операторов'; }
    var ops = d.operators.map(function (o) {
      return '<li><span>' + esc(o.name) + '</span><span class="' + (o.listed ? 'in' : 'out') + '">' + (o.listed ? 'в списке' : 'нет в списке') + '</span></li>';
    }).join('');
    out.innerHTML = '<p class="verdict"><span class="dot ' + cls + '"></span>' + esc(d.query) + ' — ' + esc(title) + '</p>' +
      (d.operators.length ? '<ul class="ops">' + ops + '</ul>' : '') +
      (d.ips.length ? '<p class="ips">IP: ' + d.ips.map(esc).join(', ') + '</p>' : '') +
      (inCount < total && d.ips.length ? '<p class="ips"><a href="#lead">Подключить сайт к белому IP →</a></p>' : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = normalize(input.value);
    if (!q) { input.focus(); return; }
    btn.disabled = true; btn.textContent = 'Проверяем…';
    out.innerHTML = '<p class="result__hint">Запрашиваем данные…</p>';
    fetch('/api/check.php?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Ошибка'); return j; }); })
      .then(render)
      .catch(function (err) { out.innerHTML = '<p class="verdict"><span class="dot bad"></span>' + esc(err.message || 'Сервис недоступен') + '</p>'; })
      .then(function () { btn.disabled = false; btn.textContent = 'Проверить'; });
  });
  document.querySelectorAll('[data-ex]').forEach(function (b) {
    b.addEventListener('click', function () { input.value = b.dataset.ex; form.requestSubmit(); });
  });

  // ---- тарифы (цены — заглушки, правятся здесь)
  var PLANS = [
    { id: 'start', name: 'Старт', desc: 'Один домен без поддоменов', price: 9900, items: ['1 домен', 'Все операторы', 'Подключение за 48 часов', 'Гарантия доступности'] },
    { id: 'business', name: 'Бизнес', desc: 'Домен и поддомены', price: 14900, hot: true, items: ['Домен + все поддомены', 'Все операторы', 'Подключение за 24 часа', 'Замена IP в течение часа', 'Приоритетная поддержка', 'Ежемесячный отчёт'] },
    { id: 'max', name: 'Максимум', desc: 'Белый список + защита от DDoS', price: 19900, items: ['Всё из тарифа «Бизнес»', 'Защита от DDoS', 'Максимальный приоритет', 'Расширенный SLA', 'Выделенная поддержка'] }
  ];
  var DISC = { 1: 0, 6: 0.07, 12: 0.10 }, months = 1;
  var fmt = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽'; };

  function renderPlans() {
    var d = DISC[months];
    $('#plans').innerHTML = PLANS.map(function (p) {
      var per = p.price * (1 - d), total = per * months;
      return '<article class="card plan' + (p.hot ? ' plan--hot' : '') + '">' +
        (p.hot ? '<span class="plan__tag">Выбирают чаще</span>' : '') +
        '<h3>' + p.name + '</h3><p>' + p.desc + '</p>' +
        '<div class="plan__price">' + fmt(per) + ' <small>/ мес</small></div>' +
        '<div class="plan__old">' + (d ? fmt(p.price) + ' / мес' : '') + '</div>' +
        '<div class="plan__tot">' + (months > 1 ? 'Итого ' + fmt(total) + ' за период' : '') + '</div>' +
        '<ul>' + p.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>' +
        '<a class="btn' + (p.hot ? '' : ' btn--ghost') + '" href="#lead" data-plan="' + p.id + '">Выбрать ' + p.name + '</a></article>';
    }).join('');
  }
  $('#period').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    months = +b.dataset.m;
    this.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
    renderPlans();
  });
  $('#plans').addEventListener('click', function (e) {
    var a = e.target.closest('[data-plan]'); if (a) $('#leadPlan').value = a.dataset.plan + ' / ' + months + ' мес';
  });
  renderPlans();

  // ---- заявка
  var lf = $('#leadForm'), lb = $('#leadBtn'), msg = $('#leadMsg');
  lf.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    lf.querySelectorAll('input[required]').forEach(function (i) { var bad = !i.value.trim(); i.classList.toggle('err', bad); if (bad) ok = false; });
    msg.className = 'form__msg';
    if (!ok) { msg.textContent = 'Заполните все поля'; msg.classList.add('err'); return; }
    lb.disabled = true; msg.textContent = 'Отправляем…';
    fetch('/api/lead.php', { method: 'POST', body: new FormData(lf) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Ошибка'); return j; }); })
      .then(function () { lf.reset(); msg.textContent = 'Спасибо! Заявка отправлена, свяжемся в течение часа.'; })
      .catch(function (err) { msg.textContent = err.message || 'Не удалось отправить'; msg.classList.add('err'); })
      .then(function () { lb.disabled = false; });
  });
})();
