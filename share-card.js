/* ===== Daily Panchang Share Card =====
 * चुनी हुई तारीख़ के पंचांग की इमेज (canvas) बनाता है और WhatsApp आदि पर भेजता है.
 * मोबाइल: share sheet. कंप्यूटर: इमेज डाउनलोड + WhatsApp का टेक्स्ट लिंक.
 *
 * index.html हर बार render() में window.PANCHANG_SHARE भरता है:
 *   { city, date, tithi, jain, special, sunrise, sunset,
 *     pachakkhan: [{name, time}], chaughadiya: [{name, time, type}], url }
 *   type: "shubh" | "mix" | "ashubh"
 */
(function () {
  'use strict';

  var FONT = "'Mukta', 'Noto Sans Devanagari', sans-serif";
  var W = 1080;

  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load("400 32px Mukta", "अआक"),
      document.fonts.load("600 32px Mukta", "अआक"),
      document.fonts.load("700 32px Mukta", "अआक")
    ]).catch(function () {});
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* बहुत लंबा टेक्स्ट हो तो फ़ॉन्ट छोटा करके चौड़ाई में बिठाता है */
  function fit(ctx, text, weight, size, maxW) {
    var s = size;
    ctx.font = weight + ' ' + s + 'px ' + FONT;
    while (ctx.measureText(text).width > maxW && s > 20) {
      s -= 2;
      ctx.font = weight + ' ' + s + 'px ' + FONT;
    }
  }

  var _mctx = null;
  function wrapLines(text) {
    if (!_mctx) _mctx = document.createElement('canvas').getContext('2d');
    _mctx.font = '600 32px ' + FONT;
    var maxW = W - 150, words = String(text).split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (_mctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    if (lines.length > 2) { lines = lines.slice(0, 2); lines[1] = lines[1].replace(/\s+\S*$/, '') + '…'; }
    return lines;
  }

  function layout(d) {
    var pk = d.pachakkhan || [], ch = d.chaughadiya || [];
    var h = 285;                         // header
    h += 100;                            // सूर्योदय / सूर्यास्त
    if (d.special) h += 40 + 44 * wrapLines(d.special).length + 40; // पर्व / कल्याणक
    if (pk.length) h += 110 + pk.length * 62 + 30;
    if (ch.length) h += 80 + ch.length * 62 + 30;
    h += 120;                            // footer
    return h;
  }

  function build(d) {
    return loadFonts().then(function () {
      var H = layout(d);
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');

      var g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#FFF3DC');
      g.addColorStop(1, '#FFE0B2');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      /* header */
      ctx.fillStyle = '#B8460E';
      ctx.fillRect(0, 0, W, 285);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      fit(ctx, 'जैन पंचांग', '700', 68, W - 100);
      ctx.fillText('जैन पंचांग', W / 2, 90);
      var l2 = (d.city || '') + '  •  ' + (d.date || '');
      fit(ctx, l2, '600', 40, W - 80);
      ctx.fillText(l2, W / 2, 148);
      fit(ctx, d.tithi || '', '700', 46, W - 80);
      ctx.fillText(d.tithi || '', W / 2, 212);
      if (d.jain) {
        fit(ctx, d.jain, '400', 30, W - 80);
        ctx.fillText(d.jain, W / 2, 262);
      }

      var y = 285 + 62;

      /* सूर्योदय / सूर्यास्त */
      ctx.fillStyle = '#5A2A0B';
      ctx.textAlign = 'left';
      fit(ctx, 'सूर्योदय  ' + (d.sunrise || '--'), '700', 38, W / 2 - 70);
      ctx.fillText('सूर्योदय  ' + (d.sunrise || '--'), 60, y);
      ctx.textAlign = 'right';
      fit(ctx, 'सूर्यास्त  ' + (d.sunset || '--'), '700', 38, W / 2 - 70);
      ctx.fillText('सूर्यास्त  ' + (d.sunset || '--'), W - 60, y);
      y += 38;

      /* पर्व / कल्याणक (2 लाइन तक) */
      if (d.special) {
        var lines = wrapLines(d.special);
        var sh = 40 + 44 * lines.length;
        ctx.fillStyle = '#7A1F0A';
        rr(ctx, 50, y, W - 100, sh, 18);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = '600 32px ' + FONT;
        lines.forEach(function (ln, i) { ctx.fillText(ln, W / 2, y + 20 + 40 + i * 44 - 14); });
        y += sh + 40;
      }

      /* पच्चक्खाण */
      var pk = d.pachakkhan || [];
      if (pk.length) {
        var bh = 90 + pk.length * 62;
        ctx.fillStyle = '#fff';
        rr(ctx, 50, y, W - 100, bh, 28);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#B8460E';
        ctx.font = '700 40px ' + FONT;
        ctx.fillText('पच्चक्खाण समय', 80, y + 62);
        pk.forEach(function (p, i) {
          var ly = y + 125 + i * 62;
          ctx.fillStyle = '#3b2a1a';
          ctx.textAlign = 'left';
          ctx.font = '400 36px ' + FONT;
          ctx.fillText(p.name, 80, ly);
          ctx.textAlign = 'right';
          ctx.font = '700 36px ' + FONT;
          ctx.fillText(p.time, W - 80, ly);
        });
        y += bh + 30;
      }

      /* चौघड़िया */
      var ch = d.chaughadiya || [];
      if (ch.length) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#B8460E';
        ctx.font = '700 40px ' + FONT;
        ctx.fillText('दिन के चौघड़िया', 70, y + 42);
        y += 62;
        var colors = { shubh: '#2E7D32', ashubh: '#C62828', mix: '#EF6C00' };
        var labels = { shubh: 'शुभ', ashubh: 'अशुभ', mix: 'सामान्य' };
        ch.forEach(function (r, i) {
          var ry = y + i * 62;
          ctx.fillStyle = '#fff';
          rr(ctx, 50, ry, W - 100, 54, 14);
          ctx.fill();
          ctx.fillStyle = colors[r.type] || '#555';
          ctx.beginPath();
          ctx.arc(88, ry + 27, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3b2a1a';
          ctx.textAlign = 'left';
          ctx.font = '700 32px ' + FONT;
          ctx.fillText(r.name, 115, ry + 38);
          ctx.fillStyle = colors[r.type] || '#555';
          ctx.font = '400 26px ' + FONT;
          ctx.fillText(labels[r.type] || '', 235, ry + 37);
          ctx.fillStyle = '#3b2a1a';
          ctx.textAlign = 'right';
          fit(ctx, r.time, '400', 32, W - 420);
          ctx.fillText(r.time, W - 80, ry + 38);
        });
        y += ch.length * 62 + 30;
      }

      /* footer */
      ctx.fillStyle = '#B8460E';
      ctx.fillRect(0, H - 120, W, 120);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '400 30px ' + FONT;
      ctx.fillText('रोज़ का जैन पंचांग देखें', W / 2, H - 70);
      var u = (d.url || location.origin).replace(/^https?:\/\//, '');
      fit(ctx, u, '700', 34, W - 80);
      ctx.fillText(u, W / 2, H - 26);

      return new Promise(function (res) { c.toBlob(res, 'image/png'); });
    });
  }

  function share(d) {
    if (!d) return Promise.resolve();
    return build(d).then(function (blob) {
      if (!blob) return;
      var file = new File([blob], 'jain-panchang.png', { type: 'image/png' });
      var text = '🙏 जय जिनेंद्र\n' + (d.date || '') + ' का जैन पंचांग\n' + (d.url || location.href);

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], text: text }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          download(blob, text);
        });
      }
      download(blob, text);
    });
  }

  function download(blob, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jain-panchang.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    }, 600);
  }

  window.shareDailyPanchang = share;
  window.buildPanchangCard = build;
})();
