// Resizable demo frame in the hero
(() => {
  const frame = document.getElementById('frame');
  const handle = document.getElementById('handle');
  const stage = frame.parentElement;
  const pxOut = document.getElementById('px');
  const deviceOut = document.getElementById('device');
  const title = document.querySelector('.hero-title');
  const MIN = 280;

  const maxWidth = () => Math.max(MIN, stage.clientWidth);
  let width = maxWidth();

  function label(w) {
    if (w <= 400) return 'phone layout';
    if (w <= 560) return 'tablet layout';
    return 'desktop layout';
  }

  function apply(w) {
    const max = maxWidth();
    width = Math.round(Math.min(max, Math.max(MIN, w)));
    frame.style.setProperty('--w', width + 'px');
    pxOut.textContent = width;
    deviceOut.textContent = label(width);
    handle.setAttribute('aria-valuemax', max);
    handle.setAttribute('aria-valuenow', width);
    handle.setAttribute('aria-valuetext', `${width} pixels wide, ${label(width)}`);
    // The headline narrows its letterforms as the frame narrows
    const t = (width - MIN) / Math.max(1, max - MIN);
    title.style.setProperty('--hero-wdth', (75 + 25 * t).toFixed(1));
  }

  let dragging = false;
  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    apply(e.clientX - frame.getBoundingClientRect().left);
  });
  const stop = () => { dragging = false; };
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);

  handle.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 80 : 20;
    const keys = {
      ArrowLeft: width - step, ArrowDown: width - step,
      ArrowRight: width + step, ArrowUp: width + step,
      Home: MIN, End: maxWidth(),
    };
    if (e.key in keys) { e.preventDefault(); apply(keys[e.key]); }
  });

  // Keep within bounds on window resize; stay at full width if it was full
  let wasFull = true;
  window.addEventListener('resize', () => {
    apply(wasFull ? maxWidth() : width);
  });
  handle.addEventListener('pointerup', () => { wasFull = width >= maxWidth() - 2; });
  handle.addEventListener('keyup', () => { wasFull = width >= maxWidth() - 2; });

  apply(width);
})();

// Expandable project rows
document.querySelectorAll('.project-row').forEach((btn) => {
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    document.getElementById(btn.getAttribute('aria-controls')).hidden = open;
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
