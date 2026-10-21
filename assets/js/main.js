/* LTG — interaction layer
   Kept intentionally small: header state, mobile nav, scroll reveal.
   Everything degrades gracefully without JS. */

(function () {
  'use strict';

  /* ---------- Scroll reveal ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  function showAll() {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* elements already above the fold (or reached by scrolling) must never stay hidden */
  function sweep() {
    var h = window.innerHeight;
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < h * 0.94 && r.bottom > 0) el.classList.add('is-visible');
    });
  }

  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showAll();
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: [0, 0.1] });

    reveals.forEach(function (el) { observer.observe(el); });
    window.addEventListener('load', sweep);
    window.addEventListener('resize', sweep);
    setTimeout(sweep, 1200);
  }

  /* ---------- Header: solid after threshold ---------- */
  var header = document.getElementById('header');
  var lastSolid = null;

  function syncHeader() {
    if (!header) return;
    var solid = window.scrollY > 24;
    if (solid !== lastSolid) {
      header.classList.toggle('is-solid', solid);
      lastSolid = solid;
    }
  }

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  function closeNav() {
    if (!header) return;
    header.classList.remove('nav-open');
    document.body.classList.remove('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && header) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('nav-open');
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單');
    });

    if (nav) {
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) closeNav();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* ---------- Contact form (demo handler) ---------- */
  var form = document.querySelector('form[data-demo]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('[data-form-note]');
      if (note) {
        note.textContent = '已收到您的需求（示範表單）。正式上線時請接上表單服務或寄送至業務信箱。';
        note.style.color = 'var(--accent)';
      }
    });
  }

  /* ---------- Scroll listeners ---------- */
  var ticking = false;
  var lastSweep = 0;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      syncHeader();
      // cheap safety net: anything we scrolled past while IO was busy
      var now = Date.now();
      if (now - lastSweep > 220) { lastSweep = now; sweep(); }
      ticking = false;
    });
  }, { passive: true });

  syncHeader();
})();
