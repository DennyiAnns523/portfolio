// Loads the WebGL garden as a module; if it (or Three.js) fails to load, the flat canvas garden takes over.
// Building the garden blocks the page for a few seconds, so it waits until the visitor scrolls within a
// couple of screens of it (or the page has sat idle a while), keeping arrival smooth for everything else.
(function () {
  var started = false;
  function load() {
    if (started) return;
    started = true;
    var s = document.createElement('script');
    s.type = 'module';
    s.src = '/garden-3d.js';
    s.onerror = function () { if (window.startGarden2D) window.startGarden2D(); };
    document.body.appendChild(s);
  }
  var garden = document.querySelector('#tomato-garden');
  if (!garden || !('IntersectionObserver' in window)) { load(); return; }
  var io = new IntersectionObserver(function (entries) {
    if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); load(); }
  }, { rootMargin: '200% 0px' });
  io.observe(garden);
  setTimeout(function () {
    if (window.requestIdleCallback) requestIdleCallback(load, { timeout: 5000 }); else load();
  }, 15000);
})();
