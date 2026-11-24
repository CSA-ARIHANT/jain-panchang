/* ===== Daily Panchang Share Card (Glass + Ice Blue) =====
 * चुनी हुई तारीख़ के पंचांग की इमेज (canvas) बनाता है और WhatsApp आदि पर भेजता है.
 * मोबाइल: share sheet. कंप्यूटर: इमेज डाउनलोड + WhatsApp का टेक्स्ट लिंक.
 *
 * index.html हर बार render() में window.PANCHANG_SHARE भरता है:
 *   { city, date, tithi, jain, nakshatra,
 *     samvat: [{name, val}], parv: [..], avkash: [..], tyohar: [..],
 *     sunrise, sunset,
 *     pachakkhan: [{name, time}],
 *     chaughadiya: [{name, time, type}],   // type: "shubh" | "mix" | "ashubh"
 *     url }
 *   कार्ड में सिर्फ़ शुभ चौघड़िया दिखते हैं. पर्व / अवकाश / त्यौहार खाली हों तो वो कार्ड नहीं दिखता.
 */
(function () {
  'use strict';

  var FONT = "'Mukta', 'Noto Sans Devanagari', sans-serif";
  var W = 1080, M = 40, CW = W - 2 * M, GAP = 26;
  /* वार के अनुसार रंग (ग्रह-परंपरा): रवि=नारंगी, सोम=चाँदी, मंगल=लाल, बुध=हरा, गुरु=सुनहरा, शुक्र=गुलाबी, शनि=नीला-जामुनी */
  var DAYPAL = [
    { h: 22,  s: 90, dl: 36, name: 'ravi' },
    { h: 215, s: 16, dl: 34, name: 'som' },
    { h: 6,   s: 78, dl: 38, name: 'mangal' },
    { h: 142, s: 55, dl: 28, name: 'budh' },
    { h: 44,  s: 90, dl: 28, name: 'guru' },
    { h: 334, s: 66, dl: 40, name: 'shukra' },
    { h: 236, s: 52, dl: 38, name: 'shani' }
  ];
  var INK, DIM, CHIP, PAL;
  function hsl(h, s, l, a) { return 'hsla(' + (((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')'; }
  function setPalette(wd) {
    var q = DAYPAL[(wd >= 0 && wd <= 6) ? wd : 0], h = q.h, s = q.s;
    PAL = { h: h, s: s, dl: q.dl };
    INK = hsl(h, Math.min(s, 45), 13);
    DIM = hsl(h, Math.round(s * 0.5), 34);
    CHIP = {
      samvat: hsl(h, s, q.dl + 2), parv: hsl(h - 14, s, q.dl), avkash: hsl(h + 20, s, q.dl),
      tyohar: hsl(h + 38, s, q.dl + 2), pach: hsl(h + 8, s, q.dl + 3), ch: hsl(h + 70, Math.max(s - 10, 14), q.dl)
    };
    if (q.name === 'budh') CHIP.ch = hsl(h - 30, 60, 30);
    if (q.name === 'som') CHIP.ch = hsl(160, 35, 34);
  }
  setPalette(0);

  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('400 32px Mukta', 'अआक'),
      document.fonts.load('600 32px Mukta', 'अआक'),
      document.fonts.load('700 32px Mukta', 'अआक')
    ]).catch(function () {});
  }

  /* ---------- helpers ---------- */
  var _m = null;
  function mc() { if (!_m) _m = document.createElement('canvas').getContext('2d'); return _m; }
  function setF(ctx, w, s) { ctx.font = w + ' ' + s + 'px ' + FONT; }
  function tw(ctx, t, w, s) { setF(ctx, w, s); return ctx.measureText(t).width; }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* फ़ॉन्ट छोटा करके चौड़ाई में बिठाता है; आख़िरी साइज़ लौटाता है */
  function fit(ctx, t, w, s, maxW) {
    while (s > 18 && tw(ctx, t, w, s) > maxW) s -= 2;
    setF(ctx, w, s);
    return s;
  }

  function wrap(ctx, text, w, s, maxW, maxLines) {
    setF(ctx, w, s);
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (wd) {
      var t = cur ? cur + ' ' + wd : wd;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + '…';
    }
    return lines;
  }

  /* ---------- glass look ---------- */
  function glass(ctx, x, y, w, h, r, dark) {
    ctx.save();
    ctx.shadowColor = dark ? hsl(PAL.h, PAL.s, 30, .35) : hsl(PAL.h, PAL.s, 40, .20);
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    if (dark) { g.addColorStop(0, hsl(PAL.h, PAL.s, PAL.dl, .97)); g.addColorStop(1, hsl(PAL.h, PAL.s, PAL.dl + 10, .94)); }
    else { g.addColorStop(0, 'rgba(255,255,255,.82)'); g.addColorStop(1, hsl(PAL.h, Math.min(PAL.s + 20, 100), 96, .55)); }
    ctx.fillStyle = g;
    rr(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();

    /* ऊपर की चमक */
    ctx.save();
    rr(ctx, x, y, w, h, r);
    ctx.clip();
    var sh = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
    sh.addColorStop(0, dark ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.55)');
    sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(x, y, w, h * 0.5);
    ctx.restore();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.95)';
    rr(ctx, x + 1, y + 1, w - 2, h - 2, r);
    ctx.stroke();
    ctx.restore();
  }

  function chip(ctx, x, y, text, color) {
    var cw = tw(ctx, text, 700, 26) + 44;
    ctx.fillStyle = color;
    rr(ctx, x, y, cw, 42, 21);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    setF(ctx, 700, 26);
    ctx.fillText(text, x + 22, y + 30);
  }

  /* ---------- blocks: {h, draw(ctx, y)} ---------- */
  var TOP = 86;   /* कार्ड के अंदर chip + gap */

  function headerBlock(d) {
    return { h: 290, draw: function (ctx, y) {
      glass(ctx, M, y, CW, 290, 44, true);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      fit(ctx, 'जैन पंचांग', 700, 64, CW - 80);
      ctx.fillText('जैन पंचांग', W / 2, y + 86);
      var l2 = (d.city || '') + '  •  ' + (d.date || '');
      fit(ctx, l2, 600, 38, CW - 80);
      ctx.fillText(l2, W / 2, y + 143);
      fit(ctx, d.tithi || '', 700, 50, CW - 80);
      ctx.fillText(d.tithi || '', W / 2, y + 213);
      var l4 = [d.jain, d.nakshatra ? 'नक्षत्र ' + d.nakshatra : ''].filter(Boolean).join('   •   ');
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      fit(ctx, l4, 400, 30, CW - 80);
      ctx.fillText(l4, W / 2, y + 260);
    } };
  }

  function sunBlock(d) {
    var h = 112, w = (CW - 24) / 2;
    return { h: h, draw: function (ctx, y) {
      [['सूर्योदय', d.sunrise, M], ['सूर्यास्त', d.sunset, M + w + 24]].forEach(function (p) {
        glass(ctx, p[2], y, w, h, 30, false);
        ctx.textAlign = 'center';
        ctx.fillStyle = DIM;
        setF(ctx, 600, 26);
        ctx.fillText(p[0], p[2] + w / 2, y + 40);
        ctx.fillStyle = INK;
        fit(ctx, p[1] || '--', 700, 40, w - 40);
        ctx.fillText(p[1] || '--', p[2] + w / 2, y + 88);
      });
    } };
  }

  function samvatBlock(d) {
    var items = d.samvat || [];
    if (!items.length) return null;
    var h = TOP + 78 + 20;
    return { h: h, draw: function (ctx, y) {
      glass(ctx, M, y, CW, h, 34, false);
      chip(ctx, M + 28, y + 22, 'संवत्', CHIP.samvat);
      var colW = (CW - 56) / items.length;
      items.forEach(function (it, i) {
        var x = M + 36 + i * colW;
        ctx.textAlign = 'left';
        ctx.fillStyle = DIM;
        setF(ctx, 600, 25);
        ctx.fillText(it.name + ' संवत्', x, y + TOP + 22);
        ctx.fillStyle = INK;
        setF(ctx, 700, 42);
        ctx.fillText(it.val, x, y + TOP + 68);
      });
    } };
  }

  function listBlock(title, color, list) {
    if (!list || !list.length) return null;
    var ctx0 = mc(), maxW = CW - 60 - 34, MAXI = 4, LH = 44;
    var shown = list.slice(0, MAXI), more = list.length - shown.length;
    var rows = shown.map(function (t) { return wrap(ctx0, t, 600, 32, maxW, 2); });
    var ch = 0;
    rows.forEach(function (ls) { ch += ls.length * LH + 8; });
    if (more > 0) ch += LH;
    var h = TOP + ch + 12;
    return { h: h, draw: function (ctx, y) {
      glass(ctx, M, y, CW, h, 34, false);
      chip(ctx, M + 28, y + 22, title, color);
      var cy = y + TOP;
      rows.forEach(function (ls) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(M + 44, cy + 22, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = INK;
        ctx.textAlign = 'left';
        setF(ctx, 600, 32);
        ls.forEach(function (ln, i) { ctx.fillText(ln, M + 70, cy + 33 + i * LH); });
        cy += ls.length * LH + 8;
      });
      if (more > 0) {
        ctx.fillStyle = DIM;
        setF(ctx, 600, 28);
        ctx.fillText('+ ' + more + ' और (ऐप में देखें)', M + 70, cy + 33);
      }
    } };
  }

  function columnsBlock(d) {
    var pk = d.pachakkhan || [];
    var sh = (d.chaughadiya || []).filter(function (r) { return r.type === 'shubh'; });
    if (!pk.length && !sh.length) return null;
    var colW = (CW - 24) / 2, ROW_L = 62, ROW_R = 84;
    var hl = pk.length * ROW_L, hr = sh.length * ROW_R + 44;
    var h = TOP + Math.max(hl, hr) + 16;
    var lx = M, rx = M + colW + 24;
    return { h: h, draw: function (ctx, y) {
      /* बायाँ: पच्चक्खाण, left align */
      glass(ctx, lx, y, colW, h, 34, false);
      chip(ctx, lx + 24, y + 22, 'पच्चक्खाण', CHIP.pach);
      pk.forEach(function (p, i) {
        var by = y + TOP + i * ROW_L + 34, maxW = colW - 56, s = 32;
        while (s > 20 && tw(ctx, p.name, 600, s) + 16 + tw(ctx, p.time, 700, s) > maxW) s -= 2;
        ctx.textAlign = 'left';
        ctx.fillStyle = INK;
        setF(ctx, 600, s);
        ctx.fillText(p.name, lx + 28, by);
        var nx = lx + 28 + tw(ctx, p.name, 600, s) + 16;
        ctx.fillStyle = CHIP.pach;
        setF(ctx, 700, s);
        ctx.fillText(p.time, nx, by);
      });

      /* दायाँ: शुभ चौघड़िया, right align */
      glass(ctx, rx, y, colW, h, 34, false);
      var title = 'शुभ चौघड़िया';
      var cw = tw(ctx, title, 700, 26) + 44;
      chip(ctx, rx + colW - 24 - cw, y + 22, title, CHIP.ch);
      var right = rx + colW - 30;
      sh.forEach(function (r, i) {
        var by = y + TOP + i * ROW_R;
        ctx.textAlign = 'right';
        ctx.fillStyle = INK;
        setF(ctx, 700, 34);
        ctx.fillText(r.name, right - 26, by + 30);
        ctx.fillStyle = CHIP.ch;
        ctx.beginPath();
        ctx.arc(right - 8, by + 18, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = DIM;
        fit(ctx, r.time, 400, 28, colW - 60);
        ctx.fillText(r.time, right, by + 66);
      });
      ctx.fillStyle = DIM;
      setF(ctx, 400, 23);
      ctx.textAlign = 'right';
      ctx.fillText('बाकी चौघड़िया ऐप में देखें', right, y + h - 22);
    } };
  }

  function footerBlock(d) {
    var u = (d.url || location.origin).replace(/^https?:\/\//, '');
    return { h: 132, draw: function (ctx, y) {
      glass(ctx, M, y, CW, 132, 36, true);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      setF(ctx, 400, 30);
      ctx.fillText('रोज़ का जैन पंचांग देखें', W / 2, y + 52);
      ctx.fillStyle = '#fff';
      fit(ctx, u, 700, 36, CW - 60);
      ctx.fillText(u, W / 2, y + 100);
    } };
  }

  /* ---------- background ---------- */
  function background(ctx, H) {
    var h = PAL.h, sa = PAL.s, g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, hsl(h, Math.min(sa + 20, 100), 97));
    g.addColorStop(0.5, hsl(h, Math.min(sa + 10, 90), 90));
    g.addColorStop(1, hsl(h, sa, 81));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    [[180, 260, 560, hsl(h, sa, 68, .55), 0], [920, H * 0.42, 600, hsl(h + 18, sa, 76, .65), 0],
     [200, H * 0.76, 640, hsl(h - 14, sa, 62, .42), 0], [900, H * 0.97, 560, hsl(h + 10, sa, 72, .55), 0]].forEach(function (b) {
      var rg = ctx.createRadialGradient(b[0], b[1], 0, b[0], b[1], b[2]);
      rg.addColorStop(0, b[3]);
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    });
  }

  /* ---------- build ---------- */
  function build(d) {
    return loadFonts().then(function () {
      setPalette(d.wd);
      var blocks = [
        headerBlock(d),
        sunBlock(d),
        samvatBlock(d),
        listBlock('जैन पर्व / कल्याणक', CHIP.parv, d.parv),
        listBlock('अवकाश', CHIP.avkash, d.avkash),
        listBlock('राष्ट्रीय एवं आर्य त्यौहार', CHIP.tyohar, d.tyohar),
        columnsBlock(d),
        footerBlock(d)
      ].filter(Boolean);

      var H = M * 2 + (blocks.length - 1) * GAP;
      blocks.forEach(function (b) { H += b.h; });

      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      background(ctx, H);

      var y = M;
      blocks.forEach(function (b) { b.draw(ctx, y); y += b.h + GAP; });

      return new Promise(function (res) { c.toBlob(res, 'image/png'); });
    });
  }

  /* ---------- share ---------- */
  function isMobile() {
    var ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  }

  function share(d) {
    if (!d) return Promise.resolve();
    return build(d).then(function (blob) {
      if (!blob) { alert('इमेज नहीं बन पाई। कृपया दोबारा कोशिश करें।'); return; }
      var file = new File([blob], 'jain-panchang.png', { type: 'image/png' });
      var text = '🙏 जय जिनेंद्र\n' + (d.date || '') + ' का जैन पंचांग\n' + (d.url || location.href);

      /* मोबाइल: सीधे share sheet (WhatsApp चुनें) */
      if (isMobile() && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], text: text }).catch(function (e) {
          if (e && e.name === 'AbortError') return;
          preview(blob, text);
        });
      }
      /* कंप्यूटर: इमेज दिखाकर डाउनलोड / कॉपी / WhatsApp के बटन */
      preview(blob, text);
    }).catch(function () { alert('इमेज नहीं बन पाई। कृपया दोबारा कोशिश करें।'); });
  }

  function preview(blob, text) {
    var old = document.getElementById('pcShareBox');
    if (old) old.parentNode.removeChild(old);
    var url = URL.createObjectURL(blob);
    var ov = document.createElement('div');
    ov.id = 'pcShareBox';
    ov.setAttribute('role', 'dialog');
    ov.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(10,10,25,.62);display:flex;align-items:center;justify-content:center;padding:14px;font-family:' + FONT;
    var card = document.createElement('div');
    card.style.cssText = 'background:#fff;border-radius:20px;max-width:440px;width:100%;max-height:96vh;overflow:auto;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center';
    var img = document.createElement('img');
    img.src = url; img.alt = 'आज का जैन पंचांग';
    img.style.cssText = 'max-width:100%;max-height:52vh;border-radius:12px;border:1px solid #ddd;display:block;margin:0 auto 12px';
    var msg = document.createElement('p');
    msg.style.cssText = 'margin:0 0 12px;font-size:.92rem;color:#444;line-height:1.5';
    msg.textContent = 'WhatsApp में भेजने के लिए: "इमेज कॉपी करें" दबाएँ, फिर WhatsApp खोलकर चैट में Ctrl+V करें।';
    function btn(label, bg, fg, fn) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = label;
      b.style.cssText = 'display:block;width:100%;margin:0 0 8px;padding:12px;border:0;border-radius:12px;font:600 1rem ' + FONT + ';cursor:pointer;background:' + bg + ';color:' + fg;
      b.addEventListener('click', fn);
      return b;
    }
    function close() { URL.revokeObjectURL(url); if (ov.parentNode) ov.parentNode.removeChild(ov); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    var status = document.createElement('p');
    status.style.cssText = 'margin:4px 0 8px;font-size:.88rem;color:#1F6B35;min-height:1.2em';
    var copyBtn = btn('📋 इमेज कॉपी करें', '#7A50E2', '#fff', function () {
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () {
          status.style.color = '#1F6B35'; status.textContent = 'कॉपी हो गई। अब WhatsApp में Ctrl+V करें।';
        }, function () {
          status.style.color = '#A12622'; status.textContent = 'कॉपी नहीं हुई। कृपया "इमेज डाउनलोड करें" दबाएँ।';
        });
      } else {
        status.style.color = '#A12622'; status.textContent = 'इस ब्राउज़र में कॉपी नहीं होगी। कृपया "इमेज डाउनलोड करें" दबाएँ।';
      }
    });
    var dlBtn = btn('⬇️ इमेज डाउनलोड करें', '#EFE9FF', '#3B1F8F', function () {
      var a = document.createElement('a');
      a.href = url; a.download = 'jain-panchang.png';
      document.body.appendChild(a); a.click(); a.remove();
      status.style.color = '#1F6B35'; status.textContent = 'डाउनलोड हो गई। WhatsApp में इसे अटैच करें।';
    });
    var waBtn = btn('WhatsApp खोलें', '#25D366', '#fff', function () {
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
    var clBtn = btn('बंद करें', 'transparent', '#666', close);
    card.appendChild(img); card.appendChild(msg); card.appendChild(copyBtn); card.appendChild(dlBtn);
    card.appendChild(waBtn); card.appendChild(status); card.appendChild(clBtn);
    ov.appendChild(card);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
  }

  window.shareDailyPanchang = share;
  window.buildPanchangCard = build;
})();
