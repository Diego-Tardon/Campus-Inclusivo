(function () {
  'use strict';

  var KEY = 'ci_reportes_v1';
  var ESTADOS = ['En revisión', 'En proceso', 'Resuelto'];
  var BADGE = {
    'En revisión': 'bg-primary-subtle text-primary-emphasis',
    'En proceso': 'bg-warning-subtle text-warning-emphasis',
    'Resuelto': 'bg-success-subtle text-success-emphasis'
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- Almacenamiento local (versión de demostración) ----------
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }

  // Código legible, sin caracteres ambiguos (0/O, 1/I)
  function genCode(existing) {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var code;
    do {
      var b = new Uint8Array(6);
      crypto.getRandomValues(b);
      code = 'CI-';
      for (var i = 0; i < 6; i++) code += alphabet[b[i] % alphabet.length];
    } while (existing.some(function (r) { return r.codigo === code; }));
    return code;
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function badge(estado) {
    return el('span', 'badge rounded-pill ' + (BADGE[estado] || BADGE[ESTADOS[0]]), estado);
  }

  // ---------- Validación de formularios ----------
  function validate(form) {
    var first = null;
    Array.prototype.forEach.call(form.elements, function (f) {
      if (!f.willValidate || f.type === 'submit' || f.type === 'button') return;
      if (typeof f.value === 'string' && f.tagName !== 'SELECT') f.value = f.value.trim();
      var ok = f.checkValidity();
      f.classList.toggle('is-invalid', !ok);
      if (!ok && !first) first = f;
    });
    if (first) first.focus();
    return !first;
  }
  function liveValidation(form) {
    function clear(e) {
      var f = e.target;
      if (f.classList && f.classList.contains('is-invalid') && f.checkValidity()) f.classList.remove('is-invalid');
    }
    form.addEventListener('input', clear);
    form.addEventListener('change', clear);
  }
  function clearInvalid(form) {
    Array.prototype.forEach.call(form.elements, function (f) { f.classList && f.classList.remove('is-invalid'); });
  }

  function notify(kind, parts) {
    var fb = $('feedback');
    if (!fb) return;
    fb.textContent = '';
    var a = el('div', 'alert alert-' + kind + ' mt-3 mb-0');
    parts.forEach(function (p) { a.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    fb.appendChild(a);
  }

  // ---------- Reportar barrera ----------
  function renderMyReports() {
    var box = $('reportes');
    if (!box) return;
    var list = load().slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    box.textContent = '';
    if (!list.length) {
      box.appendChild(el('div', 'empty', 'Aún no hay reportes registrados en este navegador.'));
      return;
    }
    list.forEach(function (r) {
      var e = el('div', 'entry');
      var head = el('div', 'd-flex flex-wrap align-items-center gap-2');
      head.appendChild(el('strong', null, r.tipo));
      head.appendChild(badge(r.estado));
      e.appendChild(head);
      e.appendChild(el('p', null, r.descripcion));
      var small = el('small', 'text-secondary', r.ubicacion + ' · ' + fmtDate(r.fecha) + ' · Código ');
      var link = el('a', null, r.codigo);
      link.href = 'seguimiento.html?codigo=' + encodeURIComponent(r.codigo);
      small.appendChild(link);
      e.appendChild(small);
      box.appendChild(e);
    });
  }

  var reportForm = $('report-form');
  if (reportForm) {
    liveValidation(reportForm);
    reportForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!validate(reportForm)) return;
      var f = reportForm.elements;
      var list = load();
      var r = {
        codigo: genCode(list),
        fecha: new Date().toISOString(),
        nombre: f.nombre.value.trim(),
        tipo: f.tipo.value,
        ubicacion: f.ubicacion.value.trim(),
        descripcion: f.descripcion.value.trim(),
        estado: ESTADOS[0]
      };
      list.push(r);
      if (!save(list)) {
        notify('danger', ['No fue posible guardar el reporte en este navegador. Verifique que el almacenamiento local no esté bloqueado.']);
        return;
      }
      reportForm.reset();
      clearInvalid(reportForm);
      reportForm.dispatchEvent(new Event('reset'));
      var link = el('a', 'alert-link', 'Ver seguimiento');
      link.href = 'seguimiento.html?codigo=' + encodeURIComponent(r.codigo);
      notify('success', [
        'Reporte registrado correctamente. Su código de seguimiento es ',
        el('strong', null, r.codigo),
        '. Consérvelo para consultar el estado. ',
        link
      ]);
      renderMyReports();
    });
    renderMyReports();
  }

  // ---------- Solicitud a voluntariado (demostración, no se almacena) ----------
  var contactForm = $('contact-form');
  if (contactForm) {
    liveValidation(contactForm);
    contactForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!validate(contactForm)) return;
      contactForm.reset();
      clearInvalid(contactForm);
      contactForm.dispatchEvent(new Event('reset'));
      notify('success', ['Solicitud registrada en esta versión de demostración. No fue enviada a ninguna persona.']);
    });
  }

  // ---------- Panel de administración ----------
  var adminBox = $('admin-reports');
  function renderAdmin() {
    var list = load();
    var counts = { total: list.length, revision: 0, proceso: 0, resuelto: 0 };
    list.forEach(function (r) {
      if (r.estado === 'En revisión') counts.revision++;
      else if (r.estado === 'En proceso') counts.proceso++;
      else if (r.estado === 'Resuelto') counts.resuelto++;
    });
    Object.keys(counts).forEach(function (k) { if ($(k)) $(k).textContent = counts[k]; });

    var filter = $('admin-filter').value;
    var shown = list.filter(function (r) { return filter === 'Todos' || r.estado === filter; })
      .sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    adminBox.textContent = '';
    if (!shown.length) {
      var empty = el('div', 'empty mt-3', 'No hay reportes que coincidan con el filtro seleccionado.');
      adminBox.appendChild(empty);
      return;
    }
    shown.forEach(function (r) {
      var row = el('div', 'report-row');
      var info = el('div');
      info.appendChild(el('strong', null, r.codigo + ' · ' + r.tipo));
      info.appendChild(el('div', 'text-secondary', r.ubicacion + ' — ' + r.descripcion));
      info.appendChild(el('small', 'text-secondary', fmtDate(r.fecha) + ' · ' + r.nombre));
      var sel = el('select', 'form-select');
      sel.setAttribute('aria-label', 'Estado del reporte ' + r.codigo);
      ESTADOS.forEach(function (s) {
        var o = el('option', null, s);
        if (s === r.estado) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var all = load();
        for (var i = 0; i < all.length; i++) {
          if (all[i].codigo === r.codigo) { all[i].estado = sel.value; break; }
        }
        save(all);
        renderAdmin();
      });
      row.appendChild(info);
      row.appendChild(sel);
      adminBox.appendChild(row);
    });
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita inyección de fórmulas en hojas de cálculo
    return '"' + s.replace(/"/g, '""') + '"';
  }

  if (adminBox) {
    $('admin-filter').addEventListener('change', renderAdmin);
    $('export-btn').addEventListener('click', function () {
      var cols = ['codigo', 'fecha', 'nombre', 'tipo', 'ubicacion', 'descripcion', 'estado'];
      var rows = [cols.join(',')].concat(load().map(function (r) {
        return cols.map(function (c) { return csvCell(r[c]); }).join(',');
      }));
      var blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'reportes-campus-inclusivo.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    renderAdmin();
  }

  // ---------- Seguimiento ----------
  var trackForm = $('track-form');
  if (trackForm) {
    var out = $('resultado');
    liveValidation(trackForm);

    function showResult(code) {
      out.textContent = '';
      code = code.trim().toUpperCase();
      var r = load().filter(function (x) { return x.codigo === code; })[0];
      if (!r) {
        var nf = el('div', 'alert alert-warning mb-0');
        nf.appendChild(el('strong', null, 'No se encontró el código ingresado. '));
        nf.appendChild(document.createTextNode('Verifique el formato (por ejemplo, CI-AB12CD). En esta versión de demostración solo pueden consultarse reportes creados desde este mismo navegador.'));
        out.appendChild(nf);
        return;
      }
      var card = el('div', 'entry');
      var head = el('div', 'd-flex flex-wrap align-items-center gap-2');
      head.appendChild(el('h3', 'h5 mb-0', r.codigo));
      head.appendChild(badge(r.estado));
      card.appendChild(head);
      card.appendChild(el('p', 'mb-1', r.tipo + ' · ' + r.ubicacion));
      card.appendChild(el('small', 'text-secondary', 'Registrado el ' + fmtDate(r.fecha)));
      var step = ESTADOS.indexOf(r.estado);
      var ol = el('ol', 'timeline');
      ESTADOS.forEach(function (s, i) {
        var li = el('li', i < step ? 'done' : i === step ? 'current' : '', s);
        if (i === step) li.setAttribute('aria-current', 'step');
        ol.appendChild(li);
      });
      card.appendChild(ol);
      out.appendChild(card);
    }

    trackForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!validate(trackForm)) { out.textContent = ''; return; }
      showResult($('codigo').value);
    });
    var q = new URLSearchParams(location.search).get('codigo');
    if (q) { $('codigo').value = q; if (validate(trackForm)) showResult(q); }
  }
})();
