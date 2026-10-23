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

  /* Fixed output columns — matches the source page one for one. */
  var COLUMNS = [
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
    return new Date().toLocaleTimeString('zh-TW', { hour12: false });
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
      setStatus(['請先輸入料號，例如 LM358'], 'error');
      return;
    }
    if (busy) return;

    if (input.value !== q) input.value = q;
    setBusy(true);
    setStatus(['正在查詢 Rochester 授權庫存…'], 'loading');
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
      setStatus(['符合 0 個料號', stamp()], '');
      return;
    }

    var partsCount = Object.keys(rows.reduce(function (map, row) {
      map[row.partNumber] = 1;
      return map;
    }, {})).length;
    var total = Number(data.total_count) || partsCount;

    var status = ['符合 ' + fmt(total) + ' 個料號'];
    if (total > partsCount) status.push('顯示前 ' + fmt(partsCount) + ' 個、' + fmt(rows.length) + ' 筆批號');
    else status.push('共 ' + fmt(rows.length) + ' 筆批號');
    status.push(stamp() + ' 查詢');
    setStatus(status, '');

    resultsEl.appendChild(el('p', 'rl-scrollhint', '共 ' + fmt(rows.length) + ' 筆批號；表格可上下、左右捲動，表頭與料號欄固定'));
    resultsEl.appendChild(buildTable(rows));
    revealResults();
  }

  function buildTable(rows) {
    var wrap = el('div', 'rl-tablewrap');
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Rochester 查詢結果，可橫向捲動');

    var table = el('table', 'rl-table');
    table.appendChild(el('caption', 'sr-only', 'Rochester 現貨查詢結果，共 ' + rows.length + ' 筆批號'));

    var thead = el('thead', '');
    var headRow = el('tr', '');
    COLUMNS.forEach(function (label, i) {
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
      var link = el('a', '', 'Contact Us');
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
    box.appendChild(el('h3', '', '查無「' + q + '」的現貨資料'));
    box.appendChild(el('p', '', 'Rochester 只列出有庫存或曾生產的料號。試試更短的前綴（例如把 LM358DR 縮成 LM358），或直接把型號寄給我們，由業務代查替代料與停產前最後一批。'));

    var acts = el('div', 'rl-none__acts');
    var retry = el('a', 'rl-btn rl-btn--solid', '請我們代查');
    retry.href = 'mailto:service@longtrump.com.tw?subject=' + encodeURIComponent('Rochester 代查料號：' + q);
    acts.appendChild(retry);
    var rocelec = el('a', 'rl-btn', '到 rocelec.com 查詢 ↗');
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
    setStatus(['查詢沒有完成，請稍後再試'], 'error');

    var box = el('div', 'rl-none');
    box.appendChild(el('h3', '', '原廠查詢服務暫時沒有回應'));
    box.appendChild(el('p', '', '可能是網路中斷，或 Rochester 端正在忙碌。你可以重試一次，或直接把料號寄給我們，由業務代查庫存與交期。'));

    var acts = el('div', 'rl-none__acts');
    var retry = el('button', 'rl-btn', '再試一次');
    retry.type = 'button';
    retry.addEventListener('click', function () { search(q); });
    acts.appendChild(retry);
    var mail = el('a', 'rl-btn rl-btn--solid', '寄料號給我們');
    mail.href = 'mailto:service@longtrump.com.tw?subject=' + encodeURIComponent('Rochester 代查料號：' + q);
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
