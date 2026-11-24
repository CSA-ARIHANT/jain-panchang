/* समीक्षा और रेटिंग: सिर्फ़ आपके 'approved' करने के बाद दिखती है।
   URL और key supabase-counter.js से आती हैं (window.SB_CONFIG), यहाँ कुछ भरना नहीं है। */
(function () {
  var cfg = window.SB_CONFIG || {};
  var box = document.getElementById('rvBox');
  if (!box || !cfg.url || cfg.url.indexOf('YOUR-') === 0) return;
  box.style.display = '';

  var rating = 0;

  /* ---------- वैकल्पिक Google लॉगिन (Supabase Auth, बिना SDK) ---------- */
  var SKEY = 'sbSession', session = null;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  /* Google से लौटने पर URL के # में token आता है */
  (function () {
    var h = location.hash || '';
    if (h.indexOf('access_token=') < 0) return;
    var q = {}; h.slice(1).split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) q[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    if (q.access_token) {
      lsSet(SKEY, JSON.stringify({ at: q.access_token, rt: q.refresh_token || '', exp: Date.now() + (+q.expires_in || 3600) * 1000 }));
      try { sessionStorage.setItem('goFb', '1'); } catch (e) {}
    }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  })();

  function loadSession() { try { session = JSON.parse(lsGet(SKEY) || 'null'); } catch (e) { session = null; } }
  function refresh() {
    if (!session || !session.rt) return Promise.resolve(false);
    return fetch(cfg.url + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.rt })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.access_token) return false;
      session = { at: d.access_token, rt: d.refresh_token || session.rt, exp: Date.now() + (+d.expires_in || 3600) * 1000, name: session.name };
      lsSet(SKEY, JSON.stringify(session)); return true;
    }).catch(function () { return false; });
  }
  function ensureFresh() {
    if (session && session.exp - Date.now() < 60000) return refresh().then(function (ok) { if (!ok) { session = null; lsDel(SKEY); } });
    return Promise.resolve();
  }
  function userName() { return session && session.name ? session.name : ''; }

  function paintAuth() {
    var a = document.getElementById('gAuth'), u = document.getElementById('gUser');
    if (!a || !u) return;
    var on = !!session;
    a.hidden = on; u.hidden = !on;
    if (on) {
      document.getElementById('gName').textContent = '✓ ' + (userName() || 'Google खाता') + ' से लॉगिन';
      ['rvName', 'fbName'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && userName() && !el.value) el.value = userName();
      });
    }
  }
  function fetchProfile() {
    if (!session) return Promise.resolve();
    return fetch(cfg.url + '/auth/v1/user', { headers: { apikey: cfg.key, Authorization: 'Bearer ' + session.at } })
      .then(function (r) { if (r.status === 401) { throw new Error('expired'); } return r.json(); })
      .then(function (u) {
        var md = (u && u.user_metadata) || {};
        session.name = md.full_name || md.name || (u && u.email ? u.email.split('@')[0] : '');
        lsSet(SKEY, JSON.stringify(session));
      }).catch(function (e) { if (e && e.message === 'expired') { session = null; lsDel(SKEY); } });
  }

  document.getElementById('gIn').addEventListener('click', function () {
    var back = location.origin + location.pathname;
    location.href = cfg.url + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back);
  });
  document.getElementById('gOut').addEventListener('click', function () {
    lsDel(SKEY); session = null;
    ['rvName', 'fbName'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    paintAuth();
  });

  loadSession();
  ensureFresh().then(function () { return fetchProfile(); }).then(function () {
    paintAuth();
    var go = false; try { go = sessionStorage.getItem('goFb') === '1'; sessionStorage.removeItem('goFb'); } catch (e) {}
    if (go && session) {
      var t = document.getElementById('t-fb'); if (t) t.click();
      var o = document.getElementById('rvOut'); if (o) o.textContent = 'लॉगिन हो गया। अब तारे चुनकर अपनी समीक्षा लिखें।';
      /* टैब बदलने से पेज ऊपर चला जाता है, इसलिए थोड़ी देर बाद सीधे समीक्षा-फ़ॉर्म तक ले जाते हैं */
      var goForm = function () {
        var g = document.getElementById('gUser') || document.getElementById('rvStars');
        if (g) try { g.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
      };
      setTimeout(goForm, 150); setTimeout(goForm, 700);
    }
  });

  function rpc(fn, body, token) {
    return fetch(cfg.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: 'Bearer ' + (token || cfg.key), 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  }
  function call(fn, body) {
    /* लॉगिन है तो उसके token से; किसी वजह से न चले तो बिना लॉगिन वाले तरीके से, ताकि समीक्षा कभी न रुके */
    var useTok = session && fn === 'submit_review';
    return rpc(fn, body, useTok ? session.at : null).then(function (r) {
      if (useTok && (r.status === 401 || r.status === 403)) return rpc(fn, body, null);
      return r;
    }).then(function (r) { return r.json(); });
  }
  function stars(n) { return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function load() {
    call('get_reviews').then(function (d) {
      var list = document.getElementById('rvList'), sum = document.getElementById('rvSum');
      list.innerHTML = '';
      if (!d || !d.count) { sum.textContent = 'अभी कोई समीक्षा नहीं है। पहली समीक्षा आप दें।'; return; }
      sum.textContent = '★ ' + d.avg + ' / 5 · ' + d.count + ' समीक्षाएँ';
      d.items.forEach(function (it) {
        var li = el('li'), l = el('div'), dt = new Date(it.created_at);
        l.appendChild(el('span', 'nm', stars(it.rating) + '  ' + (it.name || 'अतिथि')));
        l.appendChild(el('span', 'ds', it.comment));
        li.appendChild(l);
        li.appendChild(el('div', 'tm', dt.getDate() + '/' + (dt.getMonth() + 1) + '/' + String(dt.getFullYear()).slice(2)));
        list.appendChild(li);
      });
    }).catch(function () {});
  }

  var btns = document.querySelectorAll('#rvStars button');
  Array.prototype.forEach.call(btns, function (b) {
    b.addEventListener('click', function () {
      rating = +b.getAttribute('data-v');
      Array.prototype.forEach.call(btns, function (x) {
        var on = +x.getAttribute('data-v') <= rating;
        x.classList.toggle('on', on); x.setAttribute('aria-checked', +x.getAttribute('data-v') === rating);
      });
    });
  });

  var out = document.getElementById('rvOut'), send = document.getElementById('rvSend');
  send.addEventListener('click', function () {
    var msg = document.getElementById('rvMsg').value.trim(), name = document.getElementById('rvName').value.trim();
    if (document.getElementById('rvHp').value) return;              /* bot जाल */
    if (!rating) { out.textContent = 'कृपया तारे चुनकर रेटिंग दें।'; return; }
    if (msg.length < 3) { out.textContent = 'कृपया कुछ लिखें।'; document.getElementById('rvMsg').focus(); return; }
    send.disabled = true; out.textContent = 'भेज रहे हैं…';
    if (session && userName() && !name) name = userName();
    call('submit_review', { p_name: name, p_rating: rating, p_comment: msg }).then(function (r) {
      if (r && r.ok) {
        out.textContent = 'धन्यवाद! आपकी समीक्षा सत्यापन के बाद यहाँ दिखेगी।';
        document.getElementById('rvMsg').value = ''; rating = 0;
        Array.prototype.forEach.call(btns, function (x) { x.classList.remove('on'); });
        setTimeout(function () { send.disabled = false; }, 30000);
      } else {
        out.textContent = r && r.error === 'busy' ? 'अभी बहुत समीक्षाएँ आ रही हैं, थोड़ी देर बाद कोशिश करें।' : 'भेज नहीं पाए। कृपया दोबारा कोशिश करें।';
        send.disabled = false;
      }
    }).catch(function () { out.textContent = 'इंटरनेट की समस्या है। कृपया दोबारा कोशिश करें।'; send.disabled = false; });
  });

  load();
})();
