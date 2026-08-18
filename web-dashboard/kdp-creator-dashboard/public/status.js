(function () {
  var params = new URLSearchParams(location.search);
  var API_BASE = (params.get('api') || 'https://dashboard-backend-hazel.vercel.app').replace(/\/+$/, '');
  var CHECKS = [
    { id: 'health', name: 'API health', path: '/api/health' },
    { id: 'live', name: 'Liveness', path: '/api/health/live' },
    { id: 'ready', name: 'Readiness', path: '/api/health/ready' },
  ];

  function setOverall(tone, label) {
    document.getElementById('overall-dot').className = 'dot ' + tone;
    document.getElementById('overall-label').textContent = label;
    document.getElementById('checked-at').textContent =
      'Checked ' + new Date().toLocaleString() + ' · ' + API_BASE;
  }

  async function probe(path) {
    var started = performance.now();
    try {
      var res = await fetch(API_BASE + path, { method: 'GET', cache: 'no-store' });
      return { ok: res.ok, code: res.status, ms: Math.round(performance.now() - started) };
    } catch (err) {
      return { ok: false, code: 0, ms: Math.round(performance.now() - started) };
    }
  }

  async function run() {
    var list = document.getElementById('checks');
    list.innerHTML = '';
    var results = [];
    for (var i = 0; i < CHECKS.length; i++) {
      var c = CHECKS[i];
      var r = await probe(c.path);
      results.push(r);
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="dot ' + (r.ok ? 'ok' : 'bad') + '"></span>' +
        '<span class="name">' + c.name + '</span>' +
        '<span class="code">HTTP ' + (r.code || '—') + '</span>' +
        '<span class="ms">' + r.ms + ' ms</span>';
      list.appendChild(li);
    }
    var okCount = results.filter(function (r) { return r.ok; }).length;
    if (okCount === results.length) setOverall('ok', 'All systems operational');
    else if (okCount === 0) setOverall('bad', 'API unreachable');
    else setOverall('warn', 'Partial degradation');
  }

  document.getElementById('refresh').addEventListener('click', run);
  run();
  setInterval(run, 60000);
})();
