(function () {
  'use strict';

  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function updateThemeColor() {
    if (themeColor) {
      themeColor.content = root.dataset.theme === 'dark' ? '#0c1520' : '#f3f7fa';
    }
  }

  function toggleTheme() {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('yusu-theme', next);
    } catch (error) {
      // Theme persistence is optional when storage is unavailable.
    }
    updateThemeColor();
    window.dispatchEvent(new CustomEvent('homepage-theme-change'));
  }

  updateThemeColor();
  themeToggle?.addEventListener('click', toggleTheme);

  function closeMenu() {
    navLinks?.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    document.body.classList.remove('menu-open');
  }

  menuToggle?.addEventListener('click', function () {
    const isOpen = navLinks?.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    document.body.classList.toggle('menu-open', Boolean(isOpen));
  });

  navLinks?.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  const sections = Array.from(document.querySelectorAll('main section[id]'));
  const sectionLinks = Array.from(document.querySelectorAll('.nav-links a'));

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(function (element) {
      revealObserver.observe(element);
    });

    const sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(function (link) {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-24% 0px -66% 0px', threshold: 0 });

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  } else {
    document.querySelectorAll('.reveal').forEach(function (element) {
      element.classList.add('is-visible');
    });
  }

  if (reduceMotion) return;

  const canvas = document.getElementById('motion-canvas');
  const context = canvas?.getContext('2d');
  if (!canvas || !context) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let frame = 0;
  let rafId = 0;
  let trails = [];
  let points = [];

  function palette() {
    return root.dataset.theme === 'dark'
      ? { primary: '255, 114, 129', secondary: '109, 208, 207', line: '203, 225, 235' }
      : { primary: '196, 18, 48', secondary: '21, 125, 133', line: '77, 111, 132' };
  }

  function seed() {
    trails = Array.from({ length: Math.max(4, Math.round(width / 300)) }, function (_, index) {
      return {
        y: height * (0.13 + index * 0.18 + Math.random() * 0.05),
        amplitude: 34 + Math.random() * 70,
        frequency: 0.0017 + Math.random() * 0.0016,
        speed: 0.002 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2,
        primary: index % 2 === 0
      };
    });

    points = Array.from({ length: Math.max(18, Math.round(width / 42)) }, function () {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.8 + Math.random() * 2.2,
        drift: 8 + Math.random() * 24,
        speed: 0.005 + Math.random() * 0.009,
        phase: Math.random() * Math.PI * 2,
        primary: Math.random() > 0.48
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function drawTrail(trail, index, colors) {
    const alpha = root.dataset.theme === 'dark' ? 0.11 : 0.085;
    context.beginPath();
    for (let x = -20; x <= width + 20; x += 18) {
      const y = trail.y
        + Math.sin(x * trail.frequency + frame * trail.speed + trail.phase) * trail.amplitude
        + Math.cos(x * trail.frequency * 0.48 - frame * trail.speed * 0.7 + index) * trail.amplitude * 0.3;
      if (x === -20) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = 'rgba(' + (trail.primary ? colors.primary : colors.secondary) + ', ' + alpha + ')';
    context.lineWidth = 1;
    context.stroke();
  }

  function drawPoint(point, colors) {
    const y = point.y + Math.sin(frame * point.speed + point.phase) * point.drift;
    const x = point.x + Math.cos(frame * point.speed * 0.6 + point.phase) * point.drift * 0.45;
    const rgb = point.primary ? colors.primary : colors.secondary;
    const alpha = root.dataset.theme === 'dark' ? 0.36 : 0.23;

    context.beginPath();
    context.arc(x, y, point.radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(' + rgb + ', ' + alpha + ')';
    context.fill();

    if (point.radius > 2.1) {
      context.beginPath();
      context.arc(x, y, point.radius * 3.4, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(' + rgb + ', ' + alpha * 0.26 + ')';
      context.lineWidth = 1;
      context.stroke();
    }
  }

  function draw() {
    const colors = palette();
    context.clearRect(0, 0, width, height);
    trails.forEach(function (trail, index) { drawTrail(trail, index, colors); });
    points.forEach(function (point) { drawPoint(point, colors); });
    frame += 1;
    rafId = window.requestAnimationFrame(draw);
  }

  let resizeTimer;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
    } else {
      rafId = window.requestAnimationFrame(draw);
    }
  });

  resize();
  draw();
})();
