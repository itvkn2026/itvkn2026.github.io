// Kopīgais skripts visām studentu lapām.
// Studentu saraksts (const students) ir katras lapas index.html failā.

// ===================== SETTINGS =====================
const IDLE_TIMEOUT     = 10000;  // ms before screensaver starts

const USE_WOBBLE       = true;   // Option A: sine-wave drift, feels organic
const USE_VARIED_SPEED = true;   // Option B: each name moves at a different speed

const SNAP_EASE        = 0.08;   // how fast names ease back to grid (0.01 = very slow, 0.2 = fast)
// ====================================================

// Create one grid cell per student
const grid = document.getElementById('grid');
students.forEach(() => {
  const cell = document.createElement('div');
  cell.className = 'grid-cell';
  grid.appendChild(cell);
});

const cells = document.querySelectorAll('.grid-cell');
let idleTimer  = null;
let animFrame  = null;
let snapFrame  = null;
let isScreensaver = false;
let floaters   = [];
let tick       = 0;

function getResponsiveFontSize() {
  const w = window.innerWidth;
  if (w <= 500) return '18px';
  if (w <= 1100) return '30px';
  return '45px';
}

function updateFontSizes() {
  let size = parseFloat(getResponsiveFontSize());
  floaters.forEach(f => { f.el.style.fontSize = size + 'px'; });

  // If the longest name is wider than its cell, shrink all names evenly so they never overlap
  const cellW = cells[0].getBoundingClientRect().width - 16;
  const maxW  = Math.max(...floaters.map(f => f.el.offsetWidth));
  if (maxW > cellW) {
    size = Math.floor(size * cellW / maxW);
    floaters.forEach(f => { f.el.style.fontSize = size + 'px'; });
  }
}

function getCellCenters() {
  return Array.from(cells).map(cell => {
    const r = cell.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}

function buildFloaters() {
  const centers = getCellCenters();
  floaters = students.map((s, i) => {
    const el = document.createElement('a');
    el.textContent = s.name;
    el.href = s.url;
    el.target = '_blank';
    el.rel = 'noopener';
    el.className = 'float-name';

    const cx = centers[i].x;
    const cy = centers[i].y;
    el.style.left = cx + 'px';
    el.style.top  = cy + 'px';
    document.body.appendChild(el);

    const baseSpeed = USE_VARIED_SPEED
      ? 0.3 + Math.random() * 1.2
      : 0.7;

    const angle = Math.random() * Math.PI * 2;

    return {
      el,
      x: cx, y: cy,
      homeX: cx, homeY: cy,
      vx: Math.cos(angle) * baseSpeed,
      vy: Math.sin(angle) * baseSpeed,
      baseSpeed,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed:  0.01 + Math.random() * 0.01,
      wobbleAmp:    18 + Math.random() * 18,
      hue:      (i / students.length) * 360,
      hueSpeed: 0.3 + Math.random() * 0.4,
    };
  });
}

function resolveCollisions() {
  for (let i = 0; i < floaters.length; i++) {
    for (let j = i + 1; j < floaters.length; j++) {
      const a = floaters[i];
      const b = floaters[j];

      const aw = (a.el.offsetWidth  || 200) / 2;
      const ah = (a.el.offsetHeight || 30)  / 2;
      const bw = (b.el.offsetWidth  || 200) / 2;
      const bh = (b.el.offsetHeight || 30)  / 2;

      const overlapX = (aw + bw) - Math.abs(b.x - a.x);
      const overlapY = (ah + bh) - Math.abs(b.y - a.y);

      if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
          const sign = b.x > a.x ? 1 : -1;
          a.x -= sign * overlapX / 2;
          b.x += sign * overlapX / 2;
          const temp = a.vx; a.vx = b.vx; b.vx = temp;
        } else {
          const sign = b.y > a.y ? 1 : -1;
          a.y -= sign * overlapY / 2;
          b.y += sign * overlapY / 2;
          const temp = a.vy; a.vy = b.vy; b.vy = temp;
        }
      }
    }
  }
}

function animateFloaters() {
  tick++;
  floaters.forEach(f => {
    f.hue = (f.hue + f.hueSpeed) % 360;

    let moveX = f.vx;
    let moveY = f.vy;

    if (USE_WOBBLE) {
      const angle  = Math.atan2(f.vy, f.vx);
      const perp   = angle + Math.PI / 2;
      const wobble = Math.sin(tick * f.wobbleSpeed + f.wobbleOffset) * f.wobbleAmp * 0.02;
      moveX += Math.cos(perp) * wobble;
      moveY += Math.sin(perp) * wobble;
    }

    f.x += moveX;
    f.y += moveY;

    const hw = (f.el.offsetWidth  || 200) / 2;
    const hh = (f.el.offsetHeight || 30)  / 2;

    if (f.x - hw < 0)                 { f.x = hw;                      f.vx *= -1; }
    if (f.x + hw > window.innerWidth) { f.x = window.innerWidth - hw;  f.vx *= -1; }
    if (f.y - hh < 0)                 { f.y = hh;                      f.vy *= -1; }
    if (f.y + hh > window.innerHeight){ f.y = window.innerHeight - hh; f.vy *= -1; }

    f.el.style.left  = f.x + 'px';
    f.el.style.top   = f.y + 'px';
    f.el.style.color = `hsl(${f.hue}, 90%, 50%)`;
  });

  resolveCollisions();
  animFrame = requestAnimationFrame(animateFloaters);
}

function easeToGrid() {
  const centers = getCellCenters();
  let allHome = true;

  floaters.forEach((f, i) => {
    f.homeX = centers[i].x;
    f.homeY = centers[i].y;

    const dx = f.homeX - f.x;
    const dy = f.homeY - f.y;

    f.x += dx * SNAP_EASE;
    f.y += dy * SNAP_EASE;

    f.el.style.left  = f.x + 'px';
    f.el.style.top   = f.y + 'px';
    f.el.style.color = '';

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
      allHome = false;
    } else {
      f.x = f.homeX;
      f.y = f.homeY;
      f.el.style.left = f.homeX + 'px';
      f.el.style.top  = f.homeY + 'px';
    }
  });

  if (!allHome) {
    snapFrame = requestAnimationFrame(easeToGrid);
  }
}

function enterScreensaver() {
  if (isScreensaver) return;
  isScreensaver = true;
  cancelAnimationFrame(snapFrame);
  animateFloaters();
}

function exitScreensaver() {
  if (!isScreensaver) return;
  isScreensaver = false;
  cancelAnimationFrame(animFrame);
  easeToGrid();
}

function resetTimer() {
  clearTimeout(idleTimer);
  if (isScreensaver) exitScreensaver();
  idleTimer = setTimeout(enterScreensaver, IDLE_TIMEOUT);
}

document.addEventListener('mousemove', resetTimer);
document.addEventListener('touchstart', resetTimer);
document.addEventListener('keydown', resetTimer);
window.addEventListener('resize', () => {
  updateFontSizes();
  if (!isScreensaver) {
    const centers = getCellCenters();
    floaters.forEach((f, i) => {
      f.homeX = centers[i].x;
      f.homeY = centers[i].y;
      f.x = f.homeX;
      f.y = f.homeY;
      f.el.style.left = f.x + 'px';
      f.el.style.top  = f.y + 'px';
    });
  }
});

buildFloaters();
updateFontSizes();
document.fonts.ready.then(updateFontSizes);  // re-check once VT323 has loaded
idleTimer = setTimeout(enterScreensaver, IDLE_TIMEOUT);
