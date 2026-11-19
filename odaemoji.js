// 😊 Koltuk emojileri — panel tarafı (19.11.2026). Sahip: "ayrıca gülümseme emojileri atılabiliyor mikrofondayken onları hem görebileyim hem atabileyim onları da çek sugodan".
// GÖRME: tablet (room_cap.js ⟦emoji⟧ __reAl, hızlı kipte 250 ms'lik mevcut turda) Sugo deposundaki YENİ koltuk emojilerini mevcut "room_spk" paketine "e" dizisi olarak koyar
//   (sinyal sunucusu → panel; veritabanı / Supabase çağrısı YOK). odaSpkSet bunu odaEmojiAl'a verir; emoji, atan kişinin koltuk resminin ÜSTÜNE bindirilir (yerinde: ızgara yeniden
//   çizilmez, yerleşim kaymaz). Aynı kişiye sıradaki emoji öncekinin yerine geçer. Tür 2 / 3'te önce gif, sonra sonuç görseli (+ sayı).
// ATMA: Oda sekmesinde "Selçuk mikrofonda" satırının sağ ucunda 😊 düğmesi (yalnız sahip; Selçuk koltukta değilken görünmez ama yeri ayrılı). Alt sayfada emoji seçici: üstte grup sekmeleri
//   (kapak resmi), altında 8'li ızgara; dokununca hemen gönderilir ve seçici AÇIK kalır. Liste Sugo'dan tablet aracılığıyla ("emojiler") gelir; bu telefonda 24 saat saklanır (localStorage):
//   seçici önce önbellekten ANINDA çizilir, önbellek yoksa iskelet + istek. Sonuç: "belirsiz" ve hata açıkça yazılır (üst uyarı); başarıda emoji koltukta görünür.
// Bağlama (web/index.html): <script src="odaemoji.js"></script> · odaBkApply sonunda `if (window.odaEmojiApply) odaEmojiApply(b);` · odaSpkSet başında `pl.e` yönlendirmesi.
// ⟦emoSaf⟧ saf işlevler (tests/oda_emoji_web_test.ts ayrı çalıştırır; sayfaya dokunmaz)
window.EMO_ONBELLEK_MS = 30 * 24 * 3600_000; window.EMO_SUTUN = 8; window.EMO_DENETIM_MS = 6 * 3600_000; window.EMO_HATA_BEKLE_MS = 3600_000; // kayıt telefonda 30 gün (açılış HER ZAMAN buradan / bizim sunucudan); Sugo denetimi 6 saatte bir, hata sonrası en erken 1 saat
/** yalnız https görsel adresi (http → https; başka şema yok) */
window.emoUrl = function (u) { u = String(u == null ? "" : u).slice(0, 400); if (!/^https?:\/\/[^\s"'<>]+$/.test(u)) return ""; return u.replace(/^http:\/\//, "https://"); };
/** tabletten / sunucudan gelen / saklanan liste → temiz liste (grup ≤ 12, grup başına ≤ 80); biçimsiz öğe atılır. u / ku = bizim sunucudaki dosyanın (imzalı) adresi, gif / kapak = Sugo adresi (yedek) */
window.emoListeTemiz = function (g) { var out = [];
  (Array.isArray(g) ? g : []).slice(0, 12).forEach(function (x) { if (!x || typeof x !== "object") return; var L = [];
    (Array.isArray(x.emo) ? x.emo : []).slice(0, 80).forEach(function (e) { if (!e || typeof e !== "object") return; var id = Number(e.id), gif = window.emoUrl(e.gif);
      if (!(Number.isInteger(id) && id >= 1 && id <= 999999) || !gif) return; var t = Number(e.tur), o = { id: id, ad: String(e.ad || "").slice(0, 40), tur: t === 2 || t === 3 ? t : 1, gif: gif }, u = window.emoUrl(e.u); if (u) o.u = u; L.push(o); });
    if (L.length) { var o2 = { tag: Number(x.tag) || 0, ad: String(x.ad || "").slice(0, 30), kapak: window.emoUrl(x.kapak), emo: L }, ku = window.emoUrl(x.ku); if (ku) o2.ku = ku; out.push(o2); } });
  return out; };
/** imzalı adresin süresi (s=bitiş epoch sn) dolmuş mu / dolmak üzere mi (60 sn pay); süre bilgisi yoksa geçerli say (bozuksa resim kendisi Sugo adresine düşer) */
window.emoAdresGecerli = function (u, now) { var m = /[?&]s=(\d{9,11})(?:&|$)/.exec(String(u || "")); return !m || Number(m[1]) * 1000 > now + 60_000; };
/** gösterilecek adres: bizdeki dosya (süresi dolmadıysa) → yoksa Sugo adresi; fb = bozulursa düşülecek Sugo adresi ("" = düşecek yer yok) */
window.emoAdres = function (e, now, kapak) { var u = kapak ? e.ku : e.u, s = kapak ? e.kapak : e.gif; return u && window.emoAdresGecerli(u, now) ? { src: u, fb: s || "" } : { src: s || "", fb: "" }; };
/** gelen listeyi mevcutla birleştirir (hiçbir şey silinmez; mevcut sıra korunur): yeni grup / emoji SONA eklenir; Sugo adresi aynıysa bizim adres (u) korunur, değiştiyse gelenin adresi geçer.
 *  → { g: birleşik liste, yeni: [eklenen emoji kimlikleri], degisti: bool (görünür / saklanacak bir şey değişti mi) } */
window.emoBirlestir = function (mevcut, gelen) { var g = JSON.parse(JSON.stringify(window.emoListeTemiz(mevcut))), yeni = [], degisti = false;
  window.emoListeTemiz(gelen).forEach(function (x) { var m = null; for (var i = 0; i < g.length; i++) if (g[i].tag === x.tag) m = g[i];
    if (!m) { if (g.length < 12) { g.push(x); degisti = true; x.emo.forEach(function (e) { yeni.push(e.id); }); } return; }
    if (x.ad && x.ad !== m.ad) { m.ad = x.ad; degisti = true; } if (x.kapak && x.kapak !== m.kapak) { m.kapak = x.kapak; if (x.ku) m.ku = x.ku; else delete m.ku; degisti = true; } else if (x.ku && x.ku !== m.ku) { m.ku = x.ku; degisti = true; }
    x.emo.forEach(function (e) { var o = null; for (var j = 0; j < m.emo.length; j++) if (m.emo[j].id === e.id) o = m.emo[j];
      if (!o) { if (m.emo.length < 80) { m.emo.push(e); yeni.push(e.id); degisti = true; } return; }
      if (o.gif === e.gif) { if (e.u && e.u !== o.u) { o.u = e.u; degisti = true; } if (e.ad && e.ad !== o.ad) { o.ad = e.ad; degisti = true; } if (e.tur !== o.tur) { o.tur = e.tur; degisti = true; } }
      else { o.gif = e.gif; if (e.u) o.u = e.u; else delete o.u; o.ad = e.ad || o.ad; o.tur = e.tur; degisti = true; } }); });
  return { g: g, yeni: yeni, degisti: degisti }; };
/** liste boş mu (grup yok / emoji yok) */
window.emoBosMu = function (g) { return !Array.isArray(g) || !g.some(function (x) { return x && Array.isArray(x.emo) && x.emo.length; }); };
/** Sugo (tablet) denetimi gerekli mi: kayıt boşsa HEMEN; değilse son denetimden (sunucudaki den, epoch sn) 6 saat geçtiyse; hata sonrası en erken 1 saat sonra (sonDeneme, ms) */
window.emoDenetimGerek = function (o) { var now = o.now, bos = !!o.bos, den = Number(o.den) || 0, son = Number(o.sonDeneme) || 0;
  if (son && now - son < window.EMO_HATA_BEKLE_MS) return false; if (bos) return true; return !den || now - den * 1000 >= window.EMO_DENETIM_MS; };
/** saklı metin → { at, g, v, den } ya da null (30 günden eski / bozuk / boş) */
window.emoOnbellekOku = function (txt, now) { try { var o = JSON.parse(String(txt || "null")); if (!o || typeof o !== "object") return null; var at = Number(o.at);
  if (!(at > 0) || now - at >= window.EMO_ONBELLEK_MS || at - now > 3600_000) return null; var g = window.emoListeTemiz(o.g); return g.length ? { at: at, g: g, v: typeof o.v === "string" ? o.v.slice(0, 40) : "", den: Number(o.den) || 0 } : null; } catch (e) { return null; } };
window.emoOnbellekYaz = function (g, now, meta) { meta = meta || {}; return JSON.stringify({ at: now, g: window.emoListeTemiz(g), v: String(meta.v || "").slice(0, 40), den: Number(meta.den) || 0 }); };
/** gelen "room_spk" paketi → geçerli emoji olayları (oda eşleşmeli; en çok 10; biçim süzülür) */
window.emoOlaylar = function (pl, oda) { var out = [];
  if (!pl || !Array.isArray(pl.e) || !/^\d{3,12}$/.test(String(pl.room || "")) || String(pl.room) !== String(oda || "")) return out;
  pl.e.slice(0, 10).forEach(function (x) { if (!x || typeof x !== "object" || !/^\d{1,24}$/.test(String(x.uid || ""))) return; var id = Number(x.id), gif = window.emoUrl(x.gif);
    if (!(Number.isInteger(id) && id >= 1) || !gif) return; var sm = Number(x.sure_ms), t = Number(x.tur);
    var o = { uid: String(x.uid), id: id, ad: String(x.ad || "").slice(0, 40), tur: t === 2 || t === 3 ? t : 1, gif: gif, sure_ms: sm > 0 ? Math.max(500, Math.min(15000, Math.round(sm))) : 3000 };
    var sn = window.emoUrl(x.sonuc); if (sn && o.tur !== 1) { o.sonuc = sn; var rm = Number(x.sonuc_ms); o.sonuc_ms = rm > 0 ? Math.max(500, Math.min(10000, Math.round(rm))) : 3000;
      var sy = Number(x.sayi); if (x.sayi != null && x.sayi !== "" && Number.isInteger(sy) && sy >= 0 && sy <= 999) o.sayi = sy; }
    out.push(o); });
  return out; };
/** gösterim planı: sırayla [{src, ms, sayi?}] (gif sonra varsa sonuç) */
window.emoPlan = function (o) { var p = [{ src: o.gif, ms: o.sure_ms }]; if (o.sonuc) p.push({ src: o.sonuc, ms: o.sonuc_ms || 3000, ...(o.sayi != null ? { sayi: o.sayi } : {}) }); return p; };
/** sonuç → üst uyarı: { metin, tur: "" | "warn" | "bad" } ya da null (başarıda uyarı yok: emoji koltukta görünür) */
window.emoSonucUyari = function (r) { if (!r) return { metin: "Emoji gönderilemedi", tur: "bad" }; if (r.ok) return null;
  if (r.belirsiz || (r.data && r.data.bilinmiyor)) return { metin: "⚠️ Emoji belirsiz: " + String(r.err || "Sugo'dan onay görülmedi").slice(0, 160), tur: "warn" };
  return { metin: "😊 Emoji atılmadı: " + String(r.err || "bilinmeyen hata").slice(0, 160), tur: "bad" }; };
// ⟦/emoSaf⟧
(function () {
  var W = window; if (W.__emoKur) return; W.__emoKur = 1;
  var D = W.document, ANAHTAR = "bw_oemo";
  // bağımlılıklar: index.html'in genel adları (testte W.__emoDep ile verilir)
  var dep = W.__emoDep || {
    sahip: function () { return typeof yonOk === "function" && !!yonOk(); }, // eslint-disable-line no-undef
    oda: function () { return typeof odaData !== "undefined" && odaData && odaData.room ? String(odaData.room.id) : ""; }, // eslint-disable-line no-undef
    koltuk: function () { return typeof odaBkDurum === "function" && !!odaBkDurum().koltuk; }, // eslint-disable-line no-undef
    api: function (a, b) { return typeof api === "function" ? api(a, b) : Promise.resolve({ error: "Panel hazır değil" }); }, // eslint-disable-line no-undef
    koltukNo: function () { return typeof odaBkDurum === "function" ? odaBkDurum().no : null; }, // eslint-disable-line no-undef
    iste: function (b) { return typeof odaModIste === "function" ? odaModIste(b) : Promise.resolve({ ok: false, err: "Panel hazır değil" }); }, // eslint-disable-line no-undef
    iz: function (r, b) { if (typeof odaModIz === "function") odaModIz(r, b); }, // eslint-disable-line no-undef
    ac: function (h) { if (typeof openModal === "function") openModal(h); }, // eslint-disable-line no-undef
    kapat: function () { if (typeof closeModal === "function") closeModal(); }, // eslint-disable-line no-undef
    toast: function (t, k) { if (typeof toast === "function") toast(t, k); }, // eslint-disable-line no-undef
    now: function () { return Date.now(); },
  };
  var E = { g: null, at: 0, v: "", den: 0, kat: false, den2: false, yuk: false, hata: "", sek: 0, bek: 0, cell: {}, acik: false, yer: {} };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  W.__emo = E; // tanı / test
  // stil (bir kez; index.html'e dokunmadan). Düğme mutlak konumlu: satır yerleşimi değişmez.
  var stil = function () { if (!D || !D.head || D.getElementById("emoStil")) return; var s = D.createElement("style"); s.id = "emoStil";
    s.textContent = ".bk2.emxk { display: grid; grid-template-columns: minmax(0, 1fr) 48px; grid-auto-rows: auto; gap: 6px 8px; align-content: start; } .bk2.emxk > .swrow { grid-column: 1 / -1; } .bk2.emxk > .bk2b { min-width: 0; padding: 0 6px; font-size: 13.5px; line-height: 1.15; overflow: hidden; } .bk2.emxk > .emxb { grid-column: 2; width: 48px; min-width: 48px; height: 48px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel2); font-size: 22px; line-height: 1; padding: 0; cursor: pointer; } .emxb[hidden], .emxb.gizli { visibility: hidden; pointer-events: none; }"
      + " .emxo { position: absolute; left: -12%; top: -12%; width: 124%; height: 124%; object-fit: contain; z-index: 7; pointer-events: none; } .emxn { position: absolute; left: 0; right: 0; bottom: -4px; z-index: 8; text-align: center; font: 700 15px/1 system-ui, sans-serif; color: #fff; text-shadow: 0 1px 3px #000; pointer-events: none; }"
      + " .emxp { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 16px; } .emxh { display: flex; align-items: center; justify-content: space-between; min-height: 36px; } .emxh b { font-size: 16px; }"
      + " .emxt { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; min-height: 48px; } .emxtab { flex: none; width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel2); padding: 4px; } .emxtab.on { border-color: var(--accent, #38bdf8); background: color-mix(in srgb, var(--accent, #38bdf8) 18%, var(--panel2)); } .emxtab img { width: 100%; height: 100%; object-fit: contain; display: block; }"
      + " .emxg { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; height: min(150px, 24dvh); overflow-y: auto; overscroll-behavior: contain; align-content: start; } .emxc { aspect-ratio: 1 / 1; border-radius: 10px; border: 1px solid transparent; background: var(--panel2); padding: 2px; cursor: pointer; } .emxc img { width: 100%; height: 100%; object-fit: contain; display: block; } .emxc.git { opacity: .5; } .emxc.oke { border-color: #22c55e; } .emxc.sk { border-color: transparent; background: var(--line); animation: emosk 1s ease-in-out infinite alternate; } @keyframes emosk { from { opacity: .4; } }"
      + " #modal:has(#emoP) { background: transparent !important; pointer-events: none; } #modal:has(#emoP) #modalBox { pointer-events: auto; max-height: 60dvh !important; overflow-y: auto; box-shadow: 0 -6px 24px rgba(0,0,0,.28); } body:has(#emoP) #odaBody { padding-bottom: var(--emxh, 0px); }"
      + " .emxs { min-height: 18px; font-size: 12.5px; color: var(--muted); }"
      + " .emxg > .emxs, .emxg > .b { grid-column: 1 / -1; } .emxg > .b { justify-self: start; }"; /* liste alınamadı kartı: yazı + "Yeniden dene" ızgaranın tek hücresine sıkışmasın, tam satır */
    D.head.appendChild(s); };
  // ---------------- liste: HER ZAMAN bizim kayıttan açılır (kullanıcı 19.11: "güncel bir şey olmadıkça önce her şey bizim sistemimizden açılsın sonra Sugo'yu kontrol eder bize çaktırmadan
  //                  eğer güncel bir şey varsa ekler ve o yeni eklenen de sistemimize girer"). Sıra: telefon önbelleği (anında) → bizim sunucudaki katalog (TEK istek; sürüm aynıysa gövde yok)
  //                  → en son, ARKA PLANDA ve SESSİZ: tabletten Sugo listesi (son denetimden 6 saat geçtiyse / katalog boşsa; hata en erken 1 saat sonra yeniden). Hiçbiri açılışı bekletmez.
  var depoOku = function () { try { return W.localStorage.getItem(ANAHTAR); } catch (e) { return null; } };
  var depoYaz = function () { try { W.localStorage.setItem(ANAHTAR, W.emoOnbellekYaz(E.g, E.at, { v: E.v, den: E.den })); } catch (e) { /* zararsız */ } };
  var denemeOku = function () { try { var n = Number(W.localStorage.getItem(ANAHTAR + "_d")); return n > 0 ? n : 0; } catch (e) { return 0; } };
  var denemeYaz = function (n) { try { W.localStorage.setItem(ANAHTAR + "_d", String(n)); } catch (e) { /* zararsız */ } };
  var listeHazirla = function () { if (E.g) return; var o = W.emoOnbellekOku(depoOku(), dep.now()); if (o) { E.g = o.g; E.at = o.at; E.v = o.v; E.den = o.den; } };
  var adresOf = function (e) { return W.emoAdres(e, dep.now(), false); };
  var hucre = function (e) { var a = adresOf(e); return '<button type="button" class="emxc" data-id="' + e.id + '" title="' + esc(e.ad) + '" aria-label="' + esc(e.ad || "emoji") + '" onclick="emoAt(' + e.id + ')"><img loading="lazy" decoding="async" alt="" src="' + esc(a.src) + '"' + (a.fb ? ' data-f="' + esc(a.fb) + '"' : "") + ' onerror="emoHata(this)"></button>'; };
  var sekme = function (x, i) { var k = x.kapak ? W.emoAdres(x, dep.now(), true) : null; return '<button type="button" class="emxtab' + (i === E.sek ? " on" : "") + '" role="tab" aria-selected="' + (i === E.sek) + '" aria-label="' + esc(x.ad || "grup") + '" onclick="emoSek(' + i + ')">' + (k && k.src ? '<img loading="lazy" decoding="async" alt="" src="' + esc(k.src) + '"' + (k.fb ? ' data-f="' + esc(k.fb) + '"' : "") + ' onerror="emoHata(this)">' : esc((x.ad || "?").slice(0, 2))) + "</button>"; };
  // bozuk / süresi dolmuş görsel: Sugo adresine düş (bir kez); düşecek yer yoksa gizle (bozuk resim görünmesin)
  W.emoHata = function (img) { try { var f = img.getAttribute("data-f"); if (f && img.getAttribute("src") !== f) { img.removeAttribute("data-f"); img.setAttribute("src", f); } else img.style.visibility = "hidden"; } catch (e) { /* zararsız */ } };
  // ---------------- seçici (alt sayfa)
  var govde = function () { var g = E.g;
    if (!g) return E.hata ? '<div class="emxs" style="color:var(--bad)">' + esc(E.hata) + '</div><button type="button" class="b" onclick="emoYenile()">Yeniden dene</button>' : "";
    var x = g[Math.min(E.sek, g.length - 1)]; return x.emo.map(hucre).join(""); };
  var sekmeler = function () { var g = E.g; if (!g) return ""; return g.map(sekme).join(""); };
  var iskelet = function () { var h = ""; for (var i = 0; i < 24; i++) h += '<span class="emxc sk"></span>'; return h; };
  var cerceve = function () { return '<div class="emxp" id="emoP"><div class="emxh"><b>😊 Emoji at</b><button type="button" class="b" onclick="emoKapat()">Kapat</button></div><div class="emxt" id="emoT" role="tablist">' + sekmeler() + '</div><div class="emxg" id="emoG">' + (E.g ? govde() : E.yuk || !E.hata ? iskelet() : govde()) + '</div><div class="emxs" id="emoS" aria-live="polite">' + (E.g ? "" : E.hata ? "" : "liste hazırlanıyor…") + '</div></div>'; };
  var ciz = function () { if (!E.acik) return; var p = D.getElementById("emoP"); if (!p) return;
    var t = D.getElementById("emoT"), g = D.getElementById("emoG"); if (t) t.innerHTML = sekmeler(); if (g) g.innerHTML = E.g ? govde() : E.yuk || !E.hata ? iskelet() : govde(); };
  var durum = function (m) { var s = D.getElementById("emoS"); if (s && s.textContent !== (m || "")) s.textContent = m || ""; };
  // Açık seçiciye YER KAYDIRMADAN ekleme: yeni emoji ızgaranın SONUNA, yeni grup sekme çubuğunun sonuna eklenir; var olan hücrelere / sekmelere dokunulmaz (değişmeyen yeniden çizilmez)
  var ekleDom = function () { if (!E.acik || !E.g) return; var t = D.getElementById("emoT"), g = D.getElementById("emoG"); if (!g) return;
    if (g.querySelector(".emxc.sk") || g.querySelector(".emxs")) { ciz(); return; } /* iskelet / hata kartı → ilk gerçek dolum (tam çizim: kullanıcı henüz bir şeye bakmıyor) */
    if (t) { var n = t.querySelectorAll(".emxtab").length; if (E.g.length > n) { var h = ""; for (var i = n; i < E.g.length; i++) h += sekme(E.g[i], i); t.insertAdjacentHTML("beforeend", h); } }
    var x = E.g[Math.min(E.sek, E.g.length - 1)]; if (!x) return; var H = ""; x.emo.forEach(function (e) { if (!g.querySelector('[data-id="' + e.id + '"]')) H += hucre(e); }); if (H) g.insertAdjacentHTML("beforeend", H); };
  var aktifTag = function () { return E.g && E.g[Math.min(E.sek, E.g.length - 1)] ? E.g[Math.min(E.sek, E.g.length - 1)].tag : null; };
  /** gelen listeyi (bizim katalog ya da Sugo) mevcutla birleştir; kullanıcının baktığı grup / satır değişmez */
  var uygula = function (gelen) { var tag = aktifTag(), ilk = !E.g, o = W.emoBirlestir(E.g || [], gelen); if (!o.g.length) return false;
    if (!ilk && !o.degisti) return false;
    E.g = o.g; if (tag != null) { for (var i = 0; i < E.g.length; i++) if (E.g[i].tag === tag) E.sek = i; } else E.sek = 0; E.at = dep.now();
    if (ilk) { ciz(); durum(""); } else ekleDom(); depoYaz(); return true; };
  // 1) bizim sunucudaki katalog: TEK istek; sürüm aynıysa gövde gelmez. Hata sessiz (iz kaydı), seçici etkilenmez.
  var katalogOku = async function () { if (E.kat) return; E.kat = true;
    try { var r = await dep.api("emoji_katalog_get", E.v ? { v: E.v } : {});
      if (!r || r.error) { sessizHata("Katalog okunamadı: " + String((r && r.error) || "cevap yok").slice(0, 120)); return; }
      if (r.v) E.v = String(r.v).slice(0, 40); if (r.den != null) E.den = Math.max(E.den || 0, Number(r.den) || 0);
      if (!r.ayni && Array.isArray(r.g)) uygula(r.g); else depoYaz();
    } catch (e) { sessizHata("Katalog okunamadı"); } finally { E.kat = false; } };
  // hata yalnız iz kaydına (web_audit: room_mod_sonuc) düşer; ekranda hiçbir şey değişmez
  var sessizHata = function (m) { try { dep.iz({ ok: false, err: String(m).slice(0, 160), id: "emo-den-" + dep.now().toString(36), room: dep.oda() }, { kind: "emojiler" }); } catch (e) { /* zararsız */ } };
  // 2) Sugo denetimi (tablet): arka planda ve sessiz; yeni / değişen varsa kayda eklenir ve bizim sunucuya yazılır (görseli orada indirilir)
  var sugoDenetim = async function () { if (E.yuk || E.den2) return; E.den2 = true; var bosti = W.emoBosMu(E.g);
    try { var r; try { r = await dep.iste({ kind: "emojiler" }); } catch (e) { r = { ok: false, err: "Bağlantı yok" }; }
      var g = r && r.ok && r.data ? W.emoListeTemiz(r.data.g) : [];
      if (!g.length) { denemeYaz(dep.now()); if (bosti) { E.hata = String((r && r.err) || "Emoji listesi alınamadı").slice(0, 160); ciz(); durum(""); } else sessizHata("Sugo denetimi: " + String((r && r.err) || "liste gelmedi").slice(0, 120)); return; }
      denemeYaz(0); E.den = Math.floor(dep.now() / 1000); E.hata = ""; uygula(g); depoYaz();
      dep.api("emoji_katalog_yaz", { g: g }).catch(function () { /* sessiz: bir sonraki denetimde yeniden */ });
    } catch (e) { sessizHata("Sugo denetimi başarısız"); } finally { E.den2 = false; } };
  /** elle "yenile" (hata kartındaki Yeniden dene): zorla, görünür */
  var listeIste = async function (zorla) { if (E.yuk) return; E.yuk = true; E.hata = ""; ciz();
    var r; try { r = await dep.iste(zorla ? { kind: "emojiler", zorla: true } : { kind: "emojiler" }); } catch (e) { r = { ok: false, err: "Bağlantı yok" }; }
    E.yuk = false; var g = r && r.ok && r.data ? W.emoListeTemiz(r.data.g) : [];
    if (g.length) { E.den = Math.floor(dep.now() / 1000); if (!E.g) { E.g = g; E.sek = 0; E.at = dep.now(); depoYaz(); } else uygula(g); dep.api("emoji_katalog_yaz", { g: g }).catch(function () { /* sessiz */ }); }
    else E.hata = String((r && r.err) || "Emoji listesi alınamadı").slice(0, 160);
    ciz(); };
  var acilis = async function () { var yeni = !E.g; await katalogOku();
    if (W.emoDenetimGerek({ now: dep.now(), bos: W.emoBosMu(E.g), den: E.den, sonDeneme: denemeOku() })) sugoDenetim(); else if (yeni && !E.g) { E.hata = "Emoji listesi şu an alınamadı: biraz sonra yeniden denenir"; ciz(); durum(""); } };
  // Seçici açıkken Selçuk'un koltuğu seçicinin ÜSTÜNDE görünür kalır (kullanıcı 19.11: "Emoji attığında koltuğun görünsün ki emojiyi görebilelim"): arka örtü saydam (CSS :has(#emoP)),
  // seçici alçak (ızgara sabit yükseklik, kendi içinde kayar), oda kaydırma alanı koltuğun altı (emoji bindirmesi payıyla) seçicinin üst kenarının üstüne gelene kadar kaydırılır;
  // kapanınca kaydırma eski yerine döner. Kaydırma için gereken boşluk geçici alt dolgu (--emxh) ile verilir.
  var kaydirilan = function (el) { for (var n = el && el.parentElement; n && n !== D.body; n = n.parentElement) { var o = W.getComputedStyle(n).overflowY; if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight - 1) return n; } return null; };
  var koltukHucre = function () { var no = dep.koltukNo(); if (no == null) return null; return D.querySelector('#odaBody .oseats > [data-no="' + no + '"]'); };
  var yerlestir = function () { try { var kutu = D.getElementById("modalBox"), h = koltukHucre(); if (!kutu || !h) return; var sc = kaydirilan(h); if (!sc) return;
    var yuk = Math.ceil(kutu.getBoundingClientRect().height); if (!E.kay) E.kay = { sc: sc, top: sc.scrollTop };
    D.documentElement.style.setProperty("--emxh", yuk + "px");
    var ust = kutu.getBoundingClientRect().top, r = h.getBoundingClientRect(), alt = r.bottom + r.height * 0.12 + 8, fark = alt - ust;
    if (fark > 0) { var tavan = sc.scrollHeight - sc.clientHeight; sc.scrollTop = Math.min(tavan, sc.scrollTop + fark); } } catch (e) { /* kaydırma yapılamadı: zararsız */ } };
  var geriKaydir = function () { if (E.gozlem) { E.gozlem.disconnect(); E.gozlem = null; } var k = E.kay; E.kay = null; D.documentElement.style.removeProperty("--emxh"); if (k) { try { k.sc.scrollTop = k.top; } catch (e) { /* zararsız */ } } E.acik = false; };
  W.odaEmojiAc = function () { if (!dep.sahip() || !dep.koltuk()) return; stil(); listeHazirla(); E.acik = true; dep.ac(cerceve());
    var kutu = D.getElementById("modalBox"); if (kutu && W.MutationObserver) { if (E.gozlem) E.gozlem.disconnect(); E.gozlem = new W.MutationObserver(function () { if (!D.getElementById("emoP")) geriKaydir(); }); E.gozlem.observe(kutu, { childList: true }); }
    yerlestir(); if (W.requestAnimationFrame) W.requestAnimationFrame(yerlestir);
    acilis(); };
  W.emoKapat = function () { dep.kapat(); geriKaydir(); };
  W.emoSek = function (i) { if (!E.g || !(i >= 0 && i < E.g.length)) return; E.sek = i; ciz(); };
  W.emoYenile = function () { listeIste(true); };
  // Art arda gönderim serbest (kullanıcı 19.11: "1.5 saniye sınırını kaldır"): düğme kilitlenmez; her gönderim kendi sayaç / kimliğiyle izlenir, sonuçlar birbirine yazılmaz
  W.emoAt = async function (id) { if (!dep.sahip()) return; id = Number(id);
    if (!dep.koltuk()) { dep.toast("😊 Selçuk koltukta değil: emoji atılmadı", "warn"); return; }
    var c = D.querySelector('#emoG [data-id="' + id + '"]'); E.bek++; E.cell[id] = (E.cell[id] || 0) + 1; if (c && !c.classList.contains("git")) c.classList.add("git"); if (E.bek === 1) durum("gönderiliyor…");
    var body = { kind: "emoji", emo: id }, r; try { r = await dep.iste(body); } catch (e) { r = { ok: false, err: "Bağlantı yok" }; }
    E.bek = Math.max(0, E.bek - 1); var c2 = D.querySelector('#emoG [data-id="' + id + '"]'); E.cell[id] = Math.max(0, (E.cell[id] || 1) - 1);
    if (c2 && !E.cell[id] && c2.classList.contains("git")) c2.classList.remove("git"); if (!E.bek) durum("");
    try { dep.iz(r, { kind: "emoji", emo: id }); } catch (e) { /* iz yazılamadı: zararsız */ }
    if (r && r.ok === true) yerelOynat(id); /* yalnız "ok" (depoda görüldü); "belirsiz" / hata: olmamış şeyi göstermeyiz — olay gelirse zaten oynar */
    var u = W.emoSonucUyari(r); if (u) dep.toast(u.metin, u.tur || ""); else if (c2) { c2.classList.add("oke"); setTimeout(function () { c2.classList.remove("oke"); }, 500); } };
  // ---------------- 😊 düğmesi: odaBkApply her çizişte satırı yeniden yazabilir → her seferinde yeniden bağlanır (yer mutlak konumlu: kayma yok)
  // Yer: bas-konuş kutusunun (.bk2) düğme satırında, bas-konuş düğmesinin SAĞINDA (kullanıcı 19.11: "Basılı tut konuş butonunu kısa tutup aynı satıra emoji gonderme butonunu koyabilirsin").
  // baskonus.js'e dokunulmaz: .bk2 kutusu CSS ızgarasına çevrilir (sınıf emxk), 😊 düğmesi kutunun KARDEŞ öğesi olarak eklenir; bas-konuş düğmesi yerinden oynamaz (basılı durum / olaylar etkilenmez).
  // Yer baştan ayrılı: düğme koltukta değilken de yerinde durur (visibility), bas-konuş düğmesinin genişliği değişmez. .bk2 yoksa (bileşen yüklenmedi) 😊 düğmesi hiç çizilmez.
  W.odaEmojiApply = function (b) { try {
    if (!b || !D) return; var kutu = b.nextElementSibling && b.nextElementSibling.classList.contains("bk2") ? b.nextElementSibling : null, sah = dep.sahip(), d = kutu && kutu.querySelector(":scope > .emxb");
    if (!sah || !kutu) { if (d) d.remove(); if (kutu && kutu.classList.contains("emxk")) kutu.classList.remove("emxk"); return; }
    stil(); if (!kutu.classList.contains("emxk")) kutu.classList.add("emxk");
    if (!d) { d = D.createElement("button"); d.type = "button"; d.className = "emxb"; d.textContent = "😊"; d.setAttribute("aria-label", "Emoji at"); d.title = "Emoji at"; d.onclick = function () { W.odaEmojiAc(); }; kutu.appendChild(d); }
    var gor = !!dep.koltuk(); /* değişmeyen yeniden yazılmaz (aynı değeri yazmak bile gözlemciye değişiklik sayılır) */ if (d.classList.contains("gizli") === gor) d.classList.toggle("gizli", !gor);
    var ti = gor ? "0" : "-1", ah = String(!gor); if (d.getAttribute("tabindex") !== ti) d.setAttribute("tabindex", ti); if (d.getAttribute("aria-hidden") !== ah) d.setAttribute("aria-hidden", ah); } catch (e) { /* düğme çizilemedi: zararsız */ } };
  // ---------------- 👀 koltuk üstünde emoji
  var temizle = function (uid) { var y = E.yer[uid]; if (!y) return; clearTimeout(y.t); delete E.yer[uid]; if (y.el && y.el.parentNode) y.el.parentNode.removeChild(y.el); if (y.n && y.n.parentNode) y.n.parentNode.removeChild(y.n); };
  var koltukBul = function (uid) { var box = D.getElementById("odaBody"), g = box && box.querySelector(":scope > .oseats"); if (!g) return null;
    for (var i = 0; i < g.children.length; i++) { var c = g.children[i]; if ((c.dataset.u || "") === uid) return c.querySelector(".ovbox") || c.querySelector(".avw"); } return null; };
  var oynat = function (o) { var host = koltukBul(o.uid); if (!host) return; stil(); temizle(o.uid); var plan = W.emoPlan(o), i = 0, y = (E.yer[o.uid] = { t: 0, el: null, n: null });
    var el = D.createElement("img"); el.className = "emxo"; el.alt = ""; el.decoding = "async"; el.setAttribute("aria-hidden", "true"); if (o.gifFb) el.onerror = function () { if (el.getAttribute("src") !== o.gifFb) el.setAttribute("src", o.gifFb); }; /* bizim dosya açılmazsa Sugo adresi */ host.appendChild(el); y.el = el;
    var adim = function () { if (E.yer[o.uid] !== y) return; if (i >= plan.length) { temizle(o.uid); return; } var s = plan[i++]; if (el.getAttribute("src") !== s.src) el.src = s.src;
      if (y.n && y.n.parentNode) y.n.parentNode.removeChild(y.n); y.n = null; if (s.sayi != null) { var n = D.createElement("span"); n.className = "emxn"; n.textContent = String(s.sayi); host.appendChild(n); y.n = n; }
      y.t = setTimeout(adim, s.ms); };
    adim(); };
  // Kendi emojin: tabletten "room_spk" {e} olayı (konuşan döngüsü ~250 ms + iletim) kendi koltuğunu da kapsar; "ok" cevabı ondan ÖNCE de SONRA da gelebilir → ikisi (uid + emoji kimliği, 4 sn pencere) tek oynatılır.
  // Yerel oynatma yalnız "ok"ta; olayda sonuç görseli (zar / çark) varsa o daha zengin olduğu için yerel oynatmanın yerine geçer.
  // olay görseli: katalogda bizdeki dosyası varsa o (Sugo'ya gitmez), yoksa olaydaki Sugo adresi
  var katalogAdres = function (id) { if (!E.g) listeHazirla(); var r = null; (E.g || []).forEach(function (g) { g.emo.forEach(function (e) { if (e.id === id) r = e; }); }); if (!r) return null; var a = adresOf(r); return a.fb ? a.src : null; };
  var TEKIL_MS = 4000;
  var tekil = function (uid, id, kaynak, zengin, now) { var L = E.son || (E.son = []), i;
    for (i = L.length - 1; i >= 0; i--) if (now - L[i].t > TEKIL_MS) L.splice(i, 1);
    for (i = 0; i < L.length; i++) { var x = L[i]; if (x.uid === uid && x.id === id && x.kaynak !== kaynak && !x.alindi) { x.alindi = true; return !!zengin && kaynak === "olay"; } }
    L.push({ uid: uid, id: id, kaynak: kaynak, t: now, alindi: false }); if (L.length > 40) L.shift(); return true; };
  var yerelOynat = function (id) { try { var h = koltukHucre(), uid = h && h.dataset.u; if (!uid) return; var e = null; (E.g || []).forEach(function (g) { g.emo.forEach(function (x) { if (x.id === id) e = x; }); }); if (!e) return;
    if (!tekil(String(uid), id, "yerel", false, dep.now())) return; var a = adresOf(e); oynat({ uid: String(uid), id: id, ad: e.ad, tur: e.tur, gif: a.src, gifFb: a.fb, sure_ms: 3000 }); } catch (x) { /* gösterge: zararsız */ } };
  W.odaEmojiAl = function (pl) { try { var L = W.emoOlaylar(pl, dep.oda()); for (var i = 0; i < L.length; i++) { var o = L[i]; if (tekil(o.uid, o.id, "olay", !!o.sonuc, dep.now())) { var k = katalogAdres(o.id); if (k) { o.gifFb = o.gif; o.gif = k; } oynat(o); } } } catch (e) { /* gösterge: zararsız */ } };
})();
