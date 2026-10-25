(function () {
  'use strict';

  // Selector de tema claro / oscuro
  var tg = document.getElementById('theme-toggle');
  if (tg) {
    tg.addEventListener('click', function () {
      var root = document.documentElement;
      var next = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-bs-theme', next);
      try { localStorage.setItem('ci_theme', next); } catch (e) {}
    });
  }

  // Contador de caracteres en campos de texto largo
  document.querySelectorAll('textarea[maxlength]').forEach(function (t) {
    var c = document.createElement('div');
    c.className = 'form-text text-end';
    c.setAttribute('aria-hidden', 'true');
    t.insertAdjacentElement('afterend', c);
    function update() {
      var max = +t.maxLength, n = t.value.length;
      c.textContent = n + ' / ' + max;
      c.classList.toggle('text-danger', n > max * 0.9);
    }
    t.addEventListener('input', update);
    if (t.form) t.form.addEventListener('reset', function () { setTimeout(update, 0); });
    update();
  });

  // Llevar el mensaje de confirmación a la vista cuando aparece
  var fb = document.getElementById('feedback');
  if (fb) {
    new MutationObserver(function () {
      if (fb.textContent.trim()) fb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).observe(fb, { childList: true });
  }

  // Selector de campus del mapa
  var sel = document.getElementById('campus');
  if (sel) {
    var frame = document.getElementById('gmap');
    var link = document.getElementById('gmap-link');
    sel.addEventListener('change', function () {
      var q = encodeURIComponent(sel.value);
      frame.src = 'https://www.google.com/maps?q=' + q + '&output=embed&hl=es';
      link.href = 'https://www.google.com/maps/search/?api=1&query=' + q;
    });
  }
})();
