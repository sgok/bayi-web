// 😊 Koltuk emojileri — panel tarafı (19.11.2026). Sahip: "ayrıca gülümseme emojileri atılabiliyor mikrofondayken onları hem görebileyim hem atabileyim onları da çek sugodan".
// GÖRME: tablet (room_cap.js ⟦emoji⟧ __reAl, hızlı kipte 250 ms'lik mevcut turda) Sugo deposundaki YENİ koltuk emojilerini mevcut "room_spk" paketine "e" dizisi olarak koyar
//   (sinyal sunucusu → panel; veritabanı / Supabase çağrısı YOK). odaSpkSet bunu odaEmojiAl'a verir; emoji, atan kişinin koltuk resminin ÜSTÜNE bindirilir (yerinde: ızgara yeniden
//   çizilmez, yerleşim kaymaz). Aynı kişiye sıradaki emoji öncekinin yerine geçer. Tür 2 / 3'te önce gif, sonra sonuç görseli (+ sayı).
// ATMA: Oda sekmesinde "Selçuk mikrofonda" satırının sağ ucunda 😊 düğmesi (yalnız sahip; Selçuk koltukta değilken görünmez ama yeri ayrılı). Alt sayfada emoji seçici: üstte grup sekmeleri
//   (kapak resmi), altında 8'li ızgara; dokununca hemen gönderilir ve seçici AÇIK kalır. Liste Sugo'dan tablet aracılığıyla ("emojiler") gelir; bu telefonda 24 saat saklanır (localStorage):
//   seçici önce önbellekten ANINDA çizilir, önbellek yoksa iskelet + istek. Sonuç: "belirsiz" ve hata açıkça yazılır (üst uyarı); başarıda emoji koltukta görünür.
// Bağlama (web/index.html): <script src="odaemoji.js"></script> · odaBkApply sonunda `if (window.odaEmojiApply) odaEmojiApply(b);` · odaSpkSet başında `pl.e` yönlendirmesi.
// ⟦emoSaf⟧ saf işlevler (tests/oda_emoji_web_test.ts ayrı çalıştırır; sayfaya dokunmaz)
window.EMO_ONBELLEK_MS = 24 * 3600_000; window.EMO_SUTUN = 8; window.EMO_ARALIK = 1500;
/** yalnız https görsel adresi (http → https; başka şema yok) */
window.emoUrl = function (u) { u = String(u == null ? "" : u).slice(0, 300); if (!/^https?:\/\/[^\s"'<>]+$/.test(u)) return ""; return u.replace(/^http:\/\//, "https://"); };
/** tabletten gelen / saklanan liste → temiz liste (grup ≤ 12, grup başına ≤ 80); biçimsiz öğe atılır */
window.emoListeTemiz = function (g) { var out = [];
  (Array.isArray(g) ? g : []).slice(0, 12).forEach(function (x) { if (!x || typeof x !== "object") return; var L = [];
    (Array.isArray(x.emo) ? x.emo : []).slice(0, 80).forEach(function (e) { if (!e || typeof e !== "object") return; var id = Number(e.id), gif = window.emoUrl(e.gif);
      if (!(Number.isInteger(id) && id >= 1 && id <= 999999) || !gif) return; var t = Number(e.tur);
      L.push({ id: id, ad: String(e.ad || "").slice(0, 40), tur: t === 2 || t === 3 ? t : 1, gif: gif }); });
    if (L.length) out.push({ tag: Number(x.tag) || 0, ad: String(x.ad || "").slice(0, 30), kapak: window.emoUrl(x.kapak), emo: L }); });
  return out; };
/** saklı metin → liste ya da null (24 saatten eski / bozuk / boş) */
window.emoOnbellekOku = function (txt, now) { try { var o = JSON.parse(String(txt || "null")); if (!o || typeof o !== "object") return null; var at = Number(o.at);
  if (!(at > 0) || now - at >= window.EMO_ONBELLEK_MS || at - now > 3600_000) return null; var g = window.emoListeTemiz(o.g); return g.length ? { at: at, g: g } : null; } catch (e) { return null; } };
window.emoOnbellekYaz = function (g, now) { return JSON.stringify({ at: now, g: window.emoListeTemiz(g) }); };
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
/** art arda gönderim: son gönderimden bu yana en az EMO_ARALIK geçti mi */
window.emoAralikTamam = function (son, now) { return !son || now - son >= window.EMO_ARALIK; };
// ⟦/emoSaf⟧
(function () {
  var W = window; if (W.__emoKur) return; W.__emoKur = 1;
  var D = W.document, ANAHTAR = "bw_oemo";
  // bağımlılıklar: index.html'in genel adları (testte W.__emoDep ile verilir)
  var dep = W.__emoDep || {
    sahip: function () { return typeof yonOk === "function" && !!yonOk(); }, // eslint-disable-line no-undef
    oda: function () { return typeof odaData !== "undefined" && odaData && odaData.room ? String(odaData.room.id) : ""; }, // eslint-disable-line no-undef
    koltuk: function () { return typeof odaBkDurum === "function" && !!odaBkDurum().koltuk; }, // eslint-disable-line no-undef
    iste: function (b) { return typeof odaModIste === "function" ? odaModIste(b) : Promise.resolve({ ok: false, err: "Panel hazır değil" }); }, // eslint-disable-line no-undef
    iz: function (r, b) { if (typeof odaModIz === "function") odaModIz(r, b); }, // eslint-disable-line no-undef
    ac: function (h) { if (typeof openModal === "function") openModal(h); }, // eslint-disable-line no-undef
    kapat: function () { if (typeof closeModal === "function") closeModal(); }, // eslint-disable-line no-undef
    toast: function (t, k) { if (typeof toast === "function") toast(t, k); }, // eslint-disable-line no-undef
    now: function () { return Date.now(); },
  };
  var E = { g: null, at: 0, yuk: false, hata: "", sek: 0, gid: false, son: 0, acik: false, yer: {} };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  W.__emo = E; // tanı / test
  // stil (bir kez; index.html'e dokunmadan). Düğme mutlak konumlu: satır yerleşimi değişmez.
  var stil = function () { if (!D || !D.head || D.getElementById("emoStil")) return; var s = D.createElement("style"); s.id = "emoStil";
    s.textContent = ".obkr { position: relative; } .obkr .swrow .st { padding-right: 44px; } .emxb { position: absolute; right: 66px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line); background: var(--panel2); font-size: 20px; line-height: 1; padding: 0; cursor: pointer; z-index: 2; } .emxb[hidden], .emxb.gizli { visibility: hidden; pointer-events: none; }"
      + " .emxo { position: absolute; left: -12%; top: -12%; width: 124%; height: 124%; object-fit: contain; z-index: 7; pointer-events: none; } .emxn { position: absolute; left: 0; right: 0; bottom: -4px; z-index: 8; text-align: center; font: 700 15px/1 system-ui, sans-serif; color: #fff; text-shadow: 0 1px 3px #000; pointer-events: none; }"
      + " .emxp { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 16px; } .emxh { display: flex; align-items: center; justify-content: space-between; min-height: 36px; } .emxh b { font-size: 16px; }"
      + " .emxt { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; min-height: 48px; } .emxtab { flex: none; width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--line); background: var(--panel2); padding: 4px; } .emxtab.on { border-color: var(--accent, #38bdf8); background: color-mix(in srgb, var(--accent, #38bdf8) 18%, var(--panel2)); } .emxtab img { width: 100%; height: 100%; object-fit: contain; display: block; }"
      + " .emxg { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; min-height: 200px; max-height: 46vh; overflow-y: auto; align-content: start; } .emxc { aspect-ratio: 1 / 1; border-radius: 10px; border: 1px solid transparent; background: var(--panel2); padding: 2px; cursor: pointer; } .emxc img { width: 100%; height: 100%; object-fit: contain; display: block; } .emxc.git { opacity: .5; } .emxc.oke { border-color: #22c55e; } .emxc.sk { border-color: transparent; background: var(--line); animation: emosk 1s ease-in-out infinite alternate; } @keyframes emosk { from { opacity: .4; } }"
      + " .emxs { min-height: 18px; font-size: 12.5px; color: var(--muted); }";
    D.head.appendChild(s); };
  // ---------------- liste önbelleği
  var depoOku = function () { try { return W.localStorage.getItem(ANAHTAR); } catch (e) { return null; } };
  var depoYaz = function (g, now) { try { W.localStorage.setItem(ANAHTAR, W.emoOnbellekYaz(g, now)); } catch (e) { /* zararsız */ } };
  var listeHazirla = function () { if (E.g) return; var o = W.emoOnbellekOku(depoOku(), dep.now()); if (o) { E.g = o.g; E.at = o.at; } };
  var listeIste = async function (zorla) { if (E.yuk) return; E.yuk = true; E.hata = ""; ciz();
    var r; try { r = await dep.iste(zorla ? { kind: "emojiler", zorla: true } : { kind: "emojiler" }); } catch (e) { r = { ok: false, err: "Bağlantı yok" }; }
    E.yuk = false; var g = r && r.ok && r.data ? W.emoListeTemiz(r.data.g) : [];
    if (g.length) { E.g = g; E.at = dep.now(); if (E.sek >= g.length) E.sek = 0; depoYaz(g, E.at); } else E.hata = String((r && r.err) || "Emoji listesi alınamadı").slice(0, 160);
    ciz(); };
  // ---------------- seçici (alt sayfa)
  var govde = function () { var g = E.g;
    if (!g) return E.hata ? '<div class="emxs" style="color:var(--bad)">' + esc(E.hata) + '</div><button type="button" class="b" onclick="emoYenile()">Yeniden dene</button>' : "";
    var x = g[Math.min(E.sek, g.length - 1)];
    return x.emo.map(function (e) { return '<button type="button" class="emxc" data-id="' + e.id + '" title="' + esc(e.ad) + '" aria-label="' + esc(e.ad || "emoji") + '" onclick="emoAt(' + e.id + ')"><img loading="lazy" decoding="async" alt="" src="' + esc(e.gif) + '"></button>'; }).join(""); };
  var sekmeler = function () { var g = E.g; if (!g) return ""; return g.map(function (x, i) { return '<button type="button" class="emxtab' + (i === E.sek ? " on" : "") + '" role="tab" aria-selected="' + (i === E.sek) + '" aria-label="' + esc(x.ad || "grup") + '" onclick="emoSek(' + i + ')">' + (x.kapak ? '<img loading="lazy" decoding="async" alt="" src="' + esc(x.kapak) + '">' : esc((x.ad || "?").slice(0, 2))) + "</button>"; }).join(""); };
  var iskelet = function () { var h = ""; for (var i = 0; i < 24; i++) h += '<span class="emxc sk"></span>'; return h; };
  var cerceve = function () { return '<div class="emxp" id="emoP"><div class="emxh"><b>😊 Emoji at</b><button type="button" class="b" onclick="emoKapat()">Kapat</button></div><div class="emxt" id="emoT" role="tablist">' + sekmeler() + '</div><div class="emxg" id="emoG">' + (E.g ? govde() : E.yuk || !E.hata ? iskelet() : govde()) + '</div><div class="emxs" id="emoS" aria-live="polite"></div></div>'; };
  var ciz = function () { if (!E.acik) return; var p = D.getElementById("emoP"); if (!p) return;
    var t = D.getElementById("emoT"), g = D.getElementById("emoG"); if (t) t.innerHTML = sekmeler(); if (g) g.innerHTML = E.g ? govde() : E.yuk || !E.hata ? iskelet() : govde(); };
  var durum = function (m) { var s = D.getElementById("emoS"); if (s) s.textContent = m || ""; };
  W.odaEmojiAc = function () { if (!dep.sahip() || !dep.koltuk()) return; stil(); listeHazirla(); E.acik = true; dep.ac(cerceve()); if (!E.g) listeIste(false); else if (dep.now() - E.at > 6 * 3600_000) listeIste(false); };
  W.emoKapat = function () { E.acik = false; dep.kapat(); };
  W.emoSek = function (i) { if (!E.g || !(i >= 0 && i < E.g.length)) return; E.sek = i; ciz(); };
  W.emoYenile = function () { listeIste(true); };
  W.emoAt = async function (id) { if (E.gid || !dep.sahip()) return; id = Number(id);
    if (!dep.koltuk()) { dep.toast("😊 Selçuk koltukta değil: emoji atılmadı", "warn"); return; }
    if (!W.emoAralikTamam(E.son, dep.now())) { durum("Emojiler arası en az 1,5 sn"); return; }
    var c = D.querySelector('#emoG [data-id="' + id + '"]'); E.gid = true; E.son = dep.now(); if (c) c.classList.add("git"); durum("gönderiliyor…");
    var body = { kind: "emoji", emo: id }, r; try { r = await dep.iste(body); } catch (e) { r = { ok: false, err: "Bağlantı yok" }; }
    E.gid = false; E.son = dep.now(); if (c) c.classList.remove("git"); durum("");
    try { dep.iz(r, { kind: "emoji", emo: id }); } catch (e) { /* iz yazılamadı: zararsız */ }
    var u = W.emoSonucUyari(r); if (u) dep.toast(u.metin, u.tur || ""); else if (c) { c.classList.add("oke"); setTimeout(function () { c.classList.remove("oke"); }, 500); } };
  // ---------------- 😊 düğmesi: odaBkApply her çizişte satırı yeniden yazabilir → her seferinde yeniden bağlanır (yer mutlak konumlu: kayma yok)
  W.odaEmojiApply = function (b) { try {
    if (!b || !D) return; var sah = dep.sahip(), d = b.querySelector(".emxb");
    if (!sah) { if (d) d.remove(); return; }
    stil(); if (!d) { d = D.createElement("button"); d.type = "button"; d.className = "emxb"; d.textContent = "😊"; d.setAttribute("aria-label", "Emoji at"); d.title = "Emoji at"; d.onclick = function () { W.odaEmojiAc(); }; b.appendChild(d); }
    var gor = !!dep.koltuk(); /* değişmeyen yeniden yazılmaz (aynı değeri yazmak bile gözlemciye değişiklik sayılır) */ if (d.classList.contains("gizli") === gor) d.classList.toggle("gizli", !gor);
    var ti = gor ? "0" : "-1", ah = String(!gor); if (d.getAttribute("tabindex") !== ti) d.setAttribute("tabindex", ti); if (d.getAttribute("aria-hidden") !== ah) d.setAttribute("aria-hidden", ah); } catch (e) { /* düğme çizilemedi: zararsız */ } };
  // ---------------- 👀 koltuk üstünde emoji
  var temizle = function (uid) { var y = E.yer[uid]; if (!y) return; clearTimeout(y.t); delete E.yer[uid]; if (y.el && y.el.parentNode) y.el.parentNode.removeChild(y.el); if (y.n && y.n.parentNode) y.n.parentNode.removeChild(y.n); };
  var koltukBul = function (uid) { var box = D.getElementById("odaBody"), g = box && box.querySelector(":scope > .oseats"); if (!g) return null;
    for (var i = 0; i < g.children.length; i++) { var c = g.children[i]; if ((c.dataset.u || "") === uid) return c.querySelector(".ovbox") || c.querySelector(".avw"); } return null; };
  var oynat = function (o) { var host = koltukBul(o.uid); if (!host) return; stil(); temizle(o.uid); var plan = W.emoPlan(o), i = 0, y = (E.yer[o.uid] = { t: 0, el: null, n: null });
    var el = D.createElement("img"); el.className = "emxo"; el.alt = ""; el.decoding = "async"; el.setAttribute("aria-hidden", "true"); host.appendChild(el); y.el = el;
    var adim = function () { if (E.yer[o.uid] !== y) return; if (i >= plan.length) { temizle(o.uid); return; } var s = plan[i++]; if (el.getAttribute("src") !== s.src) el.src = s.src;
      if (y.n && y.n.parentNode) y.n.parentNode.removeChild(y.n); y.n = null; if (s.sayi != null) { var n = D.createElement("span"); n.className = "emxn"; n.textContent = String(s.sayi); host.appendChild(n); y.n = n; }
      y.t = setTimeout(adim, s.ms); };
    adim(); };
  W.odaEmojiAl = function (pl) { try { var L = W.emoOlaylar(pl, dep.oda()); for (var i = 0; i < L.length; i++) oynat(L[i]); } catch (e) { /* gösterge: zararsız */ } };
})();
