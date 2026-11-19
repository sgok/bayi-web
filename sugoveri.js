// 🛰️ Sugo verileri (W20, 16.11.2026; kullanıcı: "sugoda olupta kullanmadığımız herşeyi kullanalım") — YALNIZ YÖNETİCİ (yonOk(); sunucu da 403).
// • Ajansım › 🛰️ Sugo: coin paneli özeti + müşteri başına bu ay coin, ailemiz (üyeler, rol, son aktif), son etkileşilen kişiler (şu an hangi odada),
//   bayi hesabının elmas hareketleri, ajans transferleri (not / durum / ajansa katılma), tanınmayan mesaj türleri sayımı, işçi durumu.
// • Profil kartı: risk işaretleri, panelden "bu ay aldığı coin", ailemizdeki rolü, yakınlık (💞; yalnız istenince Sugo'dan).
// • Listeler (Ajansım, Coins): risk rozeti. • Sohbet: tanınmayan mesaj türü kartı (herkes; sunucu chat_history "kart" alanı).
// Kural: önce bu cihazdaki son kopya (anında), sonra sunucu; aynı sürüm yeniden çizilmez (sunucuya bilinen sürümler gider, yalnız değişen gelir).
// Bu veriler muhasebeye yansımaz; ekranda "panelden / Sugo'dan" diye yazılır.
(function () {
  const ok = () => typeof yonOk === "function" && yonOk();
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
  const N = (x) => (x == null || x === "" ? "—" : Number(x).toLocaleString("tr-TR"));
  const T = (iso) => { const ms = Date.parse(iso || ""); return ms ? rel(ms) : "—"; };
  const escA = (s) => esc(s).replace(/"/g, "&quot;");
  const avI = (n, av) => (typeof avHtml === "function" ? avHtml(n || "?", av || null) : esc(String(n || "?").slice(0, 1)));
  const tap = (uid) => /^\d{3,15}$/.test(String(uid || "")) ? ` data-uid="${esc(String(uid))}" onclick="svPick('${esc(String(uid))}')" role="button" style="cursor:pointer"` : "";
  window.svPick = (uid) => { if (typeof can === "function" && can("profil")) prof(String(uid)); else if (typeof openChat === "function") openChat(String(uid)); };
  const temizle = () => { for (const k of ["bw_sv", "bw_svrisk", "bw_svsub"]) ls.del(k); try { Object.keys(localStorage).filter((k) => k.startsWith("sv_pf_") || k.startsWith("sv_dv_")).forEach((k) => localStorage.removeItem(k)); } catch (e) {} };
  window.svOk = ok;
  // 🔐 yönetici değilse (rol biliniyorsa) bu cihazdaki Sugo verisi kopyaları bir kez silinir (hesap geçişi / rol değişimi)
  let temizlendi = false; const yetkisiz = () => { if (!temizlendi && typeof me !== "undefined" && me && typeof meGuven !== "undefined" && meGuven) { temizlendi = true; temizle(); } };

  // ---------------------------------------------------------------- stiller (bir kez; index.html'e dokunmadan)
  if (!document.getElementById("svCss")) { const st = document.createElement("style"); st.id = "svCss"; st.textContent = `
    .svwrap { padding: 0 0 24px; } .svwrap h3 { margin: 14px 12px 6px; } .svnote { margin: 6px 12px; } .svmin { min-height: 50vh; }
    .svgrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 10px; } .svgrid .card { margin: 0; min-width: 0; }
    .svgrid .card .v { font-size: 20px; overflow-wrap: anywhere; } @media (min-width: 560px) { .svgrid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .svrow .b { min-width: 0; } .svrow .b b, .svrow .b .s { overflow-wrap: anywhere; } .svrow .sag { flex: none; text-align: right; font-weight: 700; max-width: 40%; overflow-wrap: anywhere; }
    .svrz { display: inline-block; font-size: 11px; font-weight: 600; line-height: 1.4; padding: 0 6px; margin-left: 4px; border-radius: 999px; border: 1px solid #f59e0b; color: #f59e0b; vertical-align: middle; white-space: nowrap; }
    .svrz.ok { border-color: #10b981; color: #10b981; } .svrz.kot { border-color: #ef4444; color: #ef4444; }
    .svpf { margin: 8px 0 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--muted); } .svpf b { color: var(--text); }
    /* W24: dört satırın yeri baştan ayrılı (iskelet de dört satır, her satır 26 px, tek satır; uzunsa yatay kayar): sunucu cevabı gelince alttaki kartlar inmez */
    .svpf > div { height: 26px; line-height: 26px; white-space: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; } .svpf > div::-webkit-scrollbar { display: none; }
    .svpf .svdv { margin: 2px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--muted); } .svpf .svdv > span { display: block; height: 20px; line-height: 20px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .svpf .svdv b { color: var(--text); }
    .svpf .svdv .sk { height: 20px; margin: 0; box-sizing: border-box; border: 4px solid transparent; background-clip: padding-box; } .svpf .svl .svhata { white-space: nowrap; color: #ef4444; }
    .svpf .svl { display: flex; flex-wrap: nowrap; gap: 4px; align-items: center; } .svpf .svl > * { flex: none; } .svpf .svl .sk { margin: 0; } .svpf button { padding: 2px 10px; font-size: 13px; line-height: 18px; border-radius: 999px; }
    .svkart { border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; background: var(--tint, rgba(127,127,127,.08)); max-width: 260px; }
    .svkart .svkb { font-weight: 700; font-size: 13px; } .svkart .svkm { margin-top: 4px; overflow-wrap: anywhere; } .svkart img { display: block; max-width: 100%; max-height: 160px; border-radius: 8px; margin-top: 6px; }
    .svkart .svkn { font-size: 12px; color: var(--muted); margin-top: 4px; } .svkart.coz { opacity: .8; }
    .svmore { display: block; width: calc(100% - 20px); margin: 10px; padding: 11px; border-radius: 12px; }
    .svtbl { width: calc(100% - 20px); max-width: calc(100% - 20px); margin: 0 10px; table-layout: fixed; box-sizing: border-box; } .svtbl td, .svtbl th { overflow-wrap: anywhere; } .svtbl .svtn { width: 5.2em; } /* W24: genel tablo kenar boşluğu (10 px) + %100 genişlik sağdan kırpıyordu (390 / 600) */
    .svtbl td.n, .svtbl th.n { white-space: nowrap; font-variant-numeric: tabular-nums; }`;
    document.head.appendChild(st); }

  // ---------------------------------------------------------------- 🛰️ Ajansım › Sugo
  const ALT = [["coin", "🪙 Coin paneli"], ["aile", "👪 Ailemiz"], ["etk", "🤝 Son etkileşim"], ["elmas", "💎 Elmas hareketleri"], ["tr", "🔁 Transferler"], ["tur", "🧩 Mesaj türleri"], ["is", "⚙️ İşçi"]];
  let sub = (ls.get("bw_svsub") || "coin"), S = ls.get("bw_sv") || { veri: {} }, busy = false, err = "", durum = null, isler = [], tabloYok = false;
  let el = null /* elmas */, elBusy = false, tr = null, trBusy = false, tur = null, turBusy = false;
  if (!ALT.some(([k]) => k === sub)) sub = "coin";
  const V = (k) => (S.veri[k] || {}).veri || null, VAt = (k) => (S.veri[k] || {}).degisim_at || null;
  window.svSub = (k) => { sub = k; ls.put("bw_svsub", k); window.svCiz(); window.svYukle(); };

  window.svHtml = () => {
    if (!ok()) { temizle(); return ""; }
    return `<div class="svwrap"><div class="sub">${ALT.map(([k, l]) => `<button class="${k === sub ? "on" : ""}" onclick="svSub('${k}')">${l}</button>`).join("")}</div>
      <div class="svmin">${govde()}</div>
      <div class="s svnote">Sugo'dan seyrek okunur (özet 10 dk, listeler saatte bir, aile 6 saatte bir). Muhasebeye yansımaz; yalnız bilgi.</div></div>`;
  };
  window.svCiz = () => { const b = document.getElementById("svBody"); if (!b) return; const h = window.svHtml(); if (b.__h !== h) { b.innerHTML = h; b.__h = h; window.svSusle(b); } };
  window.svYukle = async () => {
    if (!ok() || busy) return; busy = true;
    try {
      const bilinen = {}; for (const [k, x] of Object.entries(S.veri || {})) bilinen[k] = x.surum;
      const d = await api("sugo_veri_get", { bilinen }); const r = d && d.report;
      if (!r) { err = (d && d.error) || "Okunamadı"; }
      else { err = ""; tabloYok = !!r.tablo_yok; durum = r.durum || null; isler = r.isler || [];
        const v = { ...(S.veri || {}) }; for (const [k, x] of Object.entries(r.veri || {})) v[k] = x; S = { veri: v, at: Date.now() }; ls.put("bw_sv", S); }
    } catch (e) { err = "Okunamadı"; } finally { busy = false; }
    if (sub === "elmas" && !el && !elBusy) elYukle(false);
    if (sub === "tr" && !tr && !trBusy) trYukle(false);
    if (sub === "tur" && !tur && !turBusy) turYukle();
    window.svCiz();
  };

  const bos = (t) => `<div class="row s">${t}</div>`;
  function govde() {
    if (tabloYok) return bos("ℹ️ Sugo verileri tablosu henüz kurulmadı (göç 0190). Kurulunca burada görünür.");
    const e = err ? `<div class="row s">❌ ${esc(err)} (son kopya gösteriliyor)</div>` : "";
    if (sub === "coin") return e + coinH();
    if (sub === "aile") return e + aileH();
    if (sub === "etk") return e + etkH();
    if (sub === "elmas") return elH();
    if (sub === "tr") return trH();
    if (sub === "tur") return turH();
    return e + isH();
  }
  const kart = (k, v, s) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
  function coinH() {
    const o = V("coin_ozet"), m = V("coin_musteri"), kq = V("coin_konusulan");
    if (!o && !m && !Object.keys(S.veri || {}).length && busy) return SKR(5);
    const sa = (o && o.satis) || {}, al = (o && o.alis) || {};
    let h = `<h3>📤 Satış (panelin kendi özeti) <span class="s">${o ? "· " + T(VAt("coin_ozet")) : ""}</span></h3>` + (o ? `<div class="svgrid">
      ${kart("📅 Bugün", N(sa.coin_gun), N(sa.musteri_gun) + " müşteri")}${kart("🗓️ Bu hafta", N(sa.coin_hafta), N(sa.musteri_hafta) + " müşteri")}
      ${kart("📆 Bu ay", N(sa.coin_ay), N(sa.musteri_ay) + " müşteri")}${kart("⏮️ Geçen ay", N(sa.coin_gecen_ay), N(sa.musteri_gecen_ay) + " müşteri")}</div>
      <h3>📥 Alış (Sugo'dan yükleme)</h3><div class="svgrid">${kart("🗓️ Bu hafta", N(al.hafta))}${kart("📆 Bu ay", N(al.ay))}${kart("⏮️ Geçen ay", N(al.gecen_ay))}${kart("📦 Stok", N(al.stok ?? sa.stok))}</div>` : bos("Henüz okunmadı."));
    const liste = ((m && m.liste) || []).filter((x) => Number(x.c) > 0);
    h += `<h3>🏆 Bu ay en çok coin alanlar <span class="s">${m ? `(${N(liste.length)} kişi · panelde ${N(m.toplam)} müşteri)` : ""}</span></h3>` +
      (liste.length ? liste.slice(0, 100).map((x, i) => `<div class="row svrow"${tap(x.u)}><div class="av">${avI(x.n, x.av)}</div><div class="b"><b>${i + 1}. ${esc(x.n || x.u)}</b><div class="s">UID ${esc(x.u)}${x.svip ? " · SVIP " + esc(x.svip) : x.vip ? " · VIP " + esc(x.vip) : ""}</div></div><div class="sag">${N(x.c)}</div></div>`).join("")
        : bos(m ? "Bu ay coin alan müşteri yok." : "Henüz okunmadı."));
    if (kq) h += `<div class="s svnote">Konuşulan müşteriler listesi: ${N(kq.toplam)} kişi (6 saatte bir).</div>`;
    return h;
  }
  const ROL = { 1: "Sahip", 2: "Yönetici", 3: "Elit", 4: "Üye" }; // member_type anlamları OLASI (Sugo'dan doğrulanmadı)
  const rolAd = (r) => (r == null ? "" : ROL[r] || "rol " + r);
  function aileH() {
    const a = V("aile"); if (!a) return busy ? SKR(4) : bos("Henüz okunmadı (6 saatte bir).");
    const uy = (a.uyeler || []).slice().sort((p, q) => (Date.parse(q.son_aktif || "") || 0) - (Date.parse(p.son_aktif || "") || 0));
    return `<div class="card" style="margin:10px"><b>👪 ${esc(a.ad || "Aile")}</b><div class="s">Seviye ${esc(a.seviye ?? "—")}${a.seviye_adi ? " (" + esc(a.seviye_adi) + ")" : ""} · aktiflik ${esc(a.aktif_seviye ?? "—")} · ${N(a.uye)} üye${a.max_uye ? " / en çok " + N(a.max_uye) : ""}</div>
      <div class="s">Aile no ${esc(a.id)}${a.group_id ? " · grup sohbeti " + esc(a.group_id) : ""}${a.party_id ? " · oda " + esc(a.party_id) : ""} · ${T(VAt("aile"))}</div></div>
      <h3>👥 Üyeler <span class="s">(Sugo'nun verdiği ${N(uy.length)} kişi; son aktife göre)</span></h3>` +
      (uy.length ? uy.map((x) => `<div class="row svrow"${tap(x.u)}><div class="av">${avI(x.n, x.av)}</div><div class="b"><b>${esc(x.n || x.u)}</b><div class="s">${esc(rolAd(x.rol))}${x.katilma ? " · katıldı " + T(x.katilma) : ""}</div></div><div class="sag s">${x.son_aktif ? T(x.son_aktif) : "—"}</div></div>`).join("") : bos("Üye listesi gelmedi.")) +
      `<div class="s svnote">Rol adları tahmini. Sugo tam üye listesini sayfalı vermiyor; burada ilk gelenler var.</div>`;
  }
  function etkH() {
    const e = V("etkilesim"); if (!e) return busy ? SKR(5) : bos("Henüz okunmadı (saatte bir).");
    const l = e.liste || [];
    return `<h3>🤝 Ana hesabın son etkileşimleri <span class="s">· ${T(VAt("etkilesim"))}</span></h3>` + (l.length ? l.map((x) => `<div class="row svrow"${tap(x.u)}><div class="av">${avI(x.n, x.av)}</div><div class="b"><b>${esc(x.n || x.u)}</b>${rz(x.r)}<div class="s">UID ${esc(x.u)}${x.servet ? " · 💎 " + esc(x.servet) : ""}</div></div><div class="sag s">${x.oda ? "🏠 odada" + (x.oda.kisi ? " · " + N(x.oda.kisi) + " kişi" : "") : "—"}</div></div>`).join("") : bos("Liste boş."));
  }
  // elmas hareketleri (arşiv; sayfalı)
  async function elYukle(more) { if (elBusy) return; elBusy = true; window.svCiz();
    const once = more && el && el.satirlar.length ? el.satirlar[el.satirlar.length - 1].zaman : null;
    const d = await api("sugo_elmas_get", { once, n: 50 }).catch(() => null); elBusy = false; const r = d && d.report;
    if (r) el = { satirlar: (more && el ? el.satirlar : []).concat(r.satirlar || []), toplam: Number(r.toplam) || 0, ty: !!r.tablo_yok }; else if (!el) el = { satirlar: [], toplam: 0, hata: (d && d.error) || "Okunamadı" };
    window.svCiz(); }
  window.svElMore = () => elYukle(true);
  function elH() {
    if (!el) return SKR(6); if (el.ty) return bos("Elmas hareketleri tablosu henüz yok (göç 0190)."); if (el.hata) return bos("❌ " + esc(el.hata));
    return `<h3>💎 Bayi hesabının elmas hareketleri <span class="s">(${N(el.toplam)} kayıt · saatte bir)</span></h3>` + (el.satirlar.length ? el.satirlar.map((x) => `<div class="row svrow"${tap(x.karsi_uid)}><div class="av" style="background:linear-gradient(135deg,#38bdf8,#0369a1)">💎</div><div class="b"><b>${Number(x.op) === 2 ? "−" : "+"}${N(x.miktar)} elmas</b><div class="s">${esc(x.tur_adi || "tür " + x.fn)}${x.takma_ad || x.karsi_uid ? " · " + esc(x.takma_ad || "UID " + x.karsi_uid) : ""}</div></div><div class="sag s">${T(x.zaman)}${x.sonuc_bakiye != null ? `<div>→ ${N(x.sonuc_bakiye)}</div>` : ""}</div></div>`).join("") : bos("Kayıt yok.")) +
      (el.satirlar.length < el.toplam ? `<button class="svmore" ${elBusy ? "disabled" : ""} onclick="svElMore()">${elBusy ? "⏳ yükleniyor…" : "⬇️ Daha fazla"}</button>` : "");
  }
  // ajans transferleri
  async function trYukle(more) { if (trBusy) return; trBusy = true; window.svCiz();
    const d = await api("sugo_transfer_get", { off: more && tr ? tr.satirlar.length : 0 }).catch(() => null); trBusy = false; const r = d && d.report;
    if (r) tr = { satirlar: (more && tr ? tr.satirlar : []).concat(r.satirlar || []), toplam: Number(r.toplam) || 0 }; else if (!tr) tr = { satirlar: [], toplam: 0, hata: (d && d.error) || "Okunamadı" };
    window.svCiz(); }
  window.svTrMore = () => trYukle(true);
  function trH() {
    if (!tr) return SKR(6); if (tr.hata) return bos("❌ " + esc(tr.hata));
    return `<h3>🔁 Ajans elmas transferleri <span class="s">(${N(tr.toplam)} kayıt)</span></h3>` + (tr.satirlar.length ? tr.satirlar.map((x) => `<div class="row svrow"${tap(x.uid)}><div class="av">${avI(x.nickname, x.avatar)}</div><div class="b"><b>${esc(x.nickname || x.uid)}</b><div class="s">${N(x.amount)} elmas · durum ${esc(x.status ?? "—")}${x.note ? " · “" + esc(String(x.note).slice(0, 80)) + "”" : ""}</div>
      <div class="s">${x.ajansa_katilma ? "ajansa katılma " + esc(String(x.ajansa_katilma).slice(0, 19)) : x.uye_katilma ? "üye kaydı " + T(x.uye_katilma) : ""}${x.uye_ayrilma ? " · ayrıldı " + T(x.uye_ayrilma) : ""}</div></div><div class="sag s">${T(x.at)}</div></div>`).join("") : bos("Transfer kaydı yok.")) +
      (tr.satirlar.length < tr.toplam ? `<button class="svmore" ${trBusy ? "disabled" : ""} onclick="svTrMore()">${trBusy ? "⏳ yükleniyor…" : "⬇️ Daha fazla"}</button>` : "") + `<div class="s svnote">Durum kodlarının anlamı Sugo'dan doğrulanmadı.</div>`;
  }
  async function turYukle() { if (turBusy) return; turBusy = true; const d = await api("sugo_tur_get", {}).catch(() => null); turBusy = false; tur = (d && d.report) || { liste: [], hata: (d && d.error) || "Okunamadı" }; window.svCiz(); }
  function turH() {
    if (!tur) return SKR(4); if (tur.hata) return bos("❌ " + esc(tur.hata));
    return `<h3>🧩 Tanınmayan mesaj türleri <span class="s">(${N(tur.toplam)} mesaj · ${N(tur.cozulemeyen)} çözülemedi)</span></h3>` +
      ((tur.liste || []).length ? `<table class="svtbl"><colgroup><col><col class="svtn"><col class="svtn"></colgroup><tr><th>Tür</th><th class="n">Mesaj</th><th class="n">Kartla</th></tr>${tur.liste.map((x) => `<tr><td>${esc(x.ad)}</td><td class="n">${N(x.n)}</td><td class="n">${N(x.cozulen)}</td></tr>`).join("")}</table>` : bos("Tanınmayan tür yok."));
  }
  const IS_DURUM = (x) => !x ? "—" : x.hata ? "⚠️ " + esc(x.hata) : x.son ? "✓ " + T(x.son) : "bekliyor";
  function isH() {
    const d = durum || {}, ii = d.isler || {}, dd = d.durdu || {}, sc = d.sayac || {}, g = (d.gun || {}).istek || {};
    return `<h3>⚙️ Sugo okuma işçisi</h3>${Object.keys(dd).length ? Object.entries(dd).map(([h, x]) => `<div class="row s">⛔ <b>${esc(h)}</b> hesabı durdu (${esc(x.neden)}) · ${T(x.at)} · yeni oturumla kendiliğinden açılır</div>`).join("") : ""}` +
      (isler.length ? isler.map((x) => `<div class="row svrow"><div class="b"><b>${esc(x.aciklama)}</b><div class="s">${esc(x.hesap)} hesabı · ${N(x.dk)} dk'da bir</div></div><div class="sag s">${IS_DURUM(ii[x.ad])}</div></div>`).join("") : bos("İşçi henüz çalışmadı.")) +
      `<div class="s svnote">Bugün istek: coin ${N(g.coin || 0)} · bayi ${N(g.bayi || 0)} · ana ${N(g.main || 0)} · toplam ${N(sc.istek || 0)} · değişen ${N(sc.degisim || 0)} · hata ${N(sc.hata || 0)} · durma ${N(sc.durdu || 0)}</div>`;
  }

  // ---------------------------------------------------------------- ⚠️ risk rozetleri (listeler)
  const RZ = { sahte: ["⚠️ Sahte", "kot"], cekim: ["🚫 Çekim yasak", "kot"], engel: ["⛔ Engel", "kot"], gizli: ["👻 Gizli", ""], video: ["🎥 Video", "ok"] };
  let RM = (ls.get("bw_svrisk") || {}), riskBusy = false;
  const rzMetin = (k) => (RM.metin && RM.metin[k] && RM.metin[k][1]) || "";
  function rz(kodlar) { return (kodlar || []).map((k) => RZ[k] ? `<span class="svrz ${RZ[k][1]}" title="${escA(rzMetin(k) || RZ[k][0])}">${RZ[k][0]}</span>` : "").join(""); }
  async function riskTazele() { if (riskBusy || !ok() || (RM.at && Date.now() - RM.at < 10 * 60_000)) return; riskBusy = true;
    const d = await api("sugo_risk_get", {}).catch(() => null); riskBusy = false; const r = d && d.report;
    if (r && r.risk) { const yeni = { risk: r.risk, metin: r.metin || {}, at: Date.now() }, degisti = JSON.stringify(yeni.risk) !== JSON.stringify(RM.risk || null); RM = yeni; ls.put("bw_svrisk", RM);
      if (degisti) for (const id of ["ajBody", "coinBody", "svBody"]) { const e = document.getElementById(id); if (e) susle(e, true); } } }
  function susle(root, yeniden) {
    const m = RM.risk || {};
    root.querySelectorAll(".row").forEach((row) => {
      if (row.dataset.svr && !yeniden) return;
      let uid = row.dataset.uid || ""; if (!uid) { const t = row.querySelector("[onclick*=\"prof('\"]"); const mm = t && /prof\('(\d{3,15})'\)/.exec(t.getAttribute("onclick") || ""); if (mm) uid = mm[1]; }
      if (!uid) return; row.dataset.svr = "1";
      const b = row.querySelector(".b b"); if (!b) return;
      const eski = b.parentNode.querySelector(":scope > .svrz-k"); if (eski) eski.remove();
      if (row.querySelector(".svrz")) return; // satır rozetini zaten kendisi çizmiş (🤝 etkileşim listesi)
      const k = (m[uid] || []).filter((x) => RZ[x]); if (!k.length) return;
      const s = document.createElement("span"); s.className = "svrz-k"; s.innerHTML = rz(k); b.after(s);
    });
  }
  window.svSusle = (root) => { if (!ok()) { yetkisiz(); return; } if (!root) return; susle(root, false); riskTazele(); };

  // ---------------------------------------------------------------- 👤 profil kartı
  const pfYuk = {}, pfMem = {}; // uid → son istek anı · son gelen sonuç (bellekte)
  window.svProfilH = (p) => {
    if (!ok()) { yetkisiz(); return ""; }
    if (!p || !p.uid) return "";
    dvTohum(p); const uid = String(p.uid), c = ls.get("sv_pf_" + uid) || pfMem[uid]; // bellek kopyası: boş sonuç (hepsi boş) kayda yazılmasa da profil yeniden çizilince iskelete dönmez
    if (!pfYuk[uid] || Date.now() - pfYuk[uid] > 60_000) { pfYuk[uid] = Date.now(); setTimeout(() => pfYukle(uid), 0); }
    return `<div class="svpf" id="svPf" data-uid="${escA(uid)}">${pfIc(uid, c)}</div>`;
  };
  function pfIc(uid, c) {
    if (!c) return [9, 13, 8, 11].map((w) => `<div class="svl"><span class="sk" style="width:${w}em"></span></div>`).join("") + dvIc(uid); // dört satır yeri (kayma yok)
    const out = [];
    const r = c.risk || {}, rk = rz(r.kodlar), app = r.uygulama != null ? `<span class="svrz" title="Sugo kayıt uygulaması kodu (anlamı doğrulanmadı)">📱 uyg. ${esc(r.uygulama)}</span>` : "";
    out.push(rk || app ? `<div class="svl">⚠️ ${rk}${app}</div>` : `<div>⚠️ Sugo risk işareti yok</div>`);
    out.push(c.coin ? `<div>🪙 Panelde bu ay aldığı: <b>${N(c.coin.bu_ay)} coin</b></div>` : `<div>🪙 Panelde bu ay coin kaydı yok</div>`);
    out.push(c.aile_uye ? `<div>👪 Ailemizde${c.aile_uye.rol != null ? " · " + esc(rolAd(c.aile_uye.rol)) : ""}${c.aile_uye.son_aktif ? " · son aktif " + T(c.aile_uye.son_aktif) : ""}</div>` : `<div>👪 Ailemizde kaydı yok</div>`);
    const cp = c.cp;
    out.push(`<div class="svl">💞 Yakınlık: ${cp ? `<b>seviye ${N(cp.seviye)}</b> · puan ${N(cp.puan)}${cp.sonraki_puan ? " / " + N(cp.sonraki_puan) : ""}${cp.tur_adi ? " · " + esc(cp.tur_adi) : ""} <span class="s">(${T(cp.at)})</span>` : '<span class="s">bilinmiyor</span>'}
      <button onclick="svCp('${escA(uid)}')"${c.cpBusy ? " disabled" : ""}>${c.cpBusy ? "⏳" : cp ? "tazele" : "Sugo'dan oku"}</button>${c.cpHata ? ` <span class="s">${esc(c.cpHata)}</span>` : ""}</div>`);
    return out.join("") + dvIc(uid);
  }
  // 🎁 Hediye duvarı İSTEK ÜZERİNE (19.11): toplu okuma kapalı; düğmeye basılınca YALNIZ bu kişinin duvarı (bayi-web "hediye_duvari_getir"; sunucu: kişi başına 60 sn, dakikada 6, Sugo durdurursa 10 dk kapalı).
  // Önce son hâl (bu cihazdaki kopya / profilin veritabanı değeri), düğme adı hep aynı ("Yenile" anlamında), yanında son alınma zamanı. Okurken satırlar iskelet (yer değişmez).
  const dvS = {}; // uid → { wall, at, busy, hata, not }
  const dvOku = (uid) => { const s = dvS[uid] || (dvS[uid] = {}); if (!s.wall) { const k = ls.get("sv_dv_" + uid); if (k && k.wall) { s.wall = k.wall; s.at = k.at; } } return s; };
  const dvTop = (w) => (Array.isArray(w && w.top) ? w.top.slice(0, 6) : []);
  function dvIc(uid) {
    const s = dvOku(uid), w = s.wall, n = dvTop(w).length;
    const ozet = s.busy ? `<span class="sk" style="width:12em"></span>` : w ? `<span>🎁 Hediye duvarı: <b>${N(w.total)} coin</b> · ${N(w.kinds)} çeşit hediye</span>` : `<span>🎁 Hediye duvarı: henüz indirilmedi</span>`;
    const liste = s.busy ? Array.from({ length: n || 6 }, (_, i) => `<span class="sk" style="width:${[14, 11, 12, 9, 13, 10][i % 6]}em"></span>`).join("")
      : dvTop(w).map((x) => `<span><b>${esc(x.name || "?")}</b> · ${N(x.count)} adet · ${N(Number(x.price) * Number(x.count))} coin</span>`).join("");
    const zaman = s.busy ? "alınıyor…" : s.at ? "son alınma: " + T(s.at) : "";
    return `<div class="svl"><button type="button" onclick="svDv('${escA(uid)}')"${s.busy ? ' disabled aria-busy="true"' : ""}>🎁 Hediye duvarını getir</button> <span class="s">${esc(zaman)}</span>${s.hata && !s.busy ? ` <span class="s svhata">${esc(s.hata)}</span>` : ""}${s.not && !s.busy ? ` <span class="s">${esc(s.not)}</span>` : ""}</div>
      <section class="svdv">${ozet}${liste}</section>`;
  }
  window.svDv = async (uid) => {
    uid = String(uid); const s = dvOku(uid); if (s.busy) return; s.busy = true; s.hata = ""; s.not = ""; pfCiz(uid, ls.get("sv_pf_" + uid) || pfMem[uid]);
    const d = await api("hediye_duvari_getir", { uid }).catch(() => null), r = d && d.report && d.report.hediye_duvari;
    s.busy = false;
    if (r && r.wall && r.wall.total != null) { s.wall = { total: r.wall.total, kinds: r.wall.kinds, top: r.wall.top || [] }; s.at = r.wall.at || s.at; ls.put("sv_dv_" + uid, { wall: s.wall, at: s.at }); }
    s.hata = r ? r.hata || "" : (d && d.error) || "Bağlantı hatası";
    s.not = r && r.onbellek && !r.hata ? "az önce okundu; " + (r.bekle_sn || 60) + " sn sonra yenilenir" : "";
    pfCiz(uid, ls.get("sv_pf_" + uid) || pfMem[uid]);
  };
  // profil açılınca veritabanındaki son hâl (toplu okumadan / daha önceki okumadan): bu cihazdaki kopyadan yeniyse onu al
  const dvTohum = (p) => { const uid = String(p.uid), s = dvOku(uid), r = p.recv; if (!r || r.total == null || !r.at) return; if (!s.wall || (Date.parse(r.at) || 0) > (Date.parse(s.at || "") || 0)) { s.wall = { total: r.total, kinds: r.kinds, top: r.top || [] }; s.at = r.at; } };
  function pfCiz(uid, c) { const e = document.getElementById("svPf"); if (!e || e.dataset.uid !== uid) return; const h = pfIc(uid, c); if (e.innerHTML !== h) e.innerHTML = h; }
  async function pfYukle(uid) {
    const d = await api("sugo_profil_get", { uid }).catch(() => null), r = d && d.report; if (!r) return;
    const kayitli = ls.get("sv_pf_" + uid), eski = kayitli || {}, c = { risk: r.risk || null, coin: r.coin || null, aile_uye: r.aile_uye || null, cp: r.cp || eski.cp || null };
    pfMem[uid] = c; // 🐛 11.19: hepsi boş sonuç eskiyle "aynı" sayılıp hiç yazılmıyordu → profil başka cevapla yeniden çizilince iskelet kalıyor, 60 sn istek de atılmıyordu
    if (!kayitli || JSON.stringify(c) !== JSON.stringify({ risk: eski.risk || null, coin: eski.coin || null, aile_uye: eski.aile_uye || null, cp: eski.cp || null })) ls.put("sv_pf_" + uid, c);
    pfCiz(uid, c);
  }
  window.svCp = async (uid) => {
    const c = ls.get("sv_pf_" + uid) || {}; c.cpBusy = true; c.cpHata = ""; pfCiz(uid, c);
    const d = await api("sugo_cp_get", { uid }).catch(() => null), r = d && d.report;
    c.cpBusy = false; if (r && r.cp) c.cp = r.cp; c.cpHata = (r && (r.hata || (r.tablo_yok ? "tablo henüz yok" : ""))) || (d && d.error) || "";
    const kay = { ...c }; delete kay.cpBusy; delete kay.cpHata; ls.put("sv_pf_" + uid, kay); pfCiz(uid, c);
  };

  // ---------------------------------------------------------------- 🧩 sohbet: tanınmayan mesaj türü kartı (herkes)
  window.svKart = (k) => {
    if (!k || typeof k !== "object") return "";
    return `<div class="svkart${k.cozuldu ? "" : " coz"}"><div class="svkb">${esc(k.ikon || "📦")} ${esc(k.baslik || "Sugo mesajı")}</div>${k.metin ? `<div class="svkm">${esc(k.metin)}</div>` : ""}${k.resim ? `<img src="${escA(k.resim)}" data-img="${escA(k.resim)}" loading="lazy" alt="" onerror="this.remove()">` : ""}${k.no ? `<div class="svkn">No ${esc(k.no)}</div>` : ""}${k.cozuldu ? "" : '<div class="svkn">İçeriği çözülemedi (Sugo uygulamasında açın)</div>'}</div>`;
  };

  // ---------------------------------------------------------------- ↩️ geri çağırma: panelin kendi kaydı (kim, ne zaman, neden)
  window.svRecallEk = (r) => {
    const p = r && r.panel; if (!p) return "";
    return `<div class="s">🧾 Panel: ${p.kim ? "<b>" + esc(p.kim) + "</b>" : "kim bilinmiyor"}${p.at ? " · " + T(p.at) : ""}${p.coin ? " · " + N(p.coin) + " coin" : ""}${p.neden ? " · neden: “" + esc(String(p.neden).slice(0, 120)) + "”" : ""}</div>`;
  };
})();
