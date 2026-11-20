// 🌘 Gölge kutusu (19.11.2026): bayi sohbetinde gölge modun kararları silik gri kutuda; ekip işleminin yanında "gölge ne yapardı · uyuşuyor mu"; SORU kararında "Gönder".
// WEB (web/golge_kutu.js) ve TABLET (assets/golge_kutu.js) AYNI dosyadır (test bire bir denetler). Yalnız ajans sahibi için (ctx.sahip); başkasına hiçbir istek / çizim yok.
// Bağlama (tek satır, dosya yüklenmezse sohbet aynen çalışır — GolgeKutu yoksa / hata olursa dokunulmaz):
//   try { if (window.GolgeKutu) GolgeKutu.ekle(items, { conv: <sohbet no>, sahip: <yalnız sahip>, api: api, yenile: () => renderChat(false) }); } catch (e) {}
// items: [{ k, at (ms), html }] biçiminde (tablette bkz. tablet bağlama notu). Kutular bu listeye EKLENİR; zamanına göre sıralama ana kodda.
// Düzen: önce önbellek (sessionStorage; hemen çizilir) → sonra veritabanı (oto_golge_sohbet; sohbet açıkken 45 sn'de bir;
// müşterinin son mesajı tazeyken (≤ 2 dk) 10 sn'de bir — gölgenin SORU kararı mesajdan ~20-30 sn sonra yazılır; yalnız sekme görünürken; özet aynıysa çizim yok).
// Gönder: istemci YALNIZ karar_id yollar (oto_golge_gonder); metni sunucu karar kaydından okur. Yerel alert / confirm YOK (hata kutunun içinde yazılır).
(function () {
  if (typeof window === "undefined" || window.GolgeKutu) return;
  var YOKLA_MS = 45000, SIK_MS = 10000, TAZE_MESAJ_MS = 120000, TIK_MS = 5000, S = {}, YAZ = {}, CTX = null, nGk = 0, TIK = null;
  var esc = function (x) { return String(x == null ? "" : x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var hm = function (ms) { try { return new Intl.DateTimeFormat("tr-TR", { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit" }).format(new Date(ms)); } catch (e) { return ""; } };
  var depo = function () { try { return window.sessionStorage; } catch (e) { return null; } };
  var oku = function (conv) { YAZ[conv] = 1; try { var d = depo(), t = d && d.getItem("gk_" + conv); return t ? JSON.parse(t) : null; } catch (e) { return null; } };
  var yaz = function (conv, c) { YAZ[conv] = 1; try { var d = depo(); if (d) d.setItem("gk_" + conv, JSON.stringify({ ozet: c.ozet, kutular: c.kutular, t: c.t })); } catch (e) {} };
  // tablet: Muhasebe.post(json, "geriÇağrı") → sunucu cevabı ham JSON; web: ctx.api (Promise)
  var tabletApi = function (action, body) { return new Promise(function (res) {
    var cb = "__gk" + (++nGk); window[cb] = function (raw) { try { delete window[cb]; } catch (e) { window[cb] = null; } var d; try { d = JSON.parse(raw); } catch (e) { d = { error: "Yanıt okunamadı" }; } res(d); };
    try { var o = { action: action }; for (var k in body) o[k] = body[k]; window.Muhasebe.post(JSON.stringify(o), cb); } catch (e) { res({ error: "Bağlantı yok" }); } }); };
  var api = function (a, b) { return CTX && CTX.api ? Promise.resolve(CTX.api(a, b)) : tabletApi(a, b); };

  var STIL = ".gk{margin:6px auto;width:min(92%,520px);box-sizing:border-box;padding:7px 10px;border:1px dashed rgba(128,128,128,.55);border-radius:10px;background:rgba(128,128,128,.10);color:inherit;opacity:.74;font-size:12.5px;line-height:1.38;text-align:left;align-self:center;clear:both}" +
    ".gk-h{font-weight:600;font-size:11px;opacity:.85;letter-spacing:.2px}.gk-ne{font-size:11.5px;opacity:.9;margin-top:2px}.gk-b{margin-top:2px;overflow-wrap:anywhere}.gk-y{margin-top:3px;font-style:italic;overflow-wrap:anywhere}" +
    ".gk-u{display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;border:1px solid rgba(128,128,128,.55);font-size:11px;font-weight:600;white-space:nowrap}" +
    ".gk-u-ok{border-color:rgba(34,160,90,.7)}.gk-u-fk{border-color:rgba(210,120,20,.8)}.gk-f{margin-top:6px;min-height:40px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}" +
    ".gk-go{min-height:40px;padding:6px 16px;border-radius:8px;border:1px solid rgba(128,128,128,.7);background:rgba(128,128,128,.12);color:inherit;font:inherit;font-weight:600;cursor:pointer;opacity:1}" +
    ".gk-go[disabled]{opacity:.6;cursor:default}.gk-s{font-size:12px;opacity:.9}.gk-er{font-size:11.5px;color:#d9534f}";
  var stil = function () { try { if (typeof document !== "undefined" && document.head && !document.getElementById("gkStil")) { var s = document.createElement("style"); s.id = "gkStil"; s.textContent = STIL; document.head.appendChild(s); } } catch (e) {} };

  /** Tek kutu → HTML ("<div" ile başlar; ana kod data-k ekler). c: sohbetin yerel durumu (gönderiliyor / hata). */
  function html(k, c) {
    var h = '<div class="gk gk-' + esc(k.tip || "") + '" data-gk="' + esc(k.k) + '"><div class="gk-h">🌘 Gölge</div>';
    if (k.tur === "islem") {
      var u = k.uyum || {}, mark = u.durum === "uyusuyor" ? '<span class="gk-u gk-u-ok">✓ uyuşuyor</span>' : u.durum === "farkli" ? '<span class="gk-u gk-u-fk">≠ farklı</span>' : "";
      h += '<div class="gk-ne">' + esc(k.ne || "") + "</div>" + '<div class="gk-b">Gölge: ' + esc(k.etiket || "") + mark + "</div>" + (u.durum === "farkli" && u.neden ? '<div class="gk-ne">' + esc(u.neden) + "</div>" : "");
      return h + "</div>";
    }
    h += '<div class="gk-b">' + esc(k.etiket || "") + "</div>";
    if (k.yazardi) h += '<div class="gk-y">şunu yazardı: «' + esc(k.yazardi) + "»</div>";
    var g = k.gonder;
    if (g) {
      var id = String(k.k).slice(1), busy = c && c.busy && c.busy[id], er = c && c.err && c.err[id];
      h += '<div class="gk-f">';
      if (g.durum === "gonderildi") h += '<span class="gk-s">✓ gönderildi' + (g.at ? " · " + hm(g.at) : "") + "</span>";
      else if (g.durum === "belirsiz") h += '<span class="gk-s">sonuç belirsiz · sohbete bakın</span>';
      else if (g.durum === "eskidi") h += '<span class="gk-s">eskidi</span>';
      else h += '<button type="button" class="gk-go" data-gk-go="' + esc(id) + '"' + (busy ? " disabled" : "") + ">" + (busy ? "Gönderiliyor…" : "Gönder") + "</button>";
      h += "</div>" + (er ? '<div class="gk-er">' + esc(er) + "</div>" : "");
    }
    return h + "</div>";
  }

  function yokla(ctx, c, zorla) {
    var now = Date.now();
    var aralik = c.sonMesaj && now - c.sonMesaj < TAZE_MESAJ_MS ? SIK_MS : YOKLA_MS; // tazeyken sık, değilse seyrek (Supabase çağrı sınırı)
    if (c.busyFetch || (!zorla && c.t && now - c.t < aralik)) return;
    if (typeof document !== "undefined" && document.hidden && c.t) return; // gizli sekme: yoklama yok (Supabase sınırı)
    c.busyFetch = true; c.t = now;
    api("oto_golge_sohbet", { conv: ctx.conv, ozet: c.ozet || "" }).then(function (d) {
      c.busyFetch = false;
      if (!d || d.error || !d.ok) return;                       // hata: önceki görünüm kalır
      if (d.ayni) return;                                        // değişmedi: yeniden çizim yok
      c.kutular = d.kutular || []; c.ozet = d.ozet; yaz(ctx.conv, c); if (ctx.yenile) ctx.yenile();
    }, function () { c.busyFetch = false; });
  }

  // Sohbet açıkken (ctx.aktif) ve sekme görünürken: yeni render beklemeden sorar (aralık yokla'da: 10 / 45 sn); sohbet kapanınca / gizlenince istek yok
  // 🔐 Sahiplik CANLI denetlenir (ctx.sahip bool ya da işlev): sahip olmayan duruma geçilince (başkası adına bakma / kullanıcı değişimi) bağlam, bellek ve oturum önbelleği temizlenir; hiçbir istek / çizim kalmaz
  var sahipMi = function (x) { try { return !!x && (typeof x.sahip === "function" ? !!x.sahip() : !!x.sahip); } catch (e) { return false; } };
  function temizle() { try { var vardi = !!CTX || Object.keys(S).length > 0; CTX = null; for (var k in S) delete S[k];
      if (TIK) { clearInterval(TIK); TIK = null; }
      var d = depo(); if (d && vardi) { for (var cv in YAZ) { try { d.removeItem("gk_" + cv); } catch (e) {} } YAZ = {}; var sil = []; for (var i = 0; i < d.length; i++) { var n = d.key(i); if (n && n.indexOf("gk_") === 0) sil.push(n); } sil.forEach(function (n) { d.removeItem(n); }); } } catch (e) {} }
  function tik() { try { if (typeof window !== "undefined" && window.__yedek) return; var x = CTX; if (!x) return; /* 🛟 yedekte yoklama yok */ if (!sahipMi(x)) { temizle(); return; } if (!x.aktif || !x.aktif()) return; if (typeof document !== "undefined" && document.hidden) return; var c = S[x.conv]; if (c) yokla(x, c, false); } catch (e) {} }
  /** items'a bu sohbetin kutularını ekler (önbellekten hemen; veritabanı arkada). Hata ya da sahip değilse items aynen döner. */
  function ekle(items, ctx) {
    try {
      if (!ctx || !ctx.conv || !Array.isArray(items)) return items;
      if (!sahipMi(ctx)) { temizle(); return items; }
      CTX = ctx; stil();
      if (ctx.aktif && !TIK && typeof setInterval === "function") TIK = setInterval(tik, TIK_MS); // yalnız aktif() veren bağlamda: sohbet açık + sekme görünürken yoklar (10 / 45 sn kuralı yokla'da)
      var c = S[ctx.conv];
      if (!c) { c = S[ctx.conv] = { busy: {}, err: {}, kutular: [], ozet: "" }; var o = oku(ctx.conv); if (o && Array.isArray(o.kutular)) { c.kutular = o.kutular; c.ozet = o.ozet || ""; } }
      var son = 0; items.forEach(function (i) { var t = Number(i && i.at) || 0; if (t > son && t <= Date.now() + 60000) son = t; }); c.sonMesaj = son; // sohbetin en yeni mesajı (hız ayarı)
      yokla(ctx, c, false);
      c.kutular.forEach(function (k) { if (k && k.k) items.push({ k: "gk" + k.k, at: Number(k.at) || 0, html: html(k, c) }); });
    } catch (e) {}
    return items;
  }

  function gonder(id) {
    var ctx = CTX; if (ctx && !sahipMi(ctx)) { temizle(); return; } var c = ctx && S[ctx.conv]; if (!c || c.busy[id]) return;
    c.busy[id] = 1; delete c.err[id]; if (ctx.yenile) ctx.yenile();
    var bitti = function (r) {
      delete c.busy[id]; var k = (c.kutular || []).filter(function (x) { return x.k === "g" + id; })[0];
      if (r && r.ok && k) { k.gonder = { durum: "gonderildi", at: Date.now() }; c.ozet = ""; yaz(ctx.conv, c); }
      else if (r && r.kod === "eskidi" && k) { k.gonder = { durum: "eskidi" }; c.ozet = ""; yaz(ctx.conv, c); }
      else if (r && r.kod === "belirsiz" && k) { k.gonder = { durum: "belirsiz" }; c.ozet = ""; yaz(ctx.conv, c); }
      else c.err[id] = (r && r.error) || "Gönderilemedi";
      if (ctx.yenile) ctx.yenile(); yokla(ctx, c, true);
    };
    api("oto_golge_gonder", { karar_id: Number(id) }).then(bitti, function () { bitti({ error: "Bağlantı yok" }); });
  }
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-gk-go]") : null; if (!t) return; e.preventDefault(); e.stopPropagation(); gonder(t.getAttribute("data-gk-go"));
  }, true);
  window.GolgeKutu = { ekle: ekle, html: html, _durum: S, _durdur: function () { if (TIK) { clearInterval(TIK); TIK = null; } }, _tik: tik };
})();
