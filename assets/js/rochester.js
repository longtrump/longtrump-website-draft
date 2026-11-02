/* LTG — Rochester inventory lookup (Search Engine)
   Faithful port of the Rochester query page used on longtrump.com.tw:
   same stock API, same 16 output columns, same custom price-rate formula.
   Prices are LTG's own quotes (cost / (1 - margin)), not Rochester list prices. */

(function () {
  'use strict';

  var form = document.getElementById('rlForm');
  if (!form) return;

  var input = document.getElementById('rlInput');
  var statusEl = document.getElementById('rlStatus');
  var resultsEl = document.getElementById('rlResults');
  var submit = form.querySelector('.rl-submit');
  var initialResults = resultsEl.innerHTML;

  var API = 'https://4j91yv4ms6.execute-api.us-east-1.amazonaws.com/fetch?key=';
  var CONTACT = 'contact.html';
  var busy = false;
  var pendingScroll = false;

  /* Column order is fixed. Labels follow <html lang>; zh-Hant keeps the
     original English headers. Price math below does not read these strings. */
  var COLUMN_EN = [
    'Part Number',
    'ECCN',
    'Rohs Available',
    'Price: 1 To 24',
    'Price: 25 To 99',
    'Price: 100 To 499',
    'Price: 500 To 999',
    'Price: 1000 To 9999',
    'Price: 10000 To 99999',
    'Prices: Over',
    'Manufacturer Code',
    'PB Free Available',
    'Total QTY',
    'Date Code',
    'Notes',
    'Qty'
  ];

  function localeKey() {
    var lang = (document.documentElement.lang || 'zh-Hant').toLowerCase();
    if (lang === 'zh-cn' || lang === 'zh-hans') return 'zh-CN';
    if (lang === 'en' || lang.indexOf('en-') === 0) return 'en';
    if (lang === 'ja' || lang.indexOf('ja-') === 0) return 'ja';
    return 'zh-Hant';
  }

  var UI = {
    'zh-Hant': {
      timeLocale: 'zh-TW',
      columns: COLUMN_EN,
      contactUs: 'Contact Us',
      needQuery: '請先輸入料號，例如 LM358',
      loading: '正在查詢 Rochester 授權庫存…',
      matchZero: '符合 0 個料號',
      match: function (n) { return '符合 ' + n + ' 個料號'; },
      showing: function (parts, rows) { return '顯示前 ' + parts + ' 個、' + rows + ' 筆批號'; },
      rows: function (rows) { return '共 ' + rows + ' 筆批號'; },
      queried: function (time) { return time + ' 查詢'; },
      scrollHint: function (rows) { return '共 ' + rows + ' 筆批號；表格可上下、左右捲動，表頭與料號欄固定'; },
      regionLabel: 'Rochester 查詢結果，可橫向捲動',
      caption: function (n) { return 'Rochester 現貨查詢結果，共 ' + n + ' 筆批號'; },
      noneTitle: function (q) { return '查無「' + q + '」的現貨資料'; },
      noneBody: 'Rochester 只列出有庫存或曾生產的料號。試試更短的前綴（例如把 LM358DR 縮成 LM358），或直接把型號寄給我們，由業務代查替代料與停產前最後一批。',
      askUs: '請我們代查',
      rocelec: '到 rocelec.com 查詢 ↗',
      mailSubject: function (q) { return 'Rochester 代查料號：' + q; },
      failed: '查詢沒有完成，請稍後再試',
      errorTitle: '原廠查詢服務暫時沒有回應',
      errorBody: '可能是網路中斷，或 Rochester 端正在忙碌。你可以重試一次，或直接把料號寄給我們，由業務代查庫存與交期。',
      retry: '再試一次',
      emailUs: '寄料號給我們'
    },
    'zh-CN': {
      timeLocale: 'zh-CN',
      columns: [
        '料号', 'ECCN', 'RoHS',
        '价格：1–24', '价格：25–99', '价格：100–499', '价格：500–999',
        '价格：1,000–9,999', '价格：10,000–99,999', '以上批量',
        '制造商代码', '无铅', '总现货', '批次年份', '备注', '数量'
      ],
      contactUs: '联系我们',
      needQuery: '请先输入料号，例如 LM358',
      loading: '正在查询 Rochester 授权库存…',
      matchZero: '符合 0 个料号',
      match: function (n) { return '符合 ' + n + ' 个料号'; },
      showing: function (parts, rows) { return '显示前 ' + parts + ' 个、' + rows + ' 笔批号'; },
      rows: function (rows) { return '共 ' + rows + ' 笔批号'; },
      queried: function (time) { return time + ' 查询'; },
      scrollHint: function (rows) { return '共 ' + rows + ' 笔批号；表格可上下、左右滚动，表头与料号栏固定'; },
      regionLabel: 'Rochester 查询结果，可横向滚动',
      caption: function (n) { return 'Rochester 现货查询结果，共 ' + n + ' 笔批号'; },
      noneTitle: function (q) { return '查无“' + q + '”的现货资料'; },
      noneBody: 'Rochester 只列出有库存或曾生产的料号。试试更短的前缀（例如把 LM358DR 缩成 LM358），或直接把型号寄给我们，由业务代查替代料与停产前最后一批。',
      askUs: '请我们代查',
      rocelec: '到 rocelec.com 查询 ↗',
      mailSubject: function (q) { return 'Rochester 代查料号：' + q; },
      failed: '查询没有完成，请稍后再试',
      errorTitle: '原厂查询服务暂时没有回应',
      errorBody: '可能是网络中断，或 Rochester 端正在忙碌。你可以重试一次，或直接把料号寄给我们，由业务代查库存与交期。',
      retry: '再试一次',
      emailUs: '寄料号给我们'
    },
    'en': {
      timeLocale: 'en',
      columns: COLUMN_EN,
      contactUs: 'Contact us',
      needQuery: 'Enter a part number first, for example LM358',
      loading: 'Searching Rochester authorized inventory…',
      matchZero: '0 part numbers matched',
      match: function (n) { return n + ' part numbers matched'; },
      showing: function (parts, rows) { return 'Showing the first ' + parts + ', ' + rows + ' date-code rows'; },
      rows: function (rows) { return rows + ' date-code rows in total'; },
      queried: function (time) { return 'Queried at ' + time; },
      scrollHint: function (rows) { return rows + ' date-code rows. Scroll the table vertically and horizontally. The header and part-number column stay fixed.'; },
      regionLabel: 'Rochester results, scroll horizontally',
      caption: function (n) { return 'Rochester stock search results, ' + n + ' date-code rows'; },
      noneTitle: function (q) { return 'No stock data for “' + q + '”'; },
      noneBody: 'Rochester only lists part numbers that are in stock or have been built. Try a shorter prefix (for example shorten LM358DR to LM358), or send us the part number and sales will look up an alternate and the last lot before end of life.',
      askUs: 'Ask us to look it up',
      rocelec: 'Search on rocelec.com ↗',
      mailSubject: function (q) { return 'Rochester lookup: ' + q; },
      failed: 'The search did not finish. Please try again later.',
      errorTitle: 'The factory search service is not responding',
      errorBody: 'The network may be down, or Rochester may be busy. Try again, or send us the part number and sales will check stock and lead time.',
      retry: 'Try again',
      emailUs: 'Email us the part number'
    },
    'ja': {
      timeLocale: 'ja',
      columns: [
        '型番', 'ECCN', 'RoHS',
        '価格: 1–24', '価格: 25–99', '価格: 100–499', '価格: 500–999',
        '価格: 1,000–9,999', '価格: 10,000–99,999', 'それ以上',
        'メーカーコード', 'Pbフリー', '総在庫数', 'デートコード', '備考', '数量'
      ],
      contactUs: 'お問い合わせ',
      needQuery: '型番を入力してください。例：LM358',
      loading: 'Rochester の正規在庫を検索しています…',
      matchZero: '該当する型番は 0 件です',
      match: function (n) { return '該当 ' + n + ' 型番'; },
      showing: function (parts, rows) { return '先頭 ' + parts + ' 型番、' + rows + ' 件のデートコードを表示'; },
      rows: function (rows) { return 'デートコード ' + rows + ' 件'; },
      queried: function (time) { return time + ' 検索'; },
      scrollHint: function (rows) { return 'デートコード ' + rows + ' 件。表は上下・左右にスクロールできます。見出しと型番列は固定です。'; },
      regionLabel: 'Rochester の検索結果。横にスクロールできます',
      caption: function (n) { return 'Rochester 在庫検索の結果、デートコード ' + n + ' 件'; },
      noneTitle: function (q) { return '「' + q + '」の在庫データはありません'; },
      noneBody: 'Rochester は在庫がある、または製造実績のある型番だけを返します。より短い前方一致（たとえば LM358DR を LM358 にする）を試すか、型番を送ってください。営業が代替品と製造中止前の最終ロットを調べます。',
      askUs: '代わりに調べてもらう',
      rocelec: 'rocelec.com で検索 ↗',
      mailSubject: function (q) { return 'Rochester 調査依頼：' + q; },
      failed: '検索が完了しませんでした。しばらくしてから再度お試しください。',
      errorTitle: 'メーカー側の検索サービスが応答していません',
      errorBody: 'ネットワークが切れているか、Rochester 側が混み合っている可能性があります。もう一度試すか、型番を送ってください。営業が在庫と納期を確認します。',
      retry: 'もう一度試す',
      emailUs: '型番をメールする'
    }
  };

  function L() {
    return UI[localeKey()] || UI['zh-Hant'];
  }

  /* ---------- custom price rate (ported from the live page) ---------- */

  function reversePencertile(percent) {
    return (100 - percent) / 100;
  }

  function fixed(value, digits) {
    return Number(value.toFixed(digits));
  }

  function lessThan1(price) {
    return {
      '1_24': fixed(price / reversePencertile(55), 4),
      '25_99': fixed(price / reversePencertile(50), 4),
      '100_499': fixed(price / reversePencertile(43), 4),
      '500_999': fixed(price / reversePencertile(36.13), 4),
      '1000_9999': fixed(price / reversePencertile(30.32), 4),
      '10000_99999': fixed(price / reversePencertile(21.36), 4),
      'over_100000': null
    };
  }

  function between100and1(price) {
    return {
      '1_24': fixed(price / reversePencertile(30), 2),
      '25_99': fixed(price / reversePencertile(25.24), 2),
      '100_499': fixed(price / reversePencertile(21.17), 2),
      '500_999': fixed(price / reversePencertile(16.26), 2),
      '1000_9999': fixed(price / reversePencertile(11.19), 2),
      'over_10000': null
    };
  }

  function over100(price) {
    return {
      '1_24': fixed(price / reversePencertile(17), 2),
      '25_99': fixed(price / reversePencertile(14.28), 2),
      '100_499': fixed(price / reversePencertile(11.38), 2),
      '500_999': fixed(price / reversePencertile(8.3), 2),
      'over_1000': null
    };
  }

  function lessThan1_REI(price) {
    return {
      '1_24': fixed(price / reversePencertile(50), 4),
      '25_99': fixed(price / reversePencertile(45), 4),
      '100_499': fixed(price / reversePencertile(38), 4),
      '500_999': fixed(price / reversePencertile(31.13), 4),
      '1000_9999': fixed(price / reversePencertile(25.32), 4),
      '10000_99999': fixed(price / reversePencertile(16.36), 4),
      'over_100000': null
    };
  }

  function between100and1_REI(price) {
    return {
      '1_24': fixed(price / reversePencertile(25), 2),
      '25_99': fixed(price / reversePencertile(20.24), 2),
      '100_499': fixed(price / reversePencertile(16.17), 2),
      '500_999': fixed(price / reversePencertile(11.26), 2),
      '1000_9999': fixed(price / reversePencertile(6.19), 2),
      'over_10000': null
    };
  }

  function over100_REI(price) {
    return {
      '1_24': fixed(price / reversePencertile(12), 2),
      '25_99': fixed(price / reversePencertile(9.28), 2),
      '100_499': fixed(price / reversePencertile(6.38), 2),
      '500_999': fixed(price / reversePencertile(3.3), 2),
      'over_1000': null
    };
  }

  function classifyPriceRate(price, mfrCode) {
    var isREI = String(mfrCode == null ? '' : mfrCode).trim().toUpperCase() === 'REI';

    if (isREI) {
      if (price > 100) return over100_REI(price);
      if (price > 1) return between100and1_REI(price);
      return lessThan1_REI(price);
    }
    if (price > 100) return over100(price);
    if (price > 1) return between100and1(price);
    return lessThan1(price);
  }

  /* ---------- DOM helpers ---------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function stamp() {
    return new Date().toLocaleTimeString(L().timeLocale, { hour12: false });
  }

  function fmt(n) {
    return new Intl.NumberFormat('en-US').format(n);
  }

  /* ---------- fetch + flatten, exactly like the source ---------- */

  function buildRows(parts) {
    var rows = [];

    (parts || []).forEach(function (part, index) {
      var price = Number(part.sales_manager_price);
      var rate = isFinite(price) ? classifyPriceRate(price, part.manufacturer_code) : {};
      var base = {
        index: index,
        partNumber: part.part_number || '',
        eccn: part.eccn || '',
        rohs: part.rohs_available == null ? '' : String(part.rohs_available),
        mfr: part.manufacturer_code || '',
        pb: part.pb_free_available == null ? '' : String(part.pb_free_available),
        totalQty: part.total_qty == null ? '' : part.total_qty,
        rate: rate,
        notes: part.notes || ''
      };

      (Array.isArray(part.date_codes) ? part.date_codes : []).forEach(function (dc) {
        rows.push({
          index: base.index,
          partNumber: base.partNumber,
          eccn: base.eccn,
          rohs: base.rohs,
          mfr: base.mfr,
          pb: base.pb,
          totalQty: base.totalQty,
          rate: base.rate,
          dateCode: dc && dc.date_code != null ? String(dc.date_code).slice(0, 2) : '',
          notes: (dc && dc.notes) || base.notes,
          qty: dc && dc.qty != null ? dc.qty : ''
        });
      });
    });

    return rows;
  }

  function search(raw, reveal) {
    var q = String(raw || '').trim();
    pendingScroll = reveal || false;
    if (!q) {
      input.focus();
      setStatus([L().needQuery], 'error');
      return;
    }
    if (busy) return;

    if (input.value !== q) input.value = q;
    setBusy(true);
    setStatus([L().loading], 'loading');
    resultsEl.textContent = '';

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 15000);

    fetch(API + encodeURIComponent(q), controller ? { signal: controller.signal } : {})
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        try { render(q, data); } finally { setBusy(false); }
      }, function (err) {
        clearTimeout(timer);
        try { renderError(q, err); } finally { setBusy(false); }
      });
  }

  function revealResults() {
    if (!pendingScroll) return;
    var section = document.getElementById('lookup');
    if (!section) return;
    var behavior = pendingScroll === 'instant' ? 'auto' : 'smooth';
    section.scrollIntoView({ behavior: behavior, block: 'start' });
    pendingScroll = false;
  }

  function setStatus(items, kind) {
    statusEl.textContent = '';
    (Array.isArray(items) ? items : [items]).forEach(function (text) {
      if (text == null || text === '') return;
      statusEl.appendChild(el('span', 'rl-status__item', text));
    });
    statusEl.className = 'rl-status' + (kind ? ' rl-status--' + kind : '');
  }

  function setBusy(on) {
    busy = on;
    submit.disabled = on;
    resultsEl.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function render(q, data) {
    var rows = buildRows(data.parts);
    resultsEl.textContent = '';

    if (!rows.length) {
      renderNone(q);
      setStatus([L().matchZero, stamp()], '');
      return;
    }

    var partsCount = Object.keys(rows.reduce(function (map, row) {
      map[row.partNumber] = 1;
      return map;
    }, {})).length;
    var total = Number(data.total_count) || partsCount;

    var ui = L();
    var status = [ui.match(fmt(total))];
    if (total > partsCount) status.push(ui.showing(fmt(partsCount), fmt(rows.length)));
    else status.push(ui.rows(fmt(rows.length)));
    status.push(ui.queried(stamp()));
    setStatus(status, '');

    resultsEl.appendChild(el('p', 'rl-scrollhint', ui.scrollHint(fmt(rows.length))));
    resultsEl.appendChild(buildTable(rows));
    revealResults();
  }

  function buildTable(rows) {
    var wrap = el('div', 'rl-tablewrap');
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    var ui = L();
    wrap.setAttribute('aria-label', ui.regionLabel);

    var table = el('table', 'rl-table');
    table.appendChild(el('caption', 'sr-only', ui.caption(rows.length)));

    var thead = el('thead', '');
    var headRow = el('tr', '');
    ui.columns.forEach(function (label, i) {
      var th = el('th', '', label);
      th.scope = 'col';
      if (i >= 3 && i <= 9) th.className = 'is-price';
      if (i === 12 || i === 15) th.className += ' is-num';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody', '');
    rows.forEach(function (row, i) {
      var tr = el('tr', row.index % 2 ? 'is-alt' : '');
      tr.dataset.part = row.partNumber;

      tr.appendChild(el('td', 'rl-pn', row.partNumber));
      tr.appendChild(el('td', '', row.eccn));
      tr.appendChild(el('td', '', row.rohs));

      ['1_24', '25_99', '100_499', '500_999', '1000_9999', '10000_99999'].forEach(function (key) {
        var value = row.rate[key];
        tr.appendChild(el('td', 'is-price', value == null ? '' : String(value)));
      });

      var over = el('td', 'is-price rl-over');
      var link = el('a', '', L().contactUs);
      link.href = CONTACT;
      over.appendChild(link);
      tr.appendChild(over);

      tr.appendChild(el('td', 'rl-mfr', row.mfr));
      tr.appendChild(el('td', '', row.pb));
      tr.appendChild(el('td', 'is-num', row.totalQty === '' ? '' : String(row.totalQty)));
      tr.appendChild(el('td', 'is-num', row.dateCode));
      tr.appendChild(el('td', 'rl-notes', row.notes));
      tr.appendChild(el('td', 'is-num', row.qty === '' ? '' : String(row.qty)));

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderNone(q) {
    var box = el('div', 'rl-none');
    var ui = L();
    box.appendChild(el('h3', '', ui.noneTitle(q)));
    box.appendChild(el('p', '', ui.noneBody));

    var acts = el('div', 'rl-none__acts');
    var retry = el('a', 'rl-btn rl-btn--solid', ui.askUs);
    retry.href = 'mailto:service@longtrump.com.tw?subject=' + encodeURIComponent(ui.mailSubject(q));
    acts.appendChild(retry);
    var rocelec = el('a', 'rl-btn', ui.rocelec);
    rocelec.href = 'https://www.rocelec.com/';
    rocelec.target = '_blank';
    rocelec.rel = 'noopener';
    acts.appendChild(rocelec);
    box.appendChild(acts);

    resultsEl.appendChild(box);
    revealResults();
  }

  function renderError(q, err) {
    if (window.console && console.warn) console.warn('Rochester lookup failed:', err);
    var ui = L();
    setStatus([ui.failed], 'error');

    var box = el('div', 'rl-none');
    box.appendChild(el('h3', '', ui.errorTitle));
    box.appendChild(el('p', '', ui.errorBody));

    var acts = el('div', 'rl-none__acts');
    var retry = el('button', 'rl-btn', ui.retry);
    retry.type = 'button';
    retry.addEventListener('click', function () { search(q); });
    acts.appendChild(retry);
    var mail = el('a', 'rl-btn rl-btn--solid', ui.emailUs);
    mail.href = 'mailto:service@longtrump.com.tw?subject=' + encodeURIComponent(ui.mailSubject(q));
    acts.appendChild(mail);
    box.appendChild(acts);

    resultsEl.appendChild(box);
    revealResults();
  }

  /* ---------- wiring ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    search(input.value, true);
  });

  input.addEventListener('search', function () {
    if (!input.value) {
      resultsEl.innerHTML = initialResults;
      setStatus([], '');
    }
  });

  Array.prototype.forEach.call(document.querySelectorAll('.rl-chip[data-q]'), function (chip) {
    chip.addEventListener('click', function () {
      input.value = chip.getAttribute('data-q');
      search(input.value, true);
    });
  });

  var m = /[?&]q=([^&]+)/.exec(window.location.search);
  if (m) {
    var seed = decodeURIComponent(m[1].replace(/\+/g, ' '));
    if (seed.trim()) {
      input.value = seed.trim();
      search(seed, 'instant');
    }
  }
})();
