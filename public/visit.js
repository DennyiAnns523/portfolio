// Visitors: anonymous visit counting, the greeting, the optional "who's visiting?" card and
// the feedback door. Runs after world.js, which provides toast(). Visitor text is only ever
// inserted with textContent.
(function () {
  var LABELS = { instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X', twitter: 'X', github: 'GitHub', facebook: 'Facebook', youtube: 'YouTube', whatsapp: 'WhatsApp' };
  var REFERRERS = [[/instagram\./, 'instagram'], [/linkedin\.|lnkd\.in/, 'linkedin'], [/(^|\.)(x|twitter)\.com$|(^|\.)t\.co$/, 'x'], [/github\./, 'github'], [/facebook\.|fb\./, 'facebook'], [/youtube\.|youtu\.be/, 'youtube'], [/whatsapp\./, 'whatsapp']];
  var K = { visits: 'denny-world-visits', session: 'denny-world-session', source: 'denny-world-source', id: 'denny-world-visitor-id', name: 'denny-world-name', who: 'denny-world-who', feedback: 'denny-world-feedback-given', notedEnd: 'denny-world-noted-end', hideHello: 'denny-world-hello-hidden' };

  var store = {
    get: function (s, k) { try { return window[s].getItem(k); } catch (e) { return null; } },
    set: function (s, k, v) { try { window[s].setItem(k, v); } catch (e) { /* private mode: fine */ } },
    del: function (s, k) { try { window[s].removeItem(k); } catch (e) { /* ignore */ } },
  };
  function send(method, url, body) {
    return fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: method === 'POST' && url === '/api/visit', body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (data) { return { ok: r.ok, status: r.status, data: data }; }); })
      .catch(function () { return { ok: false, status: 0, data: null }; });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  var say = function (m) { if (typeof toast === 'function') toast(m); };

  // ---- Where they came from
  var url = new URL(location.href);
  // /?reset-me makes this browser a first-time visitor again (handy for trying the notes yourself).
  if (url.searchParams.has('reset-me')) {
    ['localStorage', 'sessionStorage'].forEach(function (s) {
      try { Object.keys(window[s]).forEach(function (k) { if (k.indexOf('denny-world') === 0) window[s].removeItem(k); }); } catch (e) { /* ignore */ }
    });
    url.searchParams.delete('reset-me');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  var from = (url.searchParams.get('from') || '').toLowerCase().slice(0, 40);
  if (from === 'ig') from = 'instagram';
  if (url.searchParams.has('from')) {
    // Keep the address bar clean, so a shared link doesn't credit the wrong platform.
    url.searchParams.delete('from');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  var source = from;
  if (!source && document.referrer) {
    try {
      var host = new URL(document.referrer).hostname;
      for (var i = 0; i < REFERRERS.length; i++) if (REFERRERS[i][0].test(host)) { source = REFERRERS[i][1]; break; }
    } catch (e) { /* ignore */ }
  }

  // ---- Who they are (only if they told us)
  var me = { id: store.get('localStorage', K.id), name: store.get('localStorage', K.name) };
  if (!me.id || !me.name) me = { id: null, name: null };
  function forgetLocally() {
    store.del('localStorage', K.id);
    store.del('localStorage', K.name);
    me = { id: null, name: null };
  }

  // ---- Count the visit. One "visit" per tab session; reloads don't count as coming back.
  var newSession = !store.get('sessionStorage', K.session);
  var visits = Number(store.get('localStorage', K.visits)) || 0;
  if (newSession) {
    store.set('sessionStorage', K.session, '1');
    store.set('sessionStorage', K.source, source || '');
    store.set('localStorage', K.visits, String(visits + 1));
  }
  send('POST', '/api/visit', {
    from: from || undefined,
    referrer: document.referrer || undefined,
    // `visits` was read before this session was counted; a reload mid-session isn't a return.
    returning: newSession ? visits > 0 : visits > 1,
    visitorId: me.id || undefined,
    newSession: newSession,
  }).then(function (r) { if (me.id && r.ok && r.data && r.data.named === false) forgetLocally(); });

  // ---- Greeting
  if (newSession) {
    var message = me.name
      ? (visits > 0 ? 'Hey ' + me.name + ' 👋 Welcome back! This is visit #' + (visits + 1) + '.' : 'Hey ' + me.name + ' 👋')
      : visits > 0
        ? 'Hey, welcome back 👋 This is visit #' + (visits + 1) + '.'
        : LABELS[source]
          ? 'Hey there, ' + LABELS[source] + ' friend 👋 Welcome to my little world.'
          : 'Hey 👋 Welcome to my little world.';
    setTimeout(function () { say(message); }, 1800);
  }

  // ---- The note: a card Moriar carries in when the visitor reaches the end of the page.
  // Step "who" asks for a name (or "stay anonymous"); step "feedback" asks how the wander was.
  // At most once per session; never asks "who" again once answered, nor feedback once given.
  var card = null, cardOpenedAt = 0;
  var FACES = ['😞', '😐', '🙂', '😄', '🤩'], WORDS = ['Not great', 'Okay', 'Good', 'Great', 'Loved it'];
  function addFaces(fieldset) {
    FACES.forEach(function (face, i) {
      var label = el('label'), input = el('input'), span = el('span', null, face);
      input.type = 'radio'; input.name = 'rating'; input.value = String(i + 1);
      label.title = WORDS[i];
      input.setAttribute('aria-label', WORDS[i]);
      label.append(input, span);
      fieldset.append(label);
    });
  }
  function closeCard() {
    if (!card) return;
    var old = card;
    card = null;
    old.classList.add('leaving');
    setTimeout(function () { old.remove(); }, 260);
  }
  function feedbackGiven() { return store.get('localStorage', K.feedback) === '1'; }

  function renderWho(body, step) {
    body.innerHTML =
      '<p class="note-q">Hey 👋 who’s visiting?</p>' +
      '<p class="note-sub">Tell me your name or @handle, or stay a mystery.</p>' +
      '<form class="who-form"><input name="who" maxlength="41" autocomplete="nickname" placeholder="@yourhandle or name" aria-label="Your name or handle"><button class="action">Say hi</button></form>' +
      '<p class="form-error" role="alert" hidden></p>' +
      '<button type="button" class="who-anon">Stay anonymous</button>' +
      '<p class="note-fine">Optional. Only Dennyi sees it, and you can forget it anytime.</p>';
    var form = body.querySelector('form'), err = body.querySelector('.form-error');
    form.oninput = function () { err.hidden = true; };
    body.querySelector('.who-anon').onclick = function () {
      store.set('localStorage', K.who, 'anon');
      next('A mystery it is ✳');
    };
    form.onsubmit = function (e) {
      e.preventDefault();
      var typed = form.elements.who.value.trim();
      if (!typed.replace(/^@+/, '').trim()) { err.textContent = 'Type a name or @handle, or stay anonymous.'; err.hidden = false; return; }
      if (!window.crypto || !crypto.randomUUID) { err.textContent = 'Your browser can’t do this, sorry.'; err.hidden = false; return; }
      var id = me.id || crypto.randomUUID(), button = form.querySelector('button');
      button.disabled = true;
      send('POST', '/api/hello', { visitorId: id, name: typed, source: store.get('sessionStorage', K.source) || undefined }).then(function (r) {
        button.disabled = false;
        if (!r.ok) {
          err.textContent = r.data && typeof r.data.error === 'string' ? r.data.error : 'Couldn’t save that. Please try again.';
          err.hidden = false;
          return;
        }
        store.set('localStorage', K.id, id);
        store.set('localStorage', K.name, typed);
        store.set('localStorage', K.who, 'named');
        me = { id: id, name: typed };
        next('Nice to meet you, ' + typed + '! 👋');
      });
    };
    setTimeout(function () { if (form.isConnected) form.elements.who.focus({ preventScroll: true }); }, 450);
    // After "who", go straight on to feedback (unless it was already given).
    // On arrival ("hello") the note just says hi back; at the end ("who") it goes on to feedback.
    function next(heading) {
      if (step === 'hello') { thanks(body, heading, 'Enjoy the wander ✳'); return; }
      if (feedbackGiven()) { thanks(body, heading); return; }
      renderFeedback(body, heading);
    }
  }

  function renderFeedback(body, heading) {
    body.innerHTML =
      (heading ? '<p class="note-hi"></p>' : '') +
      '<p class="note-q">How was the wander?</p>' +
      '<form class="note-feedback"><fieldset class="rating"><legend class="sr-only">Rating (optional)</legend></fieldset>' +
      '<textarea name="comment" rows="3" maxlength="1000" placeholder="What worked, what broke, what you wish was here…" aria-label="Your feedback"></textarea>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="form-error" role="alert" hidden></p>' +
      '<div class="note-actions"><button class="action">Send ↗</button><button type="button" class="who-anon note-later">Not now</button></div></form>' +
      '<p class="note-fine"></p>';
    if (heading) body.querySelector('.note-hi').textContent = heading;
    body.querySelector('.note-fine').textContent = me.name ? 'Sending as ' + me.name + '. Only Dennyi reads it.' : 'Anonymous. Only Dennyi reads it.';
    addFaces(body.querySelector('.rating'));
    var form = body.querySelector('form'), err = body.querySelector('.form-error'), btn = form.querySelector('.action');
    form.oninput = function () { err.hidden = true; };
    body.querySelector('.note-later').onclick = closeCard;
    form.onsubmit = function (e) {
      e.preventDefault();
      var comment = form.elements.comment.value.trim(), picked = form.querySelector('input[name=rating]:checked');
      if (comment.length < 3 && !picked) { err.textContent = 'Pick a face or write a few words.'; err.hidden = false; return; }
      btn.disabled = true;
      send('POST', '/api/feedback', {
        // A face on its own is fine too.
        comment: comment.length >= 3 ? comment : WORDS[Number(picked.value) - 1] + ' ' + FACES[Number(picked.value) - 1],
        rating: picked ? Number(picked.value) : undefined,
        visitorId: me.id || undefined,
        website: form.elements.website.value,
        elapsedMs: Date.now() - cardOpenedAt,
      }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) {
          err.textContent = r.status === 429 ? 'Too much feedback from here. Please try again later.' : r.data && typeof r.data.error === 'string' ? r.data.error : 'Couldn’t send right now. Please try again.';
          err.hidden = false;
          return;
        }
        store.set('localStorage', K.feedback, '1');
        thanks(body, me.name ? 'Thank you, ' + me.name + ' ✳' : 'Thank you ✳');
      });
    };
  }

  function thanks(body, text, sub) {
    body.innerHTML = '<p class="note-q note-thanks"></p><p class="note-sub"></p>';
    body.querySelector('.note-q').textContent = text;
    body.querySelector('.note-sub').textContent = sub || 'Moriar will pass it on.';
    setTimeout(closeCard, 2600);
  }

  // Builds the card and pops it open, out of the dropped envelope when there is one.
  function showNote(step, from) {
    if (card) return;
    cardOpenedAt = Date.now();
    card = el('aside', 'note-card');
    card.setAttribute('aria-label', step === 'feedback' ? 'Leave feedback' : 'Say who you are');
    card.innerHTML = '<span class="note-tab">✉ Moriar brought you a note</span><button type="button" class="note-close" aria-label="Close">×</button><div class="note-body"></div>';
    card.querySelector('.note-close').onclick = function () {
      // × on the "who" note means "not now": don't ask again until the browser is closed.
      if (step !== 'feedback') store.set('sessionStorage', K.hideHello, '1');
      closeCard();
    };
    var body = card.querySelector('.note-body');
    if (step === 'feedback') renderFeedback(body); else renderWho(body, step);
    card.style.visibility = 'hidden';
    document.body.append(card);

    // Above the envelope (so the cat stays visible underneath), otherwise centred near the bottom.
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var cx = from ? from.left + from.width / 2 : innerWidth / 2;
    var left = Math.max(12, Math.min(innerWidth - cw - 12, cx - cw / 2));
    var top = from ? from.top - ch - 26 : innerHeight - ch - 28;
    top = Math.max(72, Math.min(innerHeight - ch - 12, top));
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    var ox = from ? from.left + from.width / 2 - left : cw / 2, oy = from ? from.top + from.height / 2 - top : ch;
    card.style.transformOrigin = ox + 'px ' + oy + 'px';
    card.style.visibility = '';
    requestAnimationFrame(function () { card && card.classList.add('open'); });
  }

  // Moriar carries the note in; without the cat (reduced motion, visits off, sprite missing)
  // the note simply pops up. Waits briefly for the cat's sprite to finish loading.
  function deliverNote(step, opts) {
    var waited = 0;
    (function attempt() {
      var cat = window.Moriar;
      if (cat && cat.ready && !cat.ready() && waited < 5000) { waited += 250; setTimeout(attempt, 250); return; }
      if (card) return;
      var carried = cat && cat.canDeliver && cat.canDeliver() && cat.deliver(function (rect) { showNote(step, rect); }, opts);
      if (!carried) showNote(step, null);
    })();
  }

  // On arrival: Moriar trots in with "who's visiting?" on every page load until the visitor answers
  // (a name or "stay anonymous"); × hides it for the rest of the browser session.
  if (!me.name && !store.get('localStorage', K.who) && !store.get('sessionStorage', K.hideHello)) {
    setTimeout(function () {
      var dialog = document.querySelector('#door');
      if (!(dialog && dialog.open)) deliverNote('hello', { duration: 5200, maxWait: 4000 });
    }, 900);
  }

  // Reaching the end of the page (the footer) brings the feedback note, once per session,
  // asking for a name first if the arrival note was closed without an answer.
  var footer = document.querySelector('footer');
  if (footer && 'IntersectionObserver' in window) {
    var seenTop = false;
    new IntersectionObserver(function (entries, observer) {
      var entry = entries[0];
      // Only after a real scroll down, not when a short window shows the footer on load.
      if (scrollY > innerHeight) seenTop = true;
      if (!entry.isIntersecting || !seenTop || card || store.get('sessionStorage', K.notedEnd)) return;
      store.set('sessionStorage', K.notedEnd, '1');
      var dialog = document.querySelector('#door');
      if (dialog && dialog.open) return;
      var step = !me.name && !store.get('localStorage', K.who) ? 'who' : !feedbackGiven() ? 'feedback' : null;
      observer.disconnect();
      if (step) setTimeout(function () { deliverNote(step, { duration: 8000, maxWait: 5000 }); }, 400);
    }, { threshold: 0.4 }).observe(footer);
  }

  // ---- Feedback door (in the same dialog the other doors use)
  function openFeedback() {
    var dialog = document.querySelector('#door'), content = document.querySelector('#door-content');
    if (!dialog || !content) return;
    var openedAt = Date.now();
    closeCard();
    content.innerHTML =
      '<div class="mono">Feedback / how was the wander?</div><h2>Tell me anything.</h2>' +
      '<p>What worked, what broke, what you wish was here. Only Dennyi reads it.</p>' +
      '<form class="hello-form feedback-form" novalidate>' +
      '<fieldset class="rating"><legend>How was it? <span>(optional)</span></legend></fieldset>' +
      '<label>Your feedback<textarea name="comment" rows="4" minlength="3" maxlength="1000" required></textarea></label>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<p class="form-error" role="alert" hidden></p><button class="action">Send feedback ↗</button></form>' +
      '<p class="note who-line"></p>';
    var faces = ['😞', '😐', '🙂', '😄', '🤩'], words = ['Not great', 'Okay', 'Good', 'Great', 'Loved it'];
    var fieldset = content.querySelector('.rating');
    faces.forEach(function (face, i) {
      var label = el('label'), input = el('input'), span = el('span', null, face);
      input.type = 'radio'; input.name = 'rating'; input.value = String(i + 1);
      label.title = words[i];
      input.setAttribute('aria-label', words[i]);
      label.append(input, span);
      fieldset.append(label);
    });
    var line = content.querySelector('.who-line');
    if (me.name) {
      line.append('Sending as ', el('strong', null, me.name), ' · ');
      var forget = el('button', 'link-btn', 'Forget me');
      forget.type = 'button';
      forget.onclick = function () {
        var id = me.id;
        send('DELETE', '/api/hello', { visitorId: id }).then(function (r) {
          if (!r.ok) { say('Couldn’t forget you right now. Please try again.'); return; }
          forgetLocally();
          store.set('localStorage', K.who, 'anon');
          line.textContent = 'Forgotten. You’re anonymous again.';
        });
      };
      line.append(forget);
    } else {
      line.append('Sending anonymously · ');
      var who = el('button', 'link-btn', 'Say who you are');
      who.type = 'button';
      who.onclick = function () { dialog.close(); store.del('localStorage', K.who); showNote('who', null); };
      line.append(who);
    }

    var form = content.querySelector('form'), err = form.querySelector('.form-error'), btn = form.querySelector('.action');
    form.oninput = function () { err.hidden = true; };
    form.onsubmit = function (e) {
      e.preventDefault();
      var comment = form.elements.comment.value.trim();
      var picked = form.querySelector('input[name=rating]:checked');
      if (comment.length < 3) { err.textContent = 'Write at least a few words.'; err.hidden = false; form.elements.comment.focus(); return; }
      err.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      send('POST', '/api/feedback', {
        comment: comment,
        rating: picked ? Number(picked.value) : undefined,
        visitorId: me.id || undefined,
        website: form.elements.website.value,
        elapsedMs: Date.now() - openedAt,
      }).then(function (r) {
        btn.disabled = false;
        btn.textContent = 'Send feedback ↗';
        if (r.ok) { store.set('localStorage', K.feedback, '1'); dialog.close(); say(me.name ? 'Thank you, ' + me.name + ' ✳' : 'Thank you for the feedback ✳'); return; }
        err.textContent = r.status === 429 ? 'Too much feedback from here. Please try again later.' : r.data && typeof r.data.error === 'string' ? r.data.error : 'Couldn’t send right now. Please try again.';
        err.hidden = false;
      });
    };
    dialog.showModal();
  }
  document.querySelectorAll('[data-feedback]').forEach(function (b) { b.onclick = openFeedback; });

  // /#say-hello (linked from the Journey page) opens the hello door straight away.
  function helloFromHash() {
    if (location.hash !== '#say-hello') return;
    history.replaceState(history.state, '', location.pathname + location.search);
    setTimeout(function () { var b = document.querySelector('[data-door=hello]'); if (b) b.click(); }, 600);
  }
  helloFromHash();
  window.addEventListener('hashchange', helloFromHash);
})();
