// Loads the WebGL garden as a module; if it (or Three.js) fails to load, the flat canvas garden takes over.
(function () {
  var s = document.createElement('script');
  s.type = 'module';
  s.src = '/garden-3d.js';
  s.onerror = function () { if (window.startGarden2D) window.startGarden2D(); };
  document.body.appendChild(s);
})();
