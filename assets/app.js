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

  var COL = { all: '#12a150', most: '#6cc04a', some: '#f0a21a', none: '#e5484d' };
  function level(share) { return share >= 0.99 ? 'all' : share >= 0.5 ? 'most' : share > 0 ? 'some' : 'none'; }
  var LABEL_SHIFT = { skfo: [-6, 30], yfo: [-6, 4], cfo: [4, 0] };

  // Карта федеральных округов; lv(округ) -> all | most | some | none
  function mapSvg(lv, tip, labels) {
    var M = window.RU_MAP; if (!M) return '';
    var ids = Object.keys(M.paths);
    var paths = ids.map(function (k) {
      return '<path d="' + M.paths[k] + '" fill="' + COL[lv(k)] + '"><title>' + esc(tip ? tip(k) : M.names[k]) + '</title></path>';
    }).join('');
    var text = labels === false ? '' : ids.map(function (k) {
      var p = M.labels[k], sh = LABEL_SHIFT[k] || [0, 0];
      return '<text x="' + (p[0] + sh[0]) + '" y="' + (p[1] + sh[1]) + '" text-anchor="middle">' + esc(M.names[k]) + '</text>';
    }).join('');
    return '<svg class="rumap" viewBox="0 0 ' + M.w + ' ' + M.h + '" role="img" aria-label="Карта федеральных округов России">' + paths + text + '</svg>';
  }

  function render(d) {
    var regs = Object.keys(d.regions), ops = d.operators;
    var share = d.open / d.total, lv = level(share);
    var cls = lv === 'all' ? 'ok' : lv === 'none' ? 'bad' : 'warn';
    var title = !d.ips.length ? 'Не удалось определить IP-адрес'
      : lv === 'all' ? (d.known ? 'Известный сервис: открывается у всех операторов по всей стране' : 'Есть в белых списках у всех операторов')
      : lv === 'none' ? 'В белых списках не найден' : 'Открывается частично — только ' + d.open + ' из ' + d.total + ' сочетаний «оператор × регион»';

    // карта округов
    var map = mapSvg(function (r) { return level(ops.filter(function (o) { return o.regions[r]; }).length / ops.length); },
      function (r) { var n = ops.filter(function (o) { return o.regions[r]; }).length; return d.regions[r] + ': открывается у ' + n + ' из ' + ops.length + ' операторов'; });

    // матрица оператор × округ
    var head = '<div class="mx__h"></div>' + regs.map(function (r) { return '<div class="mx__h">' + esc(d.regions[r]) + '</div>'; }).join('');
    var rows = ops.map(function (o, i) {
      return '<div class="mx__op">' + esc(o.name) + '</div>' + regs.map(function (r, j) {
        var ok = o.regions[r];
        return '<div class="mx__c ' + (ok ? 'in' : 'out') + '" style="animation-delay:' + (i * 5 + j) * 28 + 'ms" title="' + esc(o.name + ', ' + d.regions[r]) + ': ' + (ok ? 'открывается' : 'не открывается') + '">' + (ok ? '✓' : '✕') + '</div>';
      }).join('');
    }).join('');

    out.innerHTML =
      '<div class="verdict verdict--' + cls + '"><span class="dot ' + cls + '"></span><div><b>' + esc(d.query) + '</b><span>' + esc(title) + '</span></div></div>' +
      (d.demo ? '<p class="demo">Демонстрационный режим: для сайтов вне известных сервисов результат пока имитирует разброс по регионам и операторам. Реальные замеры подключим вместе с базами операторов.</p>' : '') +
      '<div class="viz"><div class="rumap-wrap">' + map + '</div>' +
      '<div class="mx" style="grid-template-columns:auto repeat(' + regs.length + ',1fr)">' + head + rows + '</div></div>' +
      '<ul class="legend"><li><i class="tile--all"></i>открывается у всех</li><li><i class="tile--most"></i>у большинства</li><li><i class="tile--some"></i>у части</li><li><i class="tile--none"></i>не открывается</li></ul>' +
      (d.ips.length ? '<p class="ips">IP: ' + d.ips.map(esc).join(', ') + '</p>' : '') +
      (lv !== 'all' && d.ips.length ? '<div class="cta"><p>Сайт доступен не везде. Мы подключим его к белым IP, и он будет открываться у всех операторов.</p><a class="btn" href="#lead">Добавить в белые списки →</a></div>' : '');
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

  // ---- карты «вы против конкурента»
  document.querySelectorAll('[data-rumap]').forEach(function (el) {
    var st = el.getAttribute('data-rumap');
    el.innerHTML = mapSvg(function () { return st; }, function (k) { return window.RU_MAP.names[k] + (st === 'all' ? ': открывается' : ': не открывается'); });
  });

  // ---- калькулятор потерь
  var rub = function (n) { return Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₽'; };
  function calc() {
    var b = +$('#i-budget').value, sh = +$('#i-share').value, dd = +$('#i-days').value;
    var loss = b * sh / 100 * dd;
    $('#o-budget').textContent = rub(b); $('#o-share').textContent = sh + '%'; $('#o-days').textContent = dd;
    $('#o-loss').textContent = rub(loss);
    var plan = PLANS[0].price, k = loss / plan;
    $('#o-vs').textContent = k >= 1.5 ? 'Это примерно в ' + (Math.round(k * 10) / 10).toString().replace('.', ',') + ' раза больше, чем стоит подключение (от ' + rub(plan) + ' в месяц)' : 'Подключение стоит от ' + rub(plan) + ' в месяц';
  }
  // ---- тарифы (цены — заглушки, правятся здесь)
  var PLANS = [
    { id: 'start', name: 'Старт', desc: 'Один домен без поддоменов', price: 9900, items: ['1 домен', 'Все операторы', 'Подключение за 5–10 минут', 'Гарантия доступности'] },
    { id: 'business', name: 'Бизнес', desc: 'Домен и поддомены', price: 14900, hot: true, items: ['Домен + все поддомены', 'Все операторы', 'Подключение за 5–10 минут', 'Замена IP в течение часа', 'Приоритетная поддержка', 'Ежемесячный отчёт'] },
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
        '<a class="btn' + (p.hot ? '' : ' btn--ghost') + '" href="#lead" data-plan="' + p.id + '">Тест 3 дня бесплатно</a></article>';
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
  ['#i-budget', '#i-share', '#i-days'].forEach(function (id) { $(id).addEventListener('input', calc); });
  calc();

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
