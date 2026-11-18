// 📣 Pazarlama listesi (18.11.2026; kullanıcı: "svip1 ve üstünü … yeni erkek kullanıcıları da listele … en son ne zaman pazarlama yaptık") —
// YALNIZ YÖNETİCİ (yonOk(); sunucu da 403 verir). Ayarlar › 👑 Ajans sahibi › 📣 Pazarlama listesi.
// BU AŞAMADA GÖNDERİM YOK: ekranda "Gönder" düğmesi yoktur; yalnız aday listesi ve son pazarlama zamanı gösterilir (sunucu: _shared/pazarlama.ts, göç 0236).
// Gruplar: ⭐ SVIP · 🆕 Yeni erkek · 💎 Zengin · 🔁 Bırakan. Satır: ad, rozetler (SVIP / VIP / cinsiyet), son çevrimiçi, son pazarlama; uygun değilse nedeni soluk.
// Hiçbir yerel alert / confirm yok. Sabit yükseklikli sayım kutuları ve yükleme alanı: veri gelince sayfa kaymaz.
(function () {
  const GRUP = [["svip", "⭐", "SVIP"], ["yeni_erkek", "🆕", "Yeni erkek"], ["zengin", "💎", "Zengin"], ["birakan", "🔁", "Bırakan"]];
  const ACIKLAMA = {
    svip: "SVIP 1 ve üstü", yeni_erkek: "son 30 günde katılan erkekler", zengin: "SVIP'siz ama VIP 5+ ya da zenginlik 25+", birakan: "bizden almış, son alımı 30 günden eski" };
  const S = { grup: "svip", sayim: null, satirlar: [], sayfa: 0, daha: false, yukleniyor: false, hata: "", sadeceUygun: false, n: 0 };
  const ok = () => typeof yonOk === "function" && yonOk();
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const N = (x) => Number(x || 0).toLocaleString("tr-TR");

  if (!document.getElementById("pzCss")) { const st = document.createElement("style"); st.id = "pzCss"; st.textContent = `
    .pzwrap { padding: 0 0 24px; } .pzwrap .pznot { margin: 4px 12px 10px; }
    .pzchips { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; padding: 0 12px; } @media (min-width: 560px) { .pzchips { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    .pzchip { display: block; min-height: 74px; min-width: 0; padding: 8px 10px; text-align: left; border-radius: 14px; line-height: 1.25; }
    .pzchip .pzad { display: block; font-size: 13.5px; font-weight: 600; overflow-wrap: anywhere; } .pzchip .pzsay { display: block; font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .pzchip .pzalt { display: block; font-size: 12px; color: var(--muted); font-weight: 400; overflow-wrap: anywhere; }
    .pzchip.on { border-color: var(--go); box-shadow: inset 0 0 0 1px var(--go); }
    .pzbilgi { margin: 10px 12px 2px; font-size: 13px; color: var(--muted); min-height: 36px; overflow-wrap: anywhere; }
    .pzsw { margin: 4px 12px 0; } .pzsw .swrow { min-height: 44px; }
    .pzliste { margin-top: 8px; min-height: 160px; border-top: 1px solid var(--line); }
    .pzrow { display: block; width: 100%; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; padding: 10px 14px; min-height: 64px; color: inherit; }
    .pzrow .pzust { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; min-width: 0; } .pzrow .pzust b { min-width: 0; overflow-wrap: anywhere; font-size: 15.5px; }
    .pzrow .pzalt2 { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; overflow-wrap: anywhere; }
    .pzrow.pzsoluk { opacity: .55; } .pzrow .pzneden { display: block; font-size: 12.5px; color: var(--warn); margin-top: 2px; overflow-wrap: anywhere; }
    .pzrz { display: inline-block; font-size: 11.5px; font-weight: 700; line-height: 1.5; padding: 0 7px; border-radius: 999px; border: 1px solid var(--line); white-space: nowrap; }
    .pzrz.svip { border-color: var(--go); color: var(--go); } .pzrz.vip { border-color: var(--brand3); color: var(--brand3); } .pzrz.bugun { border-color: #10b981; color: #10b981; }
    .pzbos { padding: 28px 14px; text-align: center; color: var(--muted); } .pzhata { padding: 14px; color: var(--bad); overflow-wrap: anywhere; }
    .pzdaha { display: block; margin: 12px 12px 0; width: calc(100% - 24px); min-height: 44px; }
  `; document.head.appendChild(st); }

  // ---------------------------------------------------------------- zaman yazıları (Bakü saati)
  const saat = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Baku" });
  const gunOnce = (ms) => { const g = Math.floor((Date.now() - ms) / 86400000); return g <= 0 ? "bugün" : g === 1 ? "dün" : g + " gün önce"; };
  const cevrimici = (r) => { const ms = Date.parse(r.online_at || ""); return !ms ? "son çevrimiçi: bilinmiyor" : r.bugun ? "çevrimiçi: bugün " + saat(ms) : "son çevrimiçi: " + gunOnce(ms); };
  const pazarlama = (r) => { const ms = Date.parse(r.son_pazarlama_at || ""); return !ms ? "son pazarlama: hiç" : "son pazarlama: " + gunOnce(ms); };
  const cins = (g) => g === 1 ? `<span class="pzrz" aria-label="Kadın" title="Kadın">♀</span>` : g === 2 ? `<span class="pzrz" aria-label="Erkek" title="Erkek">♂</span>` : "";

  // ---------------------------------------------------------------- çizim
  const satirHtml = (r) => `<button type="button" class="pzrow${r.uygun ? "" : " pzsoluk"}" data-uid="${esc(r.uid)}" onclick="pzAc('${esc(r.uid)}')">
    <span class="pzust"><b>${esc(r.ad || r.uid)}</b>${r.svip ? `<span class="pzrz svip">SVIP ${r.svip}</span>` : ""}${r.vip ? `<span class="pzrz vip">VIP ${r.vip}</span>` : ""}${cins(r.gender)}${r.bugun ? `<span class="pzrz bugun">bugün çevrimiçi</span>` : ""}</span>
    <span class="pzalt2">${esc(cevrimici(r))} · ${esc(pazarlama(r))}${r.wealth ? ` · zenginlik ${r.wealth}` : ""}</span>
    ${r.uygun ? "" : `<span class="pzneden">${esc(r.neden || "uygun değil")}</span>`}</button>`;
  const chipHtml = () => GRUP.map(([k, ic, ad]) => { const x = S.sayim && S.sayim.find((y) => y.grup === k);
    return `<button type="button" class="pzchip${S.grup === k ? " on" : ""}" data-g="${k}" onclick="pzGrup('${k}')"><span class="pzad">${ic} ${ad}</span><span class="pzsay">${x ? N(x.toplam) : "–"}</span>
      <span class="pzalt">${x ? `${N(x.uygun)} uygun · ${N(x.bugun)} bugün` : "yükleniyor"}</span></button>`; }).join("");
  const govde = () => {
    const sec = S.satirlar.filter((r) => !S.sadeceUygun || r.uygun);
    const liste = S.hata ? `<div class="pzhata">${esc(S.hata)} <button type="button" onclick="pzYukle(true)">Yeniden dene</button></div>`
      : S.yukleniyor && !S.satirlar.length ? `<div class="pzbos">Liste yükleniyor…</div>`
      : !sec.length ? `<div class="pzbos">${S.satirlar.length ? "Uygun aday yok (hepsi beklemede ya da zaten müşteri)." : "Bu grupta aday yok."}</div>` : sec.map(satirHtml).join("");
    const x = S.sayim && S.sayim.find((y) => y.grup === S.grup);
    return `<div class="pzwrap"><div class="s pznot">Yalnız liste: <b>hiçbir mesaj gönderilmez</b>. Gönderilenler kaydedilince aynı kişiye 7 gün içinde ikinci mesaj yazılamaz.</div>
      <div class="pzchips" id="pzChips">${chipHtml()}</div>
      <div class="pzbilgi" id="pzBilgi">${esc(ACIKLAMA[S.grup] || "")}${x ? ` · bugün çevrimiçi ve uygun: ${N(x.bugun_uygun)}` : ""}</div>
      <div class="pzsw">${typeof swHtml === "function" ? swHtml("pzUygun", "Yalnız uygun olanlar", "7 gün dolmayanlar ve zaten müşteri olanlar gizlenir", S.sadeceUygun, "pzUygunTikla()") : ""}</div>
      <div class="pzliste" id="pzListe">${liste}</div>
      ${S.daha && !S.hata ? `<button type="button" class="pzdaha" id="pzDaha" onclick="pzDaha()"${S.yukleniyor ? " disabled" : ""}>Daha fazla göster</button>` : ""}</div>`; };
  const ciz = () => { const el = $("pzHost"); if (el) el.innerHTML = govde(); }

  // ---------------------------------------------------------------- veri
  async function yukle(sifirla, ek) {
    if (!ok() || S.yukleniyor) return; const n = ++S.n, g = S.grup; S.yukleniyor = true; S.hata = "";
    if (sifirla) { S.satirlar = []; S.sayfa = 0; S.daha = false; } ciz();
    let d; try { d = await api("pazarlama_liste", { grup: g, sayfa: ek ? S.sayfa + 1 : 0 }); } catch (e) { d = { error: "Bağlantı hatası" }; }
    if (n !== S.n) { S.yukleniyor = false; return; } // bu arada başka grup seçildi
    S.yukleniyor = false;
    if (!d || d.error) { S.hata = (d && d.error) || "Liste alınamadı"; ciz(); return; }
    const p = (d.report && d.report.pazarlama) || {}; S.sayim = p.sayim || S.sayim; S.daha = !!p.daha;
    if (ek) { S.sayfa = p.sayfa || S.sayfa + 1; S.satirlar = S.satirlar.concat(p.adaylar || []); } else { S.sayfa = 0; S.satirlar = p.adaylar || []; }
    ciz();
  }
  window.pzYukle = (z) => { S.yukleniyor = false; yukle(true); };
  window.pzGrup = (k) => { if (S.grup === k && S.satirlar.length) return; S.grup = k; ls.put("bw_pzgrup", k); S.yukleniyor = false; S.n++; yukle(true); };
  window.pzDaha = () => yukle(false, true);
  window.pzUygunTikla = () => { S.sadeceUygun = !S.sadeceUygun; ls.put("bw_pzuygun", S.sadeceUygun ? "1" : "0"); ciz(); };
  window.pzAc = (uid) => { if (!/^\d{3,15}$/.test(String(uid))) return; if (typeof can === "function" && can("profil") && typeof prof === "function") prof(String(uid)); };
  window.pazOpen = () => {
    if (!ok()) { if (typeof toast === "function") toast("Pazarlama listesi yalnız yöneticide", true); return; }
    const g = ls.get("bw_pzgrup"); if (g && GRUP.some((x) => x[0] === g)) S.grup = g; S.sadeceUygun = ls.get("bw_pzuygun") === "1"; S.yukleniyor = false; S.satirlar = []; S.sayfa = 0; S.hata = ""; S.n++;
    const h = `<h3>📣 Pazarlama listesi</h3><div id="pzHost">${govde()}</div>`;
    if (typeof sheet === "function") sheet("pazarlama", h); else if (typeof openModal === "function") openModal(h);
    S.yukleniyor = false; yukle(true);
  };
  window.pzDurum = () => ({ grup: S.grup, adet: S.satirlar.length, uygun: S.sadeceUygun });
})();
