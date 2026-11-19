// 🎙️ Bas-konuş AŞAMA 2 — panel tarafı (19.11.2026). Sahip: "selçuk hesabını mikrofona oturtabilme ve ses açarak konuşturabilme ama bas konuş şeklinde olsun
// mikrofon olayı bastığım sürece sesim gitsin herkese bırakınca kesilsin." KESİN kural: "evet mikrofonu kesmek çok önemli onu kesin kural olarak koy".
// Yol: bu telefonun mikrofonu (yalnız düğme BASILIYKEN) → 16 kHz µ-law, 40 ms'lik parça → var olan anlık bağlantı (Contabo sugo-sinyal, "realtime:oda-ses"
// konusu, olay "bk") → tablet Java OdaSes → oda sayfası room_mik.js __rmBk (süreli kapı; koltuktayken) → Sugo'nun yayınladığı sahte mikrofon akışı.
// Parçanın kendisi NABIZDIR; bırakınca "bk_birak". Bırakılmış sayılır: parmak kalkınca / düğmeden kayınca / dokunuş iptal olunca, tuş bırakılınca,
// pencere odağı gidince, sekme gizlenince / ekran kilitlenince, sayfa kapanınca, bağlantı kopunca, 60 sn dolunca. Ses hiçbir yere YAZILMAZ.
// Yalnız Ajans sahibi (sunucu da denetler), yalnız Selçuk koltuktayken, yalnız birincil yolda (Supabase yedeğinde ses yok). PIN yok (coin çıkışı değil).
// Gerçek iPhone'da denenmediği için ANAHTARIN ARKASINDA, varsayılan KAPALI. 🔐 Anahtarın TEK gerçeği sinyal sunucusunda ("bk_ayar"; yalnız sahip yazar, yoksa
// KAPALI); buradaki "bw_bk2" yalnız görüntü önbelleği (karar değil): sunucudan durum gelmeden düğme pasif. Mikrofon izni yalnız ilk basışta istenir; reddedilirse kart.
// Konuşurken panelde oda dinlemesi kısılır (yankı olmasın). Telefon mikrofonu son bırakıştan 20 sn sonra kapatılır (iOS turuncu nokta sönsün).
// Gecikme ÖLÇÜLÜR: tablet her ~250 ms'de "bk_durum" ile panel → sunucu, sunucu → tablet, tablet tamponu ve toplamı (sunucu saatiyle) bildirir.
// Bağlama (web/index.html): <script src="baskonus.js"></script> ve odaBkApply sonunda `if (window.bk2Apply) bk2Apply(b);` (b = .obkr satırı).
// ⟦bkSaf⟧ saf işlevler (tests/bas_konus2_test.ts ayrı çalıştırır)
window.bkUlaw = function (x) { // [-1, 1] → G.711 µ-law baytı (tablet __rmUlawCoz çözer)
  var s = Math.round(Math.max(-1, Math.min(1, Number(x) || 0)) * 32767), sign = s < 0 ? 0x80 : 0; if (s < 0) s = -s; if (s > 32635) s = 32635; s += 132;
  var e = 7; for (var m = 0x4000; (s & m) === 0 && e > 0; e--, m >>= 1) { /* üs */ }
  return ~(sign | (e << 4) | ((s >> (e + 3)) & 0x0f)) & 0xff; };
window.bkB64 = function (u) { var s = ""; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.prototype.slice.call(u, i, i + 0x8000)); return btoa(s); };
/** örnekleme düşürme (kutu süzgeci: her çıkış örneği girişteki aralığın ortalaması; yarım kalan aralık st'de taşınır) */
window.bkDusur = function (st, x, srIn, srOut) {
  var adim = srIn / srOut, out = []; if (!(adim >= 1)) adim = 1; st.top = st.top || 0; st.say = st.say || 0; st.poz = st.poz || 0;
  for (var i = 0; i < x.length; i++) { st.top += x[i]; st.say++; st.poz += 1; if (st.poz >= adim) { out.push(st.top / st.say); st.top = 0; st.say = 0; st.poz -= adim; } }
  return out; };
