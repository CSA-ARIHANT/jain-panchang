/* समीक्षा और रेटिंग: सिर्फ़ आपके 'approved' करने के बाद दिखती है।
   URL और key supabase-counter.js से आती हैं (window.SB_CONFIG), यहाँ कुछ भरना नहीं है। */
(function () {
  var cfg = window.SB_CONFIG || {};
  var box = document.getElementById('rvBox');
  if (!box || !cfg.url || cfg.url.indexOf('YOUR-') === 0) return;
  box.style.display = '';

  var rating = 0;
  function call(fn, body) {
    return fetch(cfg.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: cfg.key, Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
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
