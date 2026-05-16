/* ============================================================
   AION-FS  —  main.js
   Cognitive Substrate Architecture · GitHub Pages site
   Vanilla JS, no dependencies.
   ============================================================ */

'use strict';

/* ── 1. HERO CANVAS ──────────────────────────────────────────
   Animated node graph — floating primitives in space.
   ─────────────────────────────────────────────────────────── */

class GraphNode {
  constructor({ x, y, r, label, isPrimitive, color }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.label = label ?? null;
    this.isPrimitive = isPrimitive ?? false;
    this.color = color;

    const speed = isPrimitive ? 0.25 : 0.35;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed * (0.5 + Math.random() * 0.5);
    this.vy = Math.sin(angle) * speed * (0.5 + Math.random() * 0.5);
  }

  update(w, h, mouseX, mouseY) {
    const pad = this.r + 4;

    // Mouse attraction — gentle pull toward cursor
    if (mouseX !== null && mouseY !== null) {
      const dx = mouseX - this.x;
      const dy = mouseY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist > 0) {
        const force = 0.01;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }
    }

    // Speed cap — prevents runaway after attraction
    const maxSpeed = this.isPrimitive ? 0.5 : 0.7;
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > maxSpeed) {
      this.vx = (this.vx / currentSpeed) * maxSpeed;
      this.vy = (this.vy / currentSpeed) * maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    // Bounce off walls
    if (this.x < pad) {
      this.x = pad;
      this.vx = Math.abs(this.vx);
    } else if (this.x > w - pad) {
      this.x = w - pad;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y < pad) {
      this.y = pad;
      this.vy = Math.abs(this.vy);
    } else if (this.y > h - pad) {
      this.y = h - pad;
      this.vy = -Math.abs(this.vy);
    }
  }
}

class GraphCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = [];
    this.mouseX = null;
    this.mouseY = null;
    this.animId = null;
    this.dpr = window.devicePixelRatio || 1;

    this._buildNodes();
    this._bindEvents();
    this.resize();
    this.animate();
  }

  _buildNodes() {
    // We place primitive nodes relative to the canvas dimensions.
    // Use placeholder fractions; actual pixel positions set in resize().
    const primitivesDef = [
      { label: 'FILE',     fx: 0.50, fy: 0.18 },
      { label: 'LINK',     fx: 0.18, fy: 0.42 },
      { label: 'CONTEXT',  fx: 0.80, fy: 0.38 },
      { label: 'JOURNAL',  fx: 0.28, fy: 0.72 },
      { label: 'SNAPSHOT', fx: 0.68, fy: 0.75 },
    ];

    // We'll set actual x/y in resize(); store fractions for re-layout.
    this._primitiveDefs = primitivesDef;

    primitivesDef.forEach(def => {
      this.nodes.push(new GraphNode({
        x: 0, y: 0,         // set in resize()
        r: 18,
        label: def.label,
        isPrimitive: true,
        color: '#c47a3a',
      }));
    });

    // 13 generic nodes
    const copperHex = '#c47a3a';
    const blueHex   = '#3a5090';

    for (let i = 0; i < 13; i++) {
      const isCopper = i % 2 === 0;
      this.nodes.push(new GraphNode({
        x: 0, y: 0,         // set in resize()
        r: 5 + Math.random() * 7,
        label: null,
        isPrimitive: false,
        color: isCopper ? copperHex : blueHex,
        _isCopper: isCopper,
      }));
      // tag for later lookup
      this.nodes[this.nodes.length - 1]._isCopper = isCopper;
    }
  }

  _bindEvents() {
    // Mouse tracking on the canvas parent element (the section)
    const parent = this.canvas.parentElement;
    parent.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * this.dpr;
      this.mouseY = (e.clientY - rect.top)  * this.dpr;
    }, { passive: true });

    parent.addEventListener('mouseleave', () => {
      this.mouseX = null;
      this.mouseY = null;
    }, { passive: true });

    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.offsetWidth;
    const h = parent.offsetHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width  = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this._w = w;
    this._h = h;

    // Place primitive nodes at their fractional positions on first resize,
    // and whenever the canvas resizes (so they remain well-distributed).
    this._primitiveDefs.forEach((def, i) => {
      const node = this.nodes[i];
      node.x = def.fx * w;
      node.y = def.fy * h;
    });

    // Scatter generic nodes if they're still at origin
    for (let i = 5; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      if (node.x === 0 && node.y === 0) {
        const margin = 40;
        node.x = margin + Math.random() * (w - margin * 2);
        node.y = margin + Math.random() * (h - margin * 2);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this._w;
    const h = this._h;

    ctx.clearRect(0, 0, w, h);

    // ── Edges ──
    ctx.lineWidth = 0.8;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const alpha = (1 - dist / 140) * 0.3;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(196, 122, 58, ${alpha.toFixed(3)})`;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // ── Nodes ──
    for (const node of this.nodes) {
      ctx.beginPath();

      if (node.isPrimitive) {
        ctx.shadowColor = '#c47a3a66';
        ctx.shadowBlur  = 14;
        ctx.fillStyle   = 'rgba(196, 122, 58, 0.85)';
      } else if (node._isCopper) {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = 'rgba(196, 122, 58, 0.55)';
      } else {
        ctx.shadowBlur = 0;
        ctx.fillStyle  = 'rgba(58, 80, 144, 0.70)';
      }

      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label for primitives
      if (node.label) {
        ctx.font         = '600 6px Archivo, system-ui, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#1a2235';
        ctx.fillText(node.label, node.x, node.y);
      }
    }
  }

  animate() {
    if (document.hidden) {
      this.animId = requestAnimationFrame(() => this.animate());
      return;
    }

    for (const node of this.nodes) {
      node.update(this._w, this._h, this.mouseX, this.mouseY);
    }
    this.draw();

    this.animId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
}

/* ── 2. SCROLL ANIMATIONS ────────────────────────────────────
   IntersectionObserver — add 'in' class once when entering viewport.
   ─────────────────────────────────────────────────────────── */

function initScrollAnimations() {
  const targets = document.querySelectorAll('[data-anim]');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target); // once revealed, stays revealed
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  targets.forEach(el => observer.observe(el));
}

/* ── 3. COUNTER ANIMATION ────────────────────────────────────
   Animate [data-count] elements when they enter viewport.
   ─────────────────────────────────────────────────────────── */

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animateCounter(el, target, duration) {
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(easeOutCubic(progress) * target);
    el.textContent = value.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          if (!isNaN(target)) {
            animateCounter(el, target, 1400);
          }
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.3 }
  );

  counters.forEach(el => observer.observe(el));
}

/* ── 4. NAVIGATION ───────────────────────────────────────────
   Scroll: .scrolled class + active link detection.
   Mobile: hamburger toggle.
   ─────────────────────────────────────────────────────────── */

function initNav() {
  const nav      = document.querySelector('.nav');
  const links    = document.querySelectorAll('.nav-links a[href^="#"]');
  const navLinks = document.querySelector('.nav-links');
  const toggle   = document.querySelector('.nav-toggle');

  if (!nav) return;

  // ── Scroll state ──
  function onScroll() {
    // .scrolled class
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    // Active section detection
    const scrollMid = window.scrollY + window.innerHeight * 0.4;
    let active = null;

    links.forEach(link => {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (!section) return;

      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;

      if (scrollMid >= top && scrollMid < bottom) {
        active = link;
      }
    });

    links.forEach(link => link.classList.remove('active'));
    if (active) active.classList.add('active');
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on init

  // ── Mobile toggle ──
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    // Close menu on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        navLinks.classList.remove('open');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}

/* ── 5. HERO ENTRANCE ────────────────────────────────────────
   Add 'ready' to body after 100ms — CSS handles the keyframe
   animations on .hero-eye, .hero-title, .hero-tagline.
   ─────────────────────────────────────────────────────────── */

function initHeroEntrance() {
  setTimeout(() => {
    document.body.classList.add('ready');
  }, 100);
}

/* ── 6. SMOOTH ANCHOR SCROLL ─────────────────────────────────
   Intercept all href="#..." links and scroll with offset for nav.
   ─────────────────────────────────────────────────────────── */

function initSmoothScroll() {
  const NAV_HEIGHT = 60;

  document.addEventListener('click', e => {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (href === '#') return;

    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* ── INIT ─────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Hero canvas
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas) {
    new GraphCanvas(heroCanvas);
  }

  // Scroll-driven animations
  initScrollAnimations();

  // Navigation
  initNav();

  // Counter animations
  initCounters();

  // Smooth scroll
  initSmoothScroll();

  // Hero entrance (CSS keyframes triggered by body.ready)
  initHeroEntrance();
});