/** ⏱️ "saat" {c, s} → sunucu − panel farkı (en kısa gidiş-dönüşlü son 5 ölçüm; 3 sn'den uzun dönüş sayılmaz) */
window.bkSaatEkle = function (st, c, s, simdi) { var rtt = simdi - c; if (!(c > 0) || !(s > 0) || rtt < 0 || rtt > 3000) return st;
  st.l = (st.l || []).concat([[rtt, s - (c + rtt / 2)]]).slice(-5); var en = st.l.reduce(function (a, b) { return b[0] < a[0] ? b : a; }); st.rtt = en[0]; st.fark = Math.round(en[1]); return st; };
window.bkNedenMetni = function (h) { return ({ kapali: "Bas-konuş anahtarı kapalı: ses gitmedi", yazilamadi: "Ayar sunucuda kaydedilemedi: açılmadı", deger: "Geçersiz ayar", yetki: "Yalnız Ajans sahibi konuşabilir", kaynak_yok: "Tablet bağlı değil (bekleniyor…)", mesgul: "Başka biri konuşuyor", parca: "Ses parçası bozuk",
  koltukta_degil: "Selçuk koltukta değil: ses gitmedi", akis_yok: "Oda sayfası mikrofon akışını açmamış: ses gitmedi", kapi: "Tablet kapıyı açmadı", sayfa_yok: "Tablette oda sayfası yok",
  baglanti: "Bağlantı yok (yedek yolda ses gönderilmez)", izin: "Mikrofon izni yok", mikhata: "Mikrofon açılamadı", hata: "Tablet hatası" })[h] || ("Tablet: " + h); };
/** ölçüm satırı: toplam (panel yakalama → tablette çalma) ve bileşenler; ms → "0,34 sn". Kural ≤ 0,5 sn: aşılırsa ⚠️ ile yazılır. Saat eşitlenmemişse toplam null → "" */
window.BK_GEC_SINIR = 500;
window.bkGecikmeMetni = function (o) { if (!o || o.toplam == null || !(o.toplam >= 0)) return ""; var sn = function (ms) { return (Math.max(0, ms) / 1000).toFixed(2).replace(".", ","); };
  return (o.toplam > window.BK_GEC_SINIR ? "⚠️ " : "") + "gecikme " + sn(o.toplam) + " sn" + (o.toplam > window.BK_GEC_SINIR ? " — 0,5 sn sınırı aşıldı" : "") + (o.g_web != null && o.g_tablet != null && o.tampon != null ? " (panel→sunucu " + sn(o.g_web) + " · →tablet " + sn(o.g_tablet) + " · tampon " + sn(o.tampon) + ")" : ""); };
