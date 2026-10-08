/* Supabase visitor counter: कुल विज़िटर और अभी ऑनलाइन
   सिर्फ़ इसी फ़ाइल में अपनी URL और key भरें। */
(function () {
  var SB_URL = 'https://vqmfuwzdnccnqbahbbsm.supabase.co';   // जैसे https://abcd1234.supabase.co
  var SB_KEY = 'sb_publishable_mWETDstfbXsyJ_SVtflg8w_zrpcITKo';      // Supabase का anon public key (service_role कभी नहीं)
  window.SB_CONFIG = { url: SB_URL, key: SB_KEY };   // supabase-reviews.js भी इन्हीं को पढ़ती है

  function g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var id = g('vcId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    try { localStorage.setItem('vcId', id); } catch (e) {}
  }
  var first = true;
  try { first = !sessionStorage.getItem('vcSeen'); sessionStorage.setItem('vcSeen', '1'); } catch (e) {}

  function ping(hit) {
    if (SB_URL.indexOf('YOUR-') === 0) return;
    fetch(SB_URL + '/rest/v1/rpc/vc_ping', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: id, p_hit: hit })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var t = document.getElementById('vcTotal'), o = document.getElementById('vcOnline');
        if (t) t.textContent = d.total;
        if (o) o.textContent = d.online;
      })
      .catch(function () {});
  }

  ping(first);
  setInterval(function () { if (!document.hidden) ping(false); }, 60000);
})();
