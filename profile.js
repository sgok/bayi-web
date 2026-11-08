// 👤 Profil sayfası — tabletteki profilin aynısı (kendi kayıtlarımız + Sugo'dan anlık durum + gerekirse Sugo'dan tazeleme).
// Sıra: 1) bu cihazdaki son kopya (anında)  2) veritabanımız  3) eskiyse Sugo'dan arka planda tazeleme, sonra yeniden okuma.
// Sadece yönetime ait işlemler (kategori değiştirme, takip etme, odaya girme) burada yok.
(function () {
  const escA = (s) => esc(s).replace(/"/g, "&quot;");
  const coin = (x) => (x == null ? "—" : Number(x).toLocaleString("tr-TR"));
  const az = (x) => (x == null ? "—" : Number(x).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₼");
  const tm = (iso) => iso ? new Intl.DateTimeFormat("tr-TR", { timeZone: "Asia/Baku", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";
  const durm = (m) => !m ? "—" : m < 60 ? m + " dk" : Math.floor(m / 60) + " sa " + (m % 60) + " dk";
  function relTime(iso) { if (!iso) return "—"; const ms = Date.parse(iso); const r = rel(ms); const d = Math.round((Date.now() - ms) / 86400000); return d >= 2 ? r + ` (${d} gün önce)` : r; }
  const card = (k, v, s, color) => `<div class="card"><div class="k">${k}</div><div class="v" style="${color ? "color:" + color : ""}">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`;
  const tbl = (head, rows, empty) => !rows.length ? `<div class="card empty">${empty}</div>` : `<table><tr class="h">${head.map((h) => `<th class="${h[1] || ""}">${h[0]}</th>`).join("")}</tr>${rows.join("")}</table>`;
  const ROLES = { bas: "⭐ Baş asistan", bayi: "🏪 Bayi yetkilisi", asistan: "👩‍💼 Asistan", kiz: "👧 Ajans kızı (görevsiz)", aile: "🏠 Aile üyesi (misafir)" };

  // ---- yerel kopya (son 60 profil)
  const pfCache = {
    get(uid) { try { return localStorage.getItem("pf_" + uid); } catch (e) { return null; } },
    put(uid, raw) { try { let k = JSON.parse(localStorage.getItem("pf_keys") || "[]").filter((x) => x !== uid); k.push(uid);
      while (k.length > 60) localStorage.removeItem("pf_" + k.shift()); localStorage.setItem("pf_keys", JSON.stringify(k)); localStorage.setItem("pf_" + uid, raw); } catch (e) {} },
  };
  const pfRefreshing = {}, pfLive = {};
  let pfUid = null;
  const sync = (on) => { const el = $("pfSync"); if (el) el.hidden = !on; };

  window.prof = async (uid) => {
    uid = String(uid); pfUid = uid;
    const k = (typeof inbox !== "undefined" && inbox.find((x) => String(x.id) === uid)) || (typeof people !== "undefined" && people[uid]) || {};
    $("pfTitle").textContent = "👤 " + (k.n || uid);
    if (!$("prof").classList.contains("on")) history.pushState({ p: uid }, "");
    show("prof"); $("pfBody").scrollTop = 0;
    const cached = pfCache.get(uid);
    if (cached) render(JSON.parse(cached)); else $("pfBody").innerHTML = `<div class="pfh"><div class="wav" style="background:#059669">${avHtml(k.n, k.av)}</div><div><div class="pn">${esc(k.n || uid)}</div><div class="s">UID ${esc(uid)}</div></div></div><div class="day">yükleniyor…</div>`;
    sync(!!pfRefreshing[uid]);
    delete pfLive[uid];
    api("profile_live", { uid }).then(onLive);
    const d = await api("profile", { uid });
    onNet(d, false);
  };
  window.profClose = () => { pfUid = null; history.back(); };
  window.profPop = () => { pfUid = null; show(cur ? "chat" : "inbox"); }; // geri tuşu (ana sayfadaki tek yönetici çağırır)

  function onNet(d, noRefresh) {
    const p = d && d.report && d.report.profile;
    if (!p) { if (!pfCache.get(pfUid)) $("pfBody").innerHTML = `<div class="day">❌ ${esc((d && d.error) || "Profil okunamadı")}</div>`; return; }
    pfCache.put(p.uid, JSON.stringify(p));
    if (typeof people !== "undefined") people[p.uid] = { n: p.name, av: p.avatar };
    if (pfUid === p.uid) render(p);
    if (p.stale && !noRefresh && !pfRefreshing[p.uid]) { // Sugo'dan tazele (en fazla 6 saatte bir), sonra kayıtlarımızdan tekrar oku
      pfRefreshing[p.uid] = 1; if (pfUid === p.uid) sync(true);
      api("profile_refresh", { uid: p.uid }).then(async () => { delete pfRefreshing[p.uid]; if (pfUid !== p.uid) return; sync(false); onNet(await api("profile", { uid: p.uid }), true); });
    }
  }
  function liveHtml(uid) {
    const l = pfLive[uid];
    if (!l) return '<span class="s">📡 Anlık durum okunuyor…</span>';
    if (l.error) return '<span class="s">📡 Anlık durum okunamadı</span>';
    if (l.room) return `<span class="pfroom">🏠 Şu an: ${esc(l.room.title || "oda " + l.room.id)} <span class="eqw"><i></i><i></i><i></i><i></i><i></i></span></span>`;
    if (l.online) return '<b style="color:#10b981">🟢 Çevrimiçi</b><span class="s"> · şu an bir odada değil</span>';
    const s = l.last_online_sec, ago = s ? (s < 3600 ? Math.round(s / 60) + " dk" : s < 86400 ? Math.round(s / 3600) + " saat" : Math.round(s / 86400) + " gün") + " önce" : "";
    return `<span class="s">⚪ Çevrimdışı${ago ? " · " + ago : ""}</span>`;
  }
  function relHtml(uid, rels) {
    const live = pfLive[uid] && typeof pfLive[uid].relation === "number" ? pfLive[uid].relation : null, r = rels || [];
    const v = live !== null ? live : r.includes("friend") ? 3 : r.includes("following") ? 1 : r.includes("follower") ? 4 : 0;
    return v === 2 ? '<span class="relc" style="color:#ef5d5d;border-color:#ef5d5d">⛔ Engelli</span>' : v === 3 ? '<span class="relc on">🤝 Arkadaş · karşılıklı takip</span>'
      : v === 1 ? '<span class="relc on">✓ Takip ediliyor</span>' : v === 4 ? '<span class="relc">👋 Ana hesabı takip ediyor</span>' : "";
  }
  function onLive(d) {
    const l = d && d.report && d.report.live; if (!l || !l.uid) return;
    pfLive[l.uid] = l;
    if (pfUid !== l.uid) return;
    if ($("pfLive")) $("pfLive").innerHTML = liveHtml(l.uid);
    const dot = $("pfDot"); if (dot && !l.error) dot.className = "wonl" + (l.online || l.room ? "" : " off");
  }
  // İsim değişikliği: bambaşka bir eski ad gri, ismin yanında
  const nmLetters = (v) => String(v || "").normalize("NFKC").toLocaleLowerCase("tr").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ə/g, "e").replace(/[^\p{L}\p{N}]/gu, "");
  function nmDiffers(a, b) { const x = nmLetters(a), y = nmLetters(b); if (!y) return false; if (!x) return true; if (x.includes(y) || y.includes(x)) return false;
    const bg = (t) => { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
    const A = bg(x), B = bg(y); let c = 0; for (const [k, n] of A) c += Math.min(n, B.get(k) || 0); return (2 * c) / Math.max(1, x.length - 1 + y.length - 1) < 0.4; }
  function oldName(p) { const cur = p.name_plain || p.name; for (const h of p.history || []) { if (h.field === "nickname" && nmLetters(h.old) && nmDiffers(cur, h.old)) return h.old; } return null; }
  function links(p) {
    const r = p.raw || {}, w = r.relationWall || {}, fam = (r.familyInfo || {}).family, un = r.unionTag || {}, b = r.basicInfo || {};
    const person = (o) => `<span class="uidl" data-uid="${escA(o.uid)}">${esc(o.nickname || o.uid)}</span>`, chips = [];
    if (w.cp && w.cp.other) chips.push(`💞 ${esc(w.cp.typeName || "CP")}: ${person(w.cp.other)}${w.cp.day ? ` · ${w.cp.day} gün` : ""}${w.cp.level ? ` · sv ${w.cp.level}` : ""}`);
    else if ((r.guarder || {}).basicInfo) chips.push(`💞 CP: ${person(r.guarder.basicInfo)}`);
    for (const x of w.relationships || []) chips.push(`🤝 ${esc(x.typeName || "İlişki")}: ${person(x.other)}${x.day ? ` · ${x.day} gün` : ""}`);
    if (fam) chips.push(`👪 Aile: <b>${esc(fam.familyName || "")}</b> · sv ${fam.familyLevel ?? "?"}${fam.ownerUid && fam.ownerUid !== p.uid ? ` · sahibi <span class="uidl" data-uid="${escA(fam.ownerUid)}">${esc(fam.ownerShowId || fam.ownerUid)}</span>` : fam.ownerUid === p.uid ? " · <b>aile sahibi</b>" : ""}`);
    if (un.unionRole === 1 || un.unionRole === 3) chips.push(`🏢 Ajans ${un.unionRole === 1 ? "sahibi" : "yöneticisi"}${un.textKey ? " · " + esc(un.textKey) : ""}`);
    if (b.agent && b.agent.isAgent) chips.push(`🏪 Coin bayisi${b.agent.assistantCount ? " · " + b.agent.assistantCount + " asistan" : ""}`);
    for (const x of r.myPartyRooms || []) chips.push(`🏠 Odası: ${esc(x.title || "")}`);
    return chips.length ? `<div class="pflinks">${chips.map((c) => `<span>${c}</span>`).join("")}</div>` : "";
  }
  function allInfo(p) {
    const r = p.raw; if (!r) return '<div class="card empty">Henüz okunmadı; profil Sugo\'dan okununca burada görünür.</div>';
    const b = r.basicInfo || {}, pr = r.profile || {}, fam = (r.familyInfo || {}).family, cp = (r.guarder || {}).basicInfo, med = r.userMedal || {};
    const d = (ms) => Number(ms) ? tm(new Date(Number(ms)).toISOString()).split(" ")[0] : "";
    const rows = (title, list) => { const L = list.filter((x) => x[1] !== "" && x[1] != null && x[1] !== false);
      return L.length ? `<div class="kvt">${title}</div><div class="kv">${L.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>` : ""; };
    const NOBLE = { 1: "Baron", 2: "Vikont", 3: "Kont", 4: "Marki", 5: "Dük", 6: "Kral", 7: "İmparator" };
    return `<div class="allinfo">` +
      rows("Hesap", [["Sugo ID", esc(b.showId || "")], ["Kayıt tarihi", d(b.registerTms)], ["Dil", esc(b.lang || "")], ["Ülke", esc(b.country || "")],
        ["Doğum tarihi", esc(b.birthdayDate || "")], ["Telefon bağlı", b.bindPhone ? "evet" : ""], ["Yüz onayı", b.verify ? "✓ onaylı" + (Number(b.verifyTime) ? " · " + d(b.verifyTime) : "") : "yok"],
        ["Cinsiyet onayı", b.genderVerify ? "✓" : ""], ["Sertifikalı", b.whetherCertified ? "✓" : ""], ["Resmî hesap", b.isOfficial ? "evet" : ""],
        ["Bayi (agent)", b.agent && b.agent.isAgent ? "evet" + (b.agent.assistantCount ? " · " + b.agent.assistantCount + " asistan" : "") : ""], ["Altın ID", esc((b.goldIdInfo || {}).goldId || "")]]) +
      rows("Seviyeler", [["VIP", b.vipLevel || ""], ["SVIP", b.svipLevel || ""], ["Servet", b.wealthLevel || ""], ["Cazibe", b.charmLevel || ""], ["Soyluluk", NOBLE[b.nobleType] || (b.nobleType ? "seviye " + b.nobleType : "")]]) +
      rows("Kişisel", [["Boy", pr.tall ? pr.tall + " cm" : ""], ["Kilo", pr.weight ? pr.weight + " kg" : ""], ["Meslek", esc(pr.profession || "")], ["Sektör", esc(pr.industry || "")],
        ["Memleket", esc((pr.hometown || {}).name || "")], ["Uyruk", esc((pr.nationality || {}).name || "")], ["Etnik köken", esc((pr.ethnicity || {}).Text || "")], ["İmza", esc(pr.signature || "")],
        ["Kişilik etiketleri", (r.personalityTags || []).map((t) => esc(t.name)).join(" · ")]]) +
      rows("Sosyal", [["Gönderi (feed)", r.feedTotal ?? ""], ["Albüm fotoğrafı", (pr.photowalls || []).filter(Boolean).length || ""], ["Özel albüm", pr.privateAlbumNum ? pr.privateAlbumNum + " fotoğraf (kilitli, alınmaz)" : ""],
        ["Madalya", med.count ? med.count + (med.latest && med.latest.length ? " · son: " + med.latest.slice(0, 3).map((m) => esc(m.name)).join(", ") : "") : ""],
        ["Araçlar", (r.cars || []).map((c) => esc(c.name)).join(", ")], ["Takılı araç", esc((r.equippedCar || {}).name || "")]]) +
      rows("İlişkiler", [["CP / koruyucu", cp ? `<span class="uidl" data-uid="${escA(cp.uid)}">${esc(cp.nickname || cp.uid)}</span>${(r.guarder || {}).guardDays && r.guarder.guardDays !== "0" ? " · " + r.guarder.guardDays + " gün" : ""}` : ""],
        ["Aile (family)", fam ? `${esc(fam.familyName || "")} · seviye ${fam.familyLevel ?? "?"}${fam.ownerUid ? ` · sahibi <span class="uidl" data-uid="${escA(fam.ownerUid)}">${esc(fam.ownerShowId || fam.ownerUid)}</span>` : ""}` : ""],
        ["Kendi odası", (r.myPartyRooms || []).length ? (r.myPartyRooms || []).map((x) => esc(x.title || "") + " · no " + esc((x.identity || {}).roomId || "")).join("<br>") : ""]]) +
      `<details class="raw"><summary>Ham veri (Sugo'dan gelen her şey)</summary><pre>${esc(JSON.stringify(r, null, 1)).slice(0, 20000)}</pre></details></div>`;
  }
  const HF = { nickname: "İsim", bio: "Biyografi", avatar: "Profil resmi", birthday: "Doğum tarihi", gender: "Cinsiyet", country: "Ülke", verified: "Yüz onayı",
    "info.tall": "Boy", "info.weight": "Kilo", "info.profession": "Meslek", "info.industry": "Sektör", "info.hometown": "Memleket",
    family: "Aile (family)", cp: "CP / koruyucu", signature: "İmza", own_room: "Kendi oda adı" };
  function histRow(h, p) {
    const v = (x) => h.field === "gender" ? (x === "1" ? "Kız" : x === "2" ? "Erkek" : x) : h.field === "verified" ? (x === "true" ? "onaylı" : "onaysız") : x;
    let body;
    if (h.field === "avatar") { const u = p.media_urls || {}, im = (k) => u[k] ? `<img src="${escA(u[k])}" data-img="${escA(u[k])}" loading="lazy">` : '<div class="hph">arşivde yok</div>';
      body = `<div class="havs">${im(h.old)}<span>→</span>${im(h.new)}</div>`; }
    else body = `<div class="hv"><span class="ho">${esc(v(h.old) ?? "—")}</span> → <b>${esc(v(h.new) ?? "—")}</b></div>`;
    return `<div class="hrow"><div class="hh"><b>${HF[h.field] || esc(h.field)}</b><span class="s">${tm(h.at)}</span></div>${body}</div>`;
  }
  window.pfJump = (id) => { const el = $(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };

  function render(p) {
    $("pfTitle").textContent = "👤 " + (p.name || p.uid);
    const role = p.role, r = p.room || {}, g = p.gifts || {}, b = p.buys || { recent: [] }, rv = p.recv;
    const days = []; for (let i = 13; i >= 0; i--) { const dd = new Date(Date.now() + 4 * 3600e3 - i * 86400e3).toISOString().slice(0, 10); days.push([dd, (r.per_day || {})[dd] || 0]); }
    const mx = Math.max(1, ...days.map((x) => x[1]));
    const ours = ["bas", "bayi", "asistan", "kiz"].includes(role);
    const since = (x) => x && x.from ? (x.from === rv.today ? "bugünden" : x.from.slice(5).split("-").reverse().join(".") + "'den") + " beri" : "";
    const recvSub = !rv ? (p.stale ? "Sugo'dan okunuyor…" : "Sugo'dan okunamadı") : ours && rv.month ? `bu ay +${coin(rv.month.gain)} (${since(rv.month)})${rv.week ? ` · 7 gün +${coin(rv.week.gain)}` : ""}` : `${rv.kinds} çeşit hediye · tüm zamanlar`;
    const tags = [p.gender === 1 ? "♀ Kız" : p.gender === 2 ? "♂ Erkek" : "", p.svip ? "SVIP " + p.svip : "", p.vip ? "VIP " + p.vip : "", p.wealth ? "Servet " + p.wealth : "", p.charm ? "Cazibe " + p.charm : ""].filter(Boolean);
    const age = p.birthday ? Math.floor((Date.now() - Date.parse(p.birthday)) / 31557600000) : null, inf = p.info || {};
    const facts = [age && age > 10 && age < 90 ? age + " yaş" : "", inf.tall ? inf.tall + " cm" : "", inf.weight ? inf.weight + " kg" : "", inf.profession || "", inf.industry || "", inf.hometown || ""].filter(Boolean);
    const big = p.avatar_full || p.avatar, noRole = r.seat_all > 0 || r.first ? "Misafir" : "Yabancı";
    const lv = pfLive[p.uid], on = lv && !lv.error ? !!(lv.online || lv.room) : null;
    const o = oldName(p);
    const debtSum = (p.debts || []).reduce((t, x) => t + Number(x.remaining || 0), 0);
    $("pfBody").innerHTML = `<div class="pfh"><div class="wav" style="background:#059669">${avHtml(p.name, p.avatar)}${big ? `<span class="zoomhit" data-img="${escA(avUrl(big).split("?x-oss")[0])}"></span>` : ""}${on === null ? "" : `<i id="pfDot" class="wonl${on ? "" : " off"}"></i>`}</div>
        <div style="flex:1;min-width:0"><div class="pn">${esc(p.name || "(isimsiz)")}${o ? ` <span class="pfold">(${esc(o)})</span>` : ""}${p.verified ? ' <span class="vtick" title="Yüz onaylı">✓</span>' : ""}</div>
          ${p.name_plain && p.name_plain !== p.name ? `<div class="pfplain">Okunuşu: <b>${esc(p.name_plain)}</b></div>` : ""}
          <div class="s">UID <b class="pfuid">${esc(p.uid)}</b> <button class="pfcopy" onclick="uidCopy('${escA(p.uid)}')">📋 Kopyala</button> · <span class="pfrole">${esc(role ? ROLES[role] || role : noRole)}</span></div>
          <div class="pflive" id="pfLive">${liveHtml(p.uid)}</div><div class="pfrel">${relHtml(p.uid, p.rels)}</div>${links(p)}<div class="pftags">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div></div></div>
      ${trust(p.uid).replace('class="trust', 'style="font-size:14px;margin:0 0 10px" class="trust')}
      <button class="pfmsg" onclick="profMsg('${escA(p.uid)}')">💬 Mesaj at (bayi hesabından)</button>
      <div class="pfjump"><button onclick="pfJump('pfAlbum')">📷 Albüm (${(p.photos || []).length})</button><button onclick="pfJump('pfOldAv')">🖼️ Eski resimler (${(p.old_avatars || []).length})</button>
        <button onclick="pfJump('pfNames')">🕘 Geçmiş (${(p.history || []).length})</button><button onclick="pfJump('pfAll')">📋 Tüm bilgiler</button>${p.video && p.video.count ? `<button onclick="pfJump('pfVideo')">📹 Görüntüler (${p.video.count})</button>` : ""}</div>
      ${p.bio ? `<div class="pfbio">${esc(p.bio)}</div>` : ""}
      ${facts.length ? `<div class="pftags" style="margin:2px 0 10px">${facts.map((f) => `<span>${esc(f)}</span>`).join("")}</div>` : ""}
      <div class="pgrid">
        ${card("💸 Bizden coin", coin(b.coins), `${b.count || 0} alım${b.last ? " · son " + tm(b.last) : ""}`, "#fbbf24")}
        ${card("🧾 Açık borç", debtSum > 0.009 ? az(debtSum) : "yok", (p.debts || []).length ? (p.debts || []).length + " kayıt" : "", debtSum > 0.009 ? "#f87171" : "")}
        ${ours ? card("🪑 Odamızda (30 gün)", durm(r.seat_30), `🎤 mikrofon ${durm(r.mic_30)} · 📹 kamera ${durm(r.cam_30)} · ${r.days_30 || 0} gün`) : ""}
        ${card("💝 Aldığı hediyeler", rv ? coin(rv.total) + " coin" : "—", recvSub, "#fbbf24")}
        ${card("🎁 Odamıza atış", coin(g.d30) + " coin", `30 gün · toplam ${coin(g.all)}${g.last ? " · son " + tm(g.last) : ""}`, "#10b981")}
        ${card("📅 Odamızda ilk / son", r.first ? tm(r.first).split(" ")[0] : "—", r.last ? "son görülme " + relTime(r.last) : "odamızda koltukta görülmedi")}
      </div>
      ${ours ? `<div class="pfsec">Son 14 gün – odamızda koltuk süresi</div><div class="pfbars">${days.map((x) => `<i style="height:${Math.round(100 * x[1] / mx)}%" title="${x[0]}: ${x[1]} dk"></i>`).join("")}</div>
        <div class="s" style="display:flex;justify-content:space-between"><span>${days[0][0].slice(5).split("-").reverse().join(".")}</span><span>bugün</span></div>` : ""}
      ${(b.recent || []).length ? `<div class="pfsec">💸 Son coin alımları (bizden)</div>` + tbl([["Tarih"], ["Coin", "n"]], b.recent.map((x) => `<tr><td>${tm(x.at)}</td><td class="n">${coin(x.coins)}</td></tr>`), "") : ""}
      ${(p.debts || []).length ? `<div class="pfsec">🧾 Açık borç</div>` + p.debts.map((x) => `<div class="cause">#${x.id} · kalan <b>${az(x.remaining)}</b> · ${tm(x.at)}${x.excluded ? " · tahsil edilemez" : ""}</div>`).join("") : ""}
      ${p.video && p.video.count ? `<div class="pfsec" id="pfVideo">📹 Görüntüye çıktı <span class="s">(${p.video.count} kez · son ${tm(p.video.last)})</span></div>
        <div class="frames">${p.video.shots.map((f) => `<div><img src="${escA(f.url)}" loading="lazy" data-img="${escA(f.full || f.url)}">${esc(tm(f.at))}${f.room ? " · " + esc(f.room) : ""}</div>`).join("")}</div>` : ""}
      ${rv && rv.top && rv.top.length ? `<div class="pfsec">💝 Hediye duvarı <span class="s">(Sugo · aldığı en değerli hediyeler)</span></div>` + tbl([["Hediye"], ["Adet", "n"], ["Değer", "n"]], rv.top.map((x) => `<tr><td>${esc(x.name)}</td><td class="n">${x.count}</td><td class="n">${coin(x.price * x.count)}</td></tr>`), "") : ""}
      <div class="pfsec" id="pfAlbum">📷 Albüm <span class="s">(${(p.photos || []).length} fotoğraf · Sugo profilinden, silinmez)</span></div>
      ${(p.photos || []).length ? `<div class="frames">${p.photos.map((f) => `<div${f.removed ? ' style="opacity:.55"' : ""}><img src="${escA(f.url)}" loading="lazy" data-img="${escA(f.url)}">${f.removed ? "profilden kaldırılmış" : "eklendi " + tm(f.first).split(" ")[0]}</div>`).join("")}</div>`
        : `<div class="card empty">${p.profile_at ? "Sugo profilinde herkese açık albüm fotoğrafı yok." : "Albüm Sugo'dan okunuyor; birkaç saniye içinde burada görünür."}</div>`}
      <div class="pfsec" id="pfOldAv">🖼️ Eski profil resimleri <span class="s">(${(p.old_avatars || []).length})</span></div>
      ${(p.old_avatars || []).length ? `<div class="frames">${p.old_avatars.map((f) => `<div><img src="${escA(f.url)}" loading="lazy" data-img="${escA(f.url)}">${tm(f.first).split(" ")[0]}</div>`).join("")}</div>` : '<div class="card empty">Henüz yok. Profil resmini değiştirirse eskisi burada saklanır.</div>'}
      <div class="pfsec" id="pfAll">📋 Tüm Sugo profil bilgileri <span class="s">${p.profile_at ? "(son okuma " + tm(p.profile_at) + ")" : ""}</span></div>
      ${allInfo(p)}
      <div class="pfsec" id="pfNames">🕘 Profil geçmişi <span class="s">(${(p.history || []).length} değişiklik)</span></div>
      ${(p.history || []).length ? `<div class="hist">${p.history.map((h) => histRow(h, p)).join("")}</div>` : '<div class="card empty">Henüz değişiklik yok. İsim, biyografi, profil resmi gibi bilgiler değişince eski hâli tarihiyle burada birikir.</div>'}
      <div class="pfsec">Tüm zamanlar</div>
      <div class="s">${ours ? `Odamızda koltukta toplam ${durm(r.seat_all)} · mikrofon ${durm(r.mic_all)} · kamera ${durm(r.cam_all)} · ${r.days_all || 0} aktif gün · ` : ""}odamıza ${g.times || 0} kez atış${rv ? ` · aldığı hediyeler ${coin(rv.total)} coin` : ""}</div>
      <div style="height:30px"></div>`;
  }
  window.profMsg = (uid) => { pfUid = null; history.back(); setTimeout(() => (typeof pick === "function" ? pick(uid) : openChat(uid)), 60); };
  window.uidCopy = (uid) => { try { navigator.clipboard.writeText(String(uid)).then(() => toast("📋 UID kopyalandı: " + uid)); } catch (e) { toast("Kopyalanamadı", true); } };
})();