// ⟦/bkSaf⟧
(function () {
  var W = window; if (W.__bk2Kur) return; W.__bk2Kur = 1;
  var D = W.document, KONU = "realtime:oda-ses", SR = 16000, PARCA = 640 /* 40 ms */, BOS_MS = 20000, EN_COK_MS = 60000, KIS = 0.12, ANAHTAR = "bw_bk2";
  // bağımlılıklar: index.html'in genel adları (testte W.__bkDep ile verilir)
  var dep = W.__bkDep || {
    rt: function () { return typeof rt !== "undefined" ? rt : null; }, // eslint-disable-line no-undef
    os: function () { return typeof os !== "undefined" ? os : null; }, // eslint-disable-line no-undef
    sahip: function () { return typeof odaBkVar === "function" && !!odaBkVar(); }, // eslint-disable-line no-undef
    koltuk: function () { return typeof odaBkDurum === "function" && !!odaBkDurum().koltuk; }, // eslint-disable-line no-undef
    oda: function () { return typeof odaModOda === "function" ? odaModOda() : ""; }, // eslint-disable-line no-undef
    bilet: function () { return typeof sbBiletAl === "function" ? sbBiletAl() : Promise.resolve(null); }, // eslint-disable-line no-undef
    api: function (a, b) { return typeof api === "function" ? api(a, b) : Promise.resolve(null); }, // eslint-disable-line no-undef
    onay: function (o) { return typeof onayKart === "function" ? onayKart(o) : Promise.resolve(false); }, // eslint-disable-line no-undef
    sw: function (id, e, a, on, t) { return typeof swHtml === "function" ? swHtml(id, e, a, on, t) : ""; }, // eslint-disable-line no-undef
    swAyar: function (b, on) { if (typeof swAyar === "function") swAyar(b, on); }, // eslint-disable-line no-undef
    toast: function (t, k) { if (typeof toast === "function") toast(t, k); }, // eslint-disable-line no-undef
  };
  // 🔐 karar YALNIZ sunucudan gelen durumla (bk.ayar === true); önbellek yalnız ilk çizim için (düğmeyi açmaz)
  var anahtarOku = function () { return bk.ayar === true; };
  var onbellek = function () { try { return W.localStorage.getItem(ANAHTAR) === "1"; } catch (e) { return false; } };
  var gorunen = function () { return bk.ayar === null ? onbellek() : bk.ayar; };
  var bk = { ayar: null, ayarBekle: null, asim: 0, olcumYok: 0, ws: null, ok: 0, ref: 0, s: 0, basili: false, bekIzin: false, ctx: null, akis: null, src: null, proc: null, dus: {}, tam: [], saat: { l: [], fark: 0, rtt: -1 }, saatAt: 0,
    son: null, durum: "", basAt: 0, parca: 0, gonderilen: 0, bosT: 0, enCokT: 0, kisilan: null, el: null, izinRed: false, kaliciYok: false, olcum: [], bagli: typeof WeakSet === "function" ? new WeakSet() : null };
  W.__bk2 = bk; // tanı / test (yalnız okuma amaçlı)
  var ayarYaz = function (v) { v = v === true; bk.ayar = v; try { W.localStorage.setItem(ANAHTAR, v ? "1" : "0"); } catch (e) { /* önbellek yazılamadı: zararsız */ }
    if (!v && bk.basili) birak("kapali"); ciz(); };
  var gonder = function (ev, pl) { var ws = dep.rt(); if (!ws || ws.readyState !== 1) return false; try { ws.send(JSON.stringify({ topic: KONU, event: "broadcast", payload: { type: "broadcast", event: ev, payload: pl }, ref: "bk" + (++bk.ref) })); return true; } catch (e) { return false; } };
  var birincil = function () { var ws = dep.rt(); return !!(ws && ws.readyState === 1 && ws.__bir); };
  var kosul = function () { if (!anahtarOku()) return "anahtar"; if (!dep.sahip()) return "yetki"; if (!dep.koltuk()) return "koltukta_degil"; if (!birincil()) return "baglanti"; return ""; };
  // ---- bağlantı: aynı anlık bağlantı (rt), ayrı dinleyici (index.html'e dokunmadan)
  var mesaj = function (ev) { var d = null; try { d = JSON.parse(ev.data); } catch (e) { return; } if (!d || d.topic !== KONU) return; var p = d.payload || {};
    if (d.event === "phx_reply" && String(d.ref || "").indexOf("bkj") === 0) { var r = p.response || {}; bk.ok = p.status === "ok" && r.odases ? 1 : 0;
      if (bk.ok) { if (r.odases.bk === 1 || r.odases.bk === 0) ayarYaz(r.odases.bk === 1); else ayarSor(); saatSor(); } else bk.durum = r.reason === "bilet" ? "izin" : "baglanti"; ciz(); return; }
    if (d.event === "phx_close") { bk.ok = 0; bk.ayar = null; if (bk.basili) birak("baglanti"); ciz(); return; }
    if (d.event !== "broadcast") return; var e2 = p.event, pl = p.payload || {};
    if (e2 === "saat") { bk.saat = W.bkSaatEkle(bk.saat, Number(pl.c), Number(pl.s), Date.now()); return; }
    if (e2 === "bk_ayar_durum") { bk.kaliciYok = pl.acik !== true && pl.kalici === false; ayarYaz(pl.acik === true); return; } // 🔐 kalici:false = kapatma dosyaya yazılamadı
    if (e2 === "bk_ayar_cevap") { if (pl.ok) bk.kaliciYok = pl.acik !== true && pl.kalici === false; if (typeof pl.acik === "boolean") ayarYaz(pl.acik); var bw = bk.ayarBekle; bk.ayarBekle = null; if (bw) bw(pl); return; }
    if (e2 === "bk_durum") { if (pl.ok) { if (bk.saat.rtt < 0 || !(pl.toplam >= 0)) { pl.toplam = null; bk.olcumYok++; } // ⏱️ saat eşitlenmeden ölçülen toplam yanlış olur: yazılmaz
        else { if (pl.toplam > W.BK_GEC_SINIR) bk.asim++; bk.olcum.push(pl.toplam); if (bk.olcum.length > 50) bk.olcum.shift(); }
        bk.son = pl; bk.durum = ""; } else { bk.durum = String(pl.hata || pl.red || "hata"); if (bk.basili && (pl.hata === "yetki" || pl.red === "koltukta_degil")) birak("red"); } ciz(); } };
  var kapandi = function () { bk.ok = 0; bk.ayar = null; if (bk.basili) birak("baglanti"); ciz(); };
  var bagla = function () { var ws = dep.rt(); if (!ws || ws === bk.ws) return; bk.ws = ws; bk.ok = 0;
    if (!(bk.bagli && bk.bagli.has(ws))) { try { ws.addEventListener("message", mesaj); ws.addEventListener("close", kapandi); if (bk.bagli) bk.bagli.add(ws); } catch (e) { /* */ } } };
  var katil = function () { bagla(); var ws = bk.ws; if (bk.ok || !ws || ws.readyState !== 1 || !ws.__bir || bk.katiliyor) return;
    var o = dep.os(); if (o && o.ok && o.ws === ws) { bk.ok = 1; ayarSor(); saatSor(); return; } // oda sesi zaten bu bağlantıda katılmış
    bk.katiliyor = 1; dep.bilet().then(function (b) { bk.katiliyor = 0; if (!b || !b.bilet || ws !== dep.rt() || ws.readyState !== 1) return;
      try { ws.send(JSON.stringify({ topic: KONU, event: "phx_join", payload: { bilet: b.bilet }, ref: "bkj" + (++bk.ref) })); } catch (e) { /* */ } }, function () { bk.katiliyor = 0; }); };
  var ayarSor = function () { gonder("bk_ayar", { sor: 1 }); };
  var saatSor = function () { if (gonder("saat", { c: Date.now() })) bk.saatAt = Date.now(); };
  // ---- mikrofon (yalnız basılıyken parça üretilir)
  var akisKur = function (ms) { var c = bk.ctx; bk.akis = ms; try { bk.src = c.createMediaStreamSource(ms); bk.proc = c.createScriptProcessor(1024, 1, 1); bk.src.connect(bk.proc); bk.proc.connect(c.destination);
      bk.proc.onaudioprocess = isle; } catch (e) { mikKapat(); bk.durum = "hata"; birak("hata"); } };
  // 🎧 iOS: ses oturumu "playback" iken (oda dinlemesi) mikrofon yakalama anında reddedilir → basışta "play-and-record", mikrofon kapanınca geri (W.__bkMik: index.html'in "playback" atamasını atlatır)
  var oturumAl = function () { var as = W.navigator && W.navigator.audioSession; if (!as || bk.otBizim) return; try { bk.otEski = as.type; as.type = "play-and-record"; bk.otBizim = true; W.__bkMik = 1; } catch (e) { /* oturum türü yok / yazılamaz */ } };
  var oturumVer = function () { W.__bkMik = 0; if (!bk.otBizim) return; bk.otBizim = false; var as = W.navigator && W.navigator.audioSession; if (!as) return;
    try { if (as.type === "play-and-record") { var o = dep.os(); as.type = o && o.acik ? "playback" : (bk.otEski || "auto"); } } catch (e) { /* */ } };
  var hataAdi = function (e) { return String((e && e.name) || "Hata").replace(/[^A-Za-z0-9_]/g, "").slice(0, 40) || "Hata"; };
  var mikKapat = function () { clearTimeout(bk.bosT); try { if (bk.proc) { bk.proc.onaudioprocess = null; bk.proc.disconnect(); } } catch (e) { /* */ } try { if (bk.src) bk.src.disconnect(); } catch (e) { /* */ }
    try { if (bk.akis) bk.akis.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* */ } bk.proc = null; bk.src = null; bk.akis = null; bk.dus = {}; bk.tam = []; oturumVer(); };
  var isle = function (e) { if (!bk.basili) { bk.tam = []; return; } var x = e.inputBuffer.getChannelData(0), y = W.bkDusur(bk.dus, x, bk.ctx.sampleRate, SR);
    for (var i = 0; i < y.length; i++) bk.tam.push(y[i]);
    while (bk.tam.length >= PARCA && bk.basili) { var p = bk.tam.splice(0, PARCA), u = new Uint8Array(PARCA); for (var j = 0; j < PARCA; j++) u[j] = W.bkUlaw(p[j]); parcaYolla(u); } };
  var parcaYolla = function (u) { if (bk.el && !bk.el.isConnected) { birak("kopuk"); return; } // düğme belgede değil (Oda sekmesi yeniden çiziliyor / kaldırıldı): parmağın kalktığı olay ona ulaşmamış olabilir → KES
    if (!birincil() || !bk.ok) { birak("baglanti"); return; }
    var t = Date.now() - PARCA * 1000 / SR + (bk.saat.rtt >= 0 ? bk.saat.fark : 0); // parçanın ilk örneğinin yakalanma anı (sunucu saatiyle)
    if (gonder("bk", { s: bk.s++, t: Math.round(t), sr: SR, n: u.length, k: "ulaw", d: W.bkB64(u) })) { bk.parca++; bk.gonderilen++; } else birak("baglanti"); };
  // ---- bas / bırak
  var kis = function (ac) { var o = dep.os(); try { if (ac) { if (o && o.acik && o.gain && o.ctx) { o.gain.gain.setTargetAtTime(KIS, o.ctx.currentTime, 0.02); bk.kisilan = o; } }
      else if (bk.kisilan) { var k = bk.kisilan; bk.kisilan = null; if (k.gain && k.ctx) k.gain.gain.setTargetAtTime(1, k.ctx.currentTime, 0.05); } } catch (e) { /* */ } };
  var bas = function () { if (bk.basili) return; var k = kosul(); if (k) { bk.durum = k; ciz(); if (k !== "anahtar") dep.toast(W.bkNedenMetni(k), true); return; }
    var N = W.navigator, AC = W.AudioContext || W.webkitAudioContext;
    if (!N || !N.mediaDevices || !N.mediaDevices.getUserMedia || !AC) { bk.durum = "izin"; ciz(); izinKart(); return; }
    if (!bk.ctx || bk.ctx.state === "closed") { try { bk.ctx = new AC({ latencyHint: "interactive" }); } catch (e) { bk.ctx = new AC(); } }
    try { bk.ctx.resume(); } catch (e) { /* */ } // ⚠️ dokunuşun İÇİNDE (iOS)
    clearTimeout(bk.bosT); bk.basili = true; bk.basAt = Date.now(); bk.parca = 0; bk.tam = []; bk.durum = ""; bk.hataAd = ""; belgeDinle(true); kis(true); katil();
    clearTimeout(bk.enCokT); bk.enCokT = setTimeout(function () { birak("sure"); dep.toast("Bas-konuş en çok 60 sn: kesildi"); }, EN_COK_MS);
    if (!bk.akis) { if (bk.bekIzin) { ciz(); return; } bk.bekIzin = true; oturumAl(); // ⚠️ dokunuşun İÇİNDE, getUserMedia'dan ÖNCE (eşzamanlı)
      var iste = function (kisit, deneme) { N.mediaDevices.getUserMedia(kisit).then(function (ms) { bk.bekIzin = false; bk.izinRed = false;
        if (!bk.basili) { try { ms.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* */ } oturumVer(); return; } akisKur(ms); ciz(); }, function (e) { var ad = hataAdi(e), izin = ad === "NotAllowedError" || ad === "SecurityError";
          if (!izin && !deneme && bk.basili) { iste({ audio: true }, 1); return; } // izin dışı hata: bir kez sade kısıtla yeniden dene
          bk.bekIzin = false; bk.hataAd = ad; bk.izinRed = izin; birak(izin ? "izin" : "mikhata"); oturumVer(); bk.durum = izin ? "izin" : "mikhata"; ciz(); izin ? izinKart() : hataKart(ad); }); };
      iste({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } }, 0); }
    ciz(); };
  // 🔒 KESİN kural (mikrofon mutlaka kesilir): basılıyken parmağın kalktığı olay düğmeye ulaşmayabilir (Oda sekmesi yeniden çizilirken düğme DOM'dan kopup geri takılır).
  // Bu yüzden basılı olduğu SÜRECE belgede YAKALAMALI (capture) bırakma dinleyicileri vardır (pointerup / pointercancel + touchend / touchcancel / mouseup yedekleri);
  // bırakınca kalkar. Düğmenin kendi dinleyicileri de durur (birak tekrarlanabilir, ikincisi etkisiz).
  var BELGE_OLAY = ["pointerup", "pointercancel", "touchend", "touchcancel", "mouseup"];
  var belgeBirak = function (e) { var t = e && e.type; birak(t === "pointercancel" || t === "touchcancel" ? "iptal" : "birak"); };
  var belgeDinle = function (ac) { try { BELGE_OLAY.forEach(function (ad) { if (ac) D.addEventListener(ad, belgeBirak, true); else D.removeEventListener(ad, belgeBirak, true); }); } catch (e) { /* */ } };
  /** neden: birak | kaydi | iptal | tus | odak | gizli | sayfa | baglanti | kopuk | sure | izin | red | hata */
  var birak = function (neden) { if (!bk.basili) return; bk.basili = false; belgeDinle(false); bk.tam = []; clearTimeout(bk.enCokT); gonder("bk_birak", {}); kis(false);
    var ms = Date.now() - bk.basAt, n = bk.parca; bk.sonNeden = neden;
    if (n > 0 || neden === "izin" || neden === "mikhata") iz({ kind: "bkkonus", ok: n > 0, ms: ms, n: n, ...(n > 0 ? {} : { err: W.bkNedenMetni(neden) + ((neden === "izin" || neden === "mikhata") && bk.hataAd ? " (" + bk.hataAd + ")" : "") }) });
    clearTimeout(bk.bosT); bk.bosT = setTimeout(mikKapat, neden === "gizli" || neden === "sayfa" ? 0 : BOS_MS); ciz(); };
  W.bk2Birak = birak; // dışarıdan YALNIZ bırakma (açma yolu yok)
  var iz = function (o) { var oda = dep.oda(); if (!oda) return; try { var pr = dep.api("room_mod_sonuc", { room: oda, id: "bk-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...o }); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* iz yazılamadı */ } };
  var izinKart = function () { dep.onay({ baslik: "Mikrofon izni verilmedi", metin: "Bas-konuş için bu telefonun mikrofonu gerekir. İzin verilmediği için hiçbir ses gönderilmedi. Tabletin mikrofonu zaten hiç kullanılmaz.",
    ayrinti: "iPhone: Ayarlar › Uygulamalar › Safari › Mikrofon › “Sor” ya da “İzin Ver” (eski sürümde Ayarlar › Safari › Mikrofon). Sonra paneli kapatıp açın, düğmeye yeniden basılı tutun.", onay: "Tamam", vazgec: "Kapat" }); };
  var hataKart = function (ad) { dep.onay({ baslik: "Mikrofon açılamadı", metin: "Telefon mikrofonu açamadı (" + ad + "). İzin sorunu değil; hiçbir ses gönderilmedi. Tabletin mikrofonu zaten hiç kullanılmaz.",
    ayrinti: "Başka bir uygulama ya da sekme mikrofonu kullanıyor olabilir; telefon sesi kapalı/aramada olabilir. Paneli kapatıp açın, düğmeye yeniden basılı tutun. Sürerse hata adını (" + ad + ") bildirin.", onay: "Tamam", vazgec: "Kapat" }); };
  // ---- olaylar: bırakılmış sayılanlar
  try { D.addEventListener("visibilitychange", function () { if (D.visibilityState !== "visible") birak("gizli"); }); } catch (e) { /* */ }
  try { W.addEventListener("pagehide", function () { birak("sayfa"); }); W.addEventListener("blur", function () { birak("odak"); }); } catch (e) { /* */ }
  // ---- arayüz (yalnız sahip; yer sabit: anahtar satırı + düğme satırı)
  if (D && D.head && !D.getElementById("bk2Stil")) { var st = D.createElement("style"); st.id = "bk2Stil";
    st.textContent = ".bk2{display:flex;flex-direction:column;gap:6px;padding:0 10px 8px;height:110px;box-sizing:border-box}.bk2 .swrow{min-height:48px}"
      + ".bk2b{height:48px;width:100%;border-radius:12px;border:1px solid var(--line);background:var(--panel2);color:var(--text);font:inherit;font-weight:700;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:pointer}"
      + ".bk2b.on{background:#dc2626;border-color:#dc2626;color:#fff}.bk2b:disabled{opacity:.5;cursor:default}";
    D.head.appendChild(st); }
  var altMetin = function () { var k = kosul(); if (k === "anahtar") return bk.ayar === null ? "durum sunucudan bekleniyor…" : bk.kaliciYok ? "kapalı — ses gitmez · ⚠️ kapatma kalıcı yazılamadı; sunucu yeniden başlarsa açık dönebilir" : "kapalı — ses gitmez"; if (k) return W.bkNedenMetni(k);
    if (bk.basili) return bk.bekIzin ? "mikrofon izni bekleniyor…" : bk.durum ? W.bkNedenMetni(bk.durum) : "🔴 konuşuyor" + (bk.son ? " · " + W.bkGecikmeMetni(bk.son) : "");
    if (bk.durum === "mikhata") return "Mikrofon açılamadı (" + (bk.hataAd || "Hata") + ")"; if (bk.durum) return W.bkNedenMetni(bk.durum); return bk.son ? "hazır · son " + W.bkGecikmeMetni(bk.son) : "hazır: basılı tutun"; };
  var dugmeMetni = function () { return bk.basili ? "🔴 Konuşuyor — bırakınca kesilir" : "🎙️ Basılı tut, konuş"; };
  var ciz = function () { var el = bk.el; if (!el || !el.isConnected) return; var b = el.querySelector("#bk2B"), sw = el.querySelector("#bk2Sw"), sm = sw && sw.querySelector("small");
    var on = anahtarOku(); dep.swAyar(sw, gorunen()); if (sw && sw.disabled !== (bk.ayar === null)) sw.disabled = bk.ayar === null; /* durum bilinmeden anahtar dokunulmaz */
    var a = altMetin(); if (sm && sm.textContent !== a) sm.textContent = a;
    if (b) { var dis = !on || !!kosul(); if (b.disabled !== (dis && !bk.basili)) b.disabled = dis && !bk.basili; var t = dugmeMetni(); if (b.textContent !== t) b.textContent = t;
      if (b.classList.contains("on") !== bk.basili) b.classList.toggle("on", bk.basili); var ap = String(bk.basili); if (b.getAttribute("aria-pressed") !== ap) b.setAttribute("aria-pressed", ap); } };
  W.bk2Ciz = ciz;
  var dugmeBagla = function (b) {
    var bas1 = function (e) { if (e && e.cancelable) e.preventDefault(); bas(); };
    b.addEventListener("pointerdown", function (e) { if (e.button != null && e.button !== 0) return; // dokunuşta örtük yakalama bırakılır: parmak düğmeden kayınca "pointerleave" gelsin
      try { if (e.pointerId != null && b.hasPointerCapture && b.hasPointerCapture(e.pointerId)) b.releasePointerCapture(e.pointerId); } catch (x) { /* */ } bas1(e); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ad) { b.addEventListener(ad, function () { birak(ad === "pointerup" ? "birak" : ad === "pointerleave" ? "kaydi" : "iptal"); }); });
    b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    b.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); bas(); } });
    b.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); birak("tus"); } });
    b.addEventListener("blur", function () { birak("odak"); }); };
  /** index.html odaBkApply sonunda: obkr = aşama 1 satırı (.obkr). Sahip değilse kutu yok; sahipse yeri sabit (110 px) */
  W.bk2Apply = function (obkr) { if (!obkr || !obkr.parentNode) return; var el = obkr.nextElementSibling && obkr.nextElementSibling.classList.contains("bk2") ? obkr.nextElementSibling : null;
    if (!el && bk.el && !bk.el.isConnected && dep.sahip()) { el = bk.el; obkr.parentNode.insertBefore(el, obkr.nextSibling); } // kart yeniden kurulunca (innerHTML) AYNI öğe geri takılır: basılı düğme kopmaz, dinleyiciler korunur
    if (!dep.sahip()) { if (bk.basili) birak("yetki"); if (el) el.remove(); bk.el = null; return; }
    if (!el) { el = D.createElement("div"); el.className = "bk2"; obkr.parentNode.insertBefore(el, obkr.nextSibling); }
    if (!el.querySelector("#bk2B")) { el.innerHTML = dep.sw("bk2Sw", "Bas-konuş sesi (deneysel)", altMetin(), gorunen(), "bk2Anahtar()") + '<button type="button" id="bk2B" class="bk2b" aria-pressed="false">🎙️ Basılı tut, konuş</button>'; dugmeBagla(el.querySelector("#bk2B")); }
    bk.el = el; katil(); ciz(); };
  /** 🔐 anahtar: sunucuya yazılır (yalnız sahip; sunucu da denetler). Kapatma beklemeden (önce burada kesilir); açma onay kartından sonra, sunucu "tamam" deyince. */
  var ayarGonder = function (acik) { return new Promise(function (res) { if (!bk.ok || !gonder("bk_ayar", { acik: acik })) { res({ ok: false, hata: "baglanti" }); return; }
    var bw = function (pl) { clearTimeout(zt); res(pl); }, zt = setTimeout(function () { if (bk.ayarBekle === bw) bk.ayarBekle = null; res({ ok: false, hata: "baglanti" }); }, 5000); bk.ayarBekle = bw; }); };
  W.bk2Anahtar = function () { if (bk.ayar === null) { katil(); dep.toast("Durum sunucudan bekleniyor: biraz sonra yeniden deneyin", true); return Promise.resolve(false); }
    if (bk.ayar) { birak("kapandi"); mikKapat(); bk.ayar = false; ciz(); // güvenli yön: önce burada kapanır
      return ayarGonder(false).then(function (c) { if (!c.ok) { dep.toast("Kapatma sunucuya ulaşmadı: " + W.bkNedenMetni(c.hata || "baglanti") + " (panelden ses gitmez)", true); } else { iz({ kind: "bkayar", ok: true, on: false }); if (c.kalici === false) { bk.kaliciYok = true; dep.toast("⚠️ Bas-konuş kapandı ama kapatma kalıcı yazılamadı; sunucu yeniden başlarsa açık dönebilir", true); } } ciz(); return false; }); }
    return dep.onay({ baslik: "Bas-konuş sesi açılsın mı?", metin: "Deneysel: düğmeye basılı tuttuğunuz sürece bu telefonun mikrofonundaki sesiniz Selçuk hesabından odaya gider; bıraktığınız an kesilir. Tabletin mikrofonu hiç kullanılmaz.",
      ayrinti: "İlk basışta telefon mikrofon izni ister. Konuşurken oda sesi kısılır (yankı olmasın). Ekran kilitlenirse, uygulamadan çıkarsanız ya da bağlantı koparsa ses kendiliğinden kesilir. Ayar ortaktır (sunucuda): kapatınca süren konuşma da hemen kesilir.", onay: "Aç", vazgec: "Vazgeç" })
      .then(function (ok) { if (!ok) { ciz(); return false; }
        return ayarGonder(true).then(function (c) { if (!c.ok) dep.toast("Açılamadı: " + W.bkNedenMetni(c.hata || "baglanti"), true); else iz({ kind: "bkayar", ok: true, on: true }); ciz(); return !!c.ok; }); }); };
  setInterval(function () { if (!bk.el || (D.visibilityState && D.visibilityState !== "visible")) return; if (dep.sahip()) { bagla(); if (!bk.ok) katil(); else if (bk.ayar === null) ayarSor(); else if (anahtarOku() && Date.now() - bk.saatAt > 30000) saatSor(); } ciz(); }, 1000);
})();
