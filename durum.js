// 📸 Durumlar (Sugo "moments"): alt menünün ortasındaki ⭕ Durum sekmesi — akış (Takip ettiklerim · Arkadaşlarım · Genel · 🏢 Ekip), sonsuz kaydırma,
// gönderi detayı (beğeni / yorum sayısı; Sugo listeleri dışarı vermiyor: unavailable), profilde "Durumlar (n)" şeridi.
// 🌐 Sugo beğeni / yorum (bayi hesabıyla, herkese açık): kartta tek beğeni sayısı (Sugo'nun) + ❤️ düğmesi (çift dokunuş da) + "Yorum yaz". Sugo'nun web arayüzünde uç yok →
//    window.MOMENT_WRITE_ON kapalıyken düğmeler yalnız "yakında" der, hiçbir istek gitmez (ilk deneme kullanıcı onayıyla; sunucuda da aynı bayrak).
// 🏢 Ekip paylaşımı (＋ Paylaş, yalnız sahip / yetkili): resim 1–9 (1600 px JPEG + 500 px küçük hâl) ve/veya 1 video (≤ 60 sn, ≤ 25 MB) + yazı. Bizim depoda, Sugo'da görünmez;
//    tarayıcı dosyaları Storage'a doğrudan yükler (ilerlemeli), hata olursa içerik kaybolmaz, "Tekrar dene" yüklenenleri yeniden göndermez. "🏢 Ekip" alt sekmesi + Genel'de zamanına göre karışık.
//    Silme yok: ⋯ › 🙈 Gizle (yazan ya da sahip). ⚙️ Ayarlar › 💾 Depo kullanımı.
// Akış sunucuda kişilerin kendi durumları birleştirilerek kurulur: report.loading > 0 iken üstteki şeritte "🔄 N kişinin durumları okunuyor…", 20 sn'de bir sessiz tazeleme.
// Sıra: önce bu cihazdaki son akış (anında, kayma yok) → sunucu (bayi-web → Sugo). Değişmeyen kart yeniden çizilmez; gizli alt sekmeler boşta çizilir.
(function () {
  const TABS = [["following", "Takip ettiklerim"], ["friends", "Arkadaşlarım"], ["all", "Genel"], ["team", "🏢 Ekip"]];
  const LSK = "bw_pane_durum_"; // "bw_pane_" öneki: çıkışta (cacheClear) silinir
  const PAGE_KEEP = 20, STALE = 60_000, MAXIMG = 9, MAXPX = 1600, THPX = 500, TICK = 20_000, VMAX = 25 * 1024 * 1024, VSEC = 60;
  if (window.MOMENT_WRITE_ON === undefined) window.MOMENT_WRITE_ON = false; // 🌐 Sugo'da beğeni / yorum: web arayüzünde uç yok (2026-11-11) → kapalı; ilk deneme kullanıcı onayıyla, sonra true
  const escA = (s) => esc(s);
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const MOM = {}; // id → gönderi (akış, profil, detay ortak)
  const st = {}; // alt sekme → { items, next, at, busy, err }
  let dtab = (() => { try { const t = localStorage.getItem("bw_durum_tab"); return TABS.some((x) => x[0] === t) ? t : "following"; } catch (e) { return "following"; } })();
  const S = (t) => st[t] || (st[t] = (() => { const c = lsGet(LSK + t); return { items: c && Array.isArray(c.items) ? c.items : null, next: c ? c.next || null : null, people: c ? c.people ?? null : null, loading: 0, fresh: 0, at: 0, busy: false, err: null }; })());

  // ---- biçim
  const ago = (iso) => { const t = Date.parse(iso); if (!t) return ""; const s = (Date.now() - t) / 1000;
    if (s < 60) return "az önce"; if (s < 3600) return Math.floor(s / 60) + " dk önce"; if (s < 86400) return Math.floor(s / 3600) + " sa önce"; if (s < 7 * 86400) return Math.floor(s / 86400) + " gün önce";
    return new Date(t).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }); };
  // Zaman: kartın üstünde Instagram gibi kısa ("2 sa"), listelerde uzun ("2 sa önce"). Yazı yerleştirmeden hemen önce doldurulur: kartın özeti zamanla değişmez, kart boşuna yeniden kurulmaz
  const agoS = (iso) => { const t = Date.parse(iso); if (!t) return ""; const s = (Date.now() - t) / 1000;
    if (s < 60) return "şimdi"; if (s < 3600) return Math.floor(s / 60) + " dk"; if (s < 86400) return Math.floor(s / 3600) + " sa"; if (s < 7 * 86400) return Math.floor(s / 86400) + " g";
    return new Date(t).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }); };
  const timeTag = (iso, kisa) => `<time data-at="${escA(iso || "")}"${kisa ? ' data-k="s"' : ""}></time>`;
  const fillTimes = (root) => root && root.querySelectorAll("time[data-at]").forEach((e) => { const v = e.dataset.k === "s" ? agoS(e.dataset.at) : ago(e.dataset.at); if (e.textContent !== v) e.textContent = v; });
  const OSSH = typeof OSS === "string" ? OSS : "";
  const imgUrl = (u) => (!u ? "" : /^(https?:|data:|blob:)/.test(u) || !OSSH ? u : OSSH + u);
  const thumb = (u) => { const f = imgUrl(u); return /^https?:/.test(f) && !f.includes("?") ? f + "?x-oss-process=image/resize,m_fill,h_500,w_500" : f; }; // akışta küçük resim; büyütmede (data-img) tam boy
  const nf0 = (n) => Number(n || 0).toLocaleString("tr-TR");
  const nameH = (uid, n) => (typeof nmH === "function" ? nmH(uid, n || "UID " + uid) : esc(n || uid));
  const vipO = (m) => (typeof vipOf === "function" ? vipOf(m.vip, m.svip) : null);
  const avBox = (m, cls) => { const o = vipO(m); return `<div class="avw${o ? vipAttr(o) : ""}" data-u="${escA(m.uid)}"><div class="av ${cls || ""}">${avHtml(m.n, m.av)}</div>${o ? vipLab(o) : ""}</div>`; };
  const vipChip = (m) => { const o = vipO(m); return o ? `<span class="svtag dvip" style="--vc:${o.c}">${o.t}</span>` : ""; };
  const txtH = (t) => (typeof emo === "function" ? emo(esc(t)) : esc(t));
  const canPost = () => !!(me && (me.role === "sahip" || me.role === "yetkili"));
  const dur = (sn) => { sn = Math.round(Number(sn) || 0); return sn > 0 ? Math.floor(sn / 60) + ":" + String(sn % 60).padStart(2, "0") : ""; };
  const GR = ["#f58529,#dd2a7b", "#8134af,#515bd4", "#dd2a7b,#8134af", "#feda75,#fa7e1e", "#515bd4,#22d3ee", "#16a34a,#0ea5e9"]; // yazı-yalnız durumun renkli zemini (kimliğe göre sabit)
  const grOf = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return GR[h % GR.length]; };
  const uzun = (t) => String(t || "").length > 110 || (String(t || "").match(/\n/g) || []).length > 1;

  // 📷 Instagram gönderisi gibi: başlık (resim · ad · VIP · "· 2 sa" · ⋯) → tam genişlik 4:5 görsel (çoklu resimde yana kaydırmalı + nokta) → ❤️ N · 💬 N → açıklama (uzunsa "devamı") → "Yorumların hepsini gör (N)".
  // Beğeni / yorum yalnız sayı (Sugo'ya hiçbir şey gitmez); çift dokunuşla beğeni yok (gerçek beğeni gitmeyeceği için yanıltıcı olurdu). Resme dokununca büyütme (#lb).
  // 🏢 Ekip paylaşımı: küçük hâl (≤ 500 px) akışta, tam boy büyütmede; video yalnız dokununca iner (preload none); resim + video birlikte: yana kaydırmalı
  const vidH = (v) => `<video src="${escA(v.url)}" poster="${escA(v.thumb || "")}" controls playsinline preload="none"></video>`;
  function teamMediaH(m) { const imgs = (m.imgs || []).slice(0, MAXIMG), th = m.thumbs || [], v = m.video && m.video.url ? m.video : null, n = imgs.length + (v ? 1 : 0);
    const img = (u, i) => `<img src="${escA(th[i] || u)}" data-img="${escA(u)}" loading="lazy" alt="">`;
    if (!n) return `<div class="igm igtx" style="--g:${grOf(m.id)}"><span>${txtH(String(m.t || "").slice(0, 280)) || "🏢"}</span></div>`;
    const vd = v && dur(v.dur) ? `<i class="dvdur">▶ ${dur(v.dur)}</i>` : "";
    if (n === 1) return v ? `<div class="igm dvid">${vidH(v)}${vd}</div>` : `<div class="igm">${img(imgs[0], 0)}</div>`;
    return `<div class="igm igc${v ? " dvid" : ""}"><div class="igcs">${imgs.map(img).join("")}${v ? vidH(v) : ""}</div><i class="igcn">1/${n}</i></div>
      <div class="igdots">${Array.from({ length: n }, (_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>`; }
  function mediaH(m) { if (m.src === "team") return teamMediaH(m); const imgs = (m.imgs || []).filter(Boolean).slice(0, MAXIMG);
    if (m.video && m.video.url) return `<div class="igm dvid"><video src="${escA(m.video.url)}" poster="${escA(thumb(m.video.thumb || ""))}" controls playsinline preload="none"></video>${dur(m.video.dur) ? `<i class="dvdur">▶ ${dur(m.video.dur)}</i>` : ""}</div>`;
    if (!imgs.length) return `<div class="igm igtx" style="--g:${grOf(m.id)}"><span>${txtH(String(m.t || "").slice(0, 280)) || "📸"}</span></div>`;
    if (imgs.length === 1) return `<div class="igm"><img src="${escA(thumb(imgs[0]))}" data-img="${escA(imgUrl(imgs[0]))}" loading="lazy" alt=""></div>`;
    return `<div class="igm igc"><div class="igcs">${imgs.map((u) => `<img src="${escA(thumb(u))}" data-img="${escA(imgUrl(u))}" loading="lazy" alt="">`).join("")}</div><i class="igcn">1/${imgs.length}</i></div>
      <div class="igdots">${imgs.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div>`; }
  const likeH = (m) => `${m.liked ? "❤️" : "🤍"} <b>${nf0(m.likes)}</b>`;
  // 🏢 Ekip kartı: Sugo kartının aynısı; ad yanında "🏢 Ekip" rozeti, profil bağlantısı yok, beğeni / yorum yerine "Ekip içi · Sugo'da görünmez"; ⋯ yalnız gizleyebilene (yazan / sahip)
  function teamCardH(m, full) { const media = (m.imgs || []).length || (m.video && m.video.url), cap = media && m.t, ini = String(m.n || "?").trim().slice(0, 1).toLocaleUpperCase("tr") || "?";
    return `<article class="dcard ig tcard${full ? " full" : ""}" data-id="${escA(m.id)}"><div class="dch"><div class="avw"><div class="av tav" style="--g:${grOf(m.by || m.n || "")}">${esc(ini)}</div></div><div class="dcn"><b>${esc(m.n || "Ekip")}</b><span class="tbadge">🏢 Ekip</span><span class="igt">· ${timeTag(m.at, 1)}</span></div>${m.own ? `<button class="igmenu" data-tmenu="${escA(m.id)}" aria-label="Seçenekler">⋯</button>` : `<span class="igmenu tnone"></span>`}</div>
      ${mediaH(m)}<div class="dcf tcf"><span>🏢 Ekip içi · Sugo'da görünmez</span></div>
      ${cap ? `<div class="dct${full ? " full" : ""}"><b>${esc(m.n || "Ekip")}</b> ${txtH(m.t)}</div>${!full && uzun(m.t) ? `<button class="igdev">devamı</button>` : ""}` : !media && !full && uzun(m.t) ? `<button class="igdev" data-ac="1">devamı</button>` : ""}</article>`; }
  function cardH(m, full) { MOM[String(m.id)] = m; if (m.src === "team") return teamCardH(m, full); const media = (m.imgs || []).some(Boolean) || (m.video && m.video.url), cap = media && m.t;
    return `<article class="dcard ig${full ? " full" : ""}" data-id="${escA(m.id)}"><div class="dch">${avBox(m)}<div class="dcn"><b data-u="${escA(m.uid)}">${nameH(m.uid, m.n)}</b>${vipChip(m)}${m.pinned ? `<span class="dpin" title="Sabitlenmiş durum">📌</span>` : ""}<span class="igt">· ${timeTag(m.at, 1)}</span></div><button class="igmenu" data-menu="${escA(m.uid)}" aria-label="Seçenekler">⋯</button></div>
      ${mediaH(m)}<div class="dcf"><button class="mlk${m.liked ? " lk" : ""}" aria-label="Beğen (Sugo)">${likeH(m)}</button><button class="mcm" aria-label="Yorumlar">💬 <b>${nf0(m.comments)}</b></button><span class="dsg">🌐 Sugo</span></div>
      ${cap ? `<div class="dct${full ? " full" : ""}"><b data-u="${escA(m.uid)}">${nameH(m.uid, m.n)}</b> ${txtH(m.t)}</div>${!full && uzun(m.t) ? `<button class="igdev">devamı</button>` : ""}` : !media && !full && uzun(m.t) ? `<button class="igdev" data-ac="1">devamı</button>` : ""}
      ${!full && Number(m.comments) > 0 ? `<button class="igall">Yorumların hepsini gör (${nf0(m.comments)})</button>` : ""}<button class="mcw">💬 Yorum yaz…</button></article>`; }
  const SKC = (img) => `<article class="dcard ig dsk"><div class="dch"><div class="avw"><div class="av"><span class="sk" style="width:100%;height:100%;border-radius:50%"></span></div></div><div class="dcn"><b><span class="sk" style="width:8em"></span></b></div></div>
    ${img ? `<div class="igm"><span class="sk" style="display:block;width:100%;height:100%;border-radius:0"></span></div>` : ""}<div class="dcf"><span><span class="sk" style="width:3em"></span></span><span><span class="sk" style="width:3em"></span></span></div><div class="dct"><span class="sk" style="width:80%"></span></div></article>`;

  // ---- liste: kart başına anahtarlı yerleştirme (aynı kalan kart DOM'da kalır: resim yeniden yüklenmez, kayma yok)
  function patch(box, items, htmlOf) { if (!box) return; const old = new Map(); [...box.children].forEach((e) => { if (e.dataset && e.dataset.id) old.set(e.dataset.id, e); else e.remove(); });
    let prev = null;
    for (const m of items) { const id = String(m.id), h = htmlOf(m); let el = old.get(id);
      if (!el) { const t = document.createElement("template"); t.innerHTML = h.trim(); el = t.content.firstElementChild; el.__h = h; fillTimes(el); }
      else if (el.__h !== h) { const t = document.createElement("template"); t.innerHTML = h.trim(); const n = t.content.firstElementChild; fillTimes(n); el.className = n.className; el.innerHTML = n.innerHTML; el.__h = h; } // değişen kart yerinde güncellenir (düğüm kalır)
      old.delete(id); const want = prev ? prev.nextSibling : box.firstChild; if (el !== want) box.insertBefore(el, want); prev = el; }
    old.forEach((e) => e.remove()); }

  // ---- ekran iskeleti
  function shell() { const b = $("durumBody"); if (!b || b.dataset.on) return; b.dataset.on = 1;
    b.innerHTML = `<div class="dhead"><div class="dtabs" role="tablist">${TABS.map(([k, t]) => `<button data-t="${k}" role="tab" class="${k === dtab ? "on" : ""}">${t}</button>`).join("")}</div><div class="dstat" id="dStat"></div></div>
      <div id="dPost"></div>${TABS.map(([k]) => `<div class="dlist" data-t="${k}"${k === dtab ? "" : " hidden"}><div class="dcards"></div><div class="dtail"></div></div>`).join("")}`;
    b.addEventListener("click", onClick); postBtn(); statDraw(); }
  // Üst şerit (yer baştan ayrılmış, tek satır): okunuyor / yeni durum var / kaç kişinin akışı
  function statDraw() { const el = $("dStat"); if (!el) return; const s = S(dtab);
    const ld = s.loading > 0 ? `<span class="dspin">🔄</span> ${nf0(s.loading)} kişinin durumları okunuyor…` : "";
    const h = s.fresh > 0 ? `<button class="dfresh" onclick="durumUst()">⬆️ ${nf0(s.fresh)} yeni durum · göster</button>${ld ? " " + ld : ""}` : ld || (dtab === "team" ? "🏢 Ekip içi paylaşımlar · Sugo'da görünmez" : s.people ? `👥 ${nf0(s.people)} kişinin durumları` : "");
    if (el.__h !== h) { el.__h = h; el.innerHTML = h; } }
  window.durumUst = () => { const p = $("p-durum"); S(dtab).fresh = 0; statDraw(); if (p) p.scrollTop = 0; };
  function postBtn() { const el = $("dPost"); if (!el) return; const h = canPost() ? `<button class="dpostb" onclick="durumYaz()"><span class="dpav">🏢</span><span class="dpt">Ekibe durum paylaş…<small>resim · video · yazı — ekip içi, Sugo'da görünmez</small></span><span class="dpplus">＋</span></button>` : "";
    if (el.innerHTML !== h) el.innerHTML = h; }
  const listEl = (t) => document.querySelector(`#durumBody .dlist[data-t="${t}"]`);
  function draw(t) { const L = listEl(t); if (!L) return; const s = S(t), cards = L.querySelector(".dcards"), tail = L.querySelector(".dtail");
    if (!s.items) { if (!cards.querySelector(".dsk")) cards.innerHTML = SKC(1) + SKC(1) + SKC(0); tailSet(tail, ""); return; }
    patch(cards, s.items, (m) => cardH(m));
    if (!s.items.length) { tailSet(tail, s.err ? errH(t) : `<div class="dempty">${t === "following" ? "Takip ettiklerimiz henüz durum paylaşmamış." : t === "friends" ? "Arkadaşlarımız henüz durum paylaşmamış." : t === "team" ? `Henüz ekip paylaşımı yok.${canPost() ? " İlk paylaşımı üstteki ＋ ile yapın." : ""}` : "Henüz durum yok."}</div>`); return; }
    // Sonraki sayfa: yer tutucu kartların arasında (gelen kartlar onun yerine geçer); kuyruk boş kalır → altta görünen hiçbir şey itilmez (kayma yok)
    if (s.busy && s.next) cards.insertAdjacentHTML("beforeend", SKC(1));
    tailSet(tail, s.err ? errH(t) : s.next ? "" : `<div class="dend">· Hepsi bu kadar ·</div>`); }
  const errH = (t) => `<div class="dempty">❌ ${esc(S(t).err)} <button onclick="durumYenile('${t}')">Tekrar dene</button></div>`;
  const tailSet = (el, h) => { if (el && el.__h !== h) { el.__h = h; el.innerHTML = h; } };
  // Kendi (yerel, resmi data:) paylaşımımız saklanmaz; diğerleri resimleriyle aynen saklanır (önbellekten çizilen kart sonra büyümesin)
  const save = (t) => { const s = S(t); if (!s.items) return; lsSet(LSK + t, { items: s.items.filter((m) => !m.__local).slice(0, PAGE_KEEP), next: s.items.length > PAGE_KEEP ? null : s.next, people: s.people, at: Date.now() }); };

  // ---- sunucu
  async function load(t, more) { const s = S(t); if (s.busy) return; if (more && !s.next) return; s.busy = true; if (more) draw(t);
    let d; try { d = await api("moments_feed", more ? { tab: t, cursor: s.next } : { tab: t }); } catch (e) { d = { error: "Bağlantı yok" }; }
    s.busy = false; const r = d && d.report;
    if (!r || !Array.isArray(r.items)) { s.err = (d && d.error) || "Durumlar okunamadı"; if (!s.items) s.items = []; draw(t); return; }
    s.err = null; s.at = Date.now(); const got = r.items.filter((m) => m && m.id != null);
    if (!more) { s.loading = Number(r.loading) || 0; if (r.people != null) s.people = r.people; } const oldIds = new Set((s.items || []).map((m) => String(m.id)));
    if (more) { const ids = new Set(s.items.map((m) => String(m.id))); s.items = s.items.concat(got.filter((m) => !ids.has(String(m.id)))); s.next = r.next || null; }
    else { const old = s.items || [], ids = new Set(got.map((m) => String(m.id))), loc = old.filter((m) => m.__local && !ids.has(String(m.id))); // derin kaydırılmışsa eski sayfalar korunur (imleç yine geçerli)
      const deep = old.length > got.length + loc.length && got.length, lastAt = got.length ? Date.parse(got[got.length - 1].at) || 0 : 0;
      s.items = [...loc, ...got, ...(deep ? old.filter((m) => !m.__local && !ids.has(String(m.id)) && (Date.parse(m.at) || 0) <= lastAt) : [])]; if (!deep) s.next = r.next || null; }
    const up = keepAnchor(() => draw(t), oldIds); if (!more && up && oldIds.size) s.fresh += up; save(t); if (t === dtab) statDraw(); setTimeout(nearEnd, 50); } // ekran dolmadıysa (kısa akış) sıradaki sayfa hemen
  // Tazelemede bakılan kart yerinde kalır (en üstteyken de): yeni kartlar görünen kartın üstüne, ekran dışına girer → kayma yok; şeritte "⬆️ N yeni durum"
  // Dönüş: bakılan kartın üstüne eklenen yeni kart sayısı
  function keepAnchor(f, oldIds) { const p = $("p-durum"); if (!p || !p.classList.contains("on")) { f(); return 0; } const hd = document.querySelector("#durumBody .dhead"), top = (hd ? hd.getBoundingClientRect().bottom : p.getBoundingClientRect().top) + 4;
    const vis = [...p.querySelectorAll(".dlist:not([hidden]) .dcard[data-id]")].filter((e) => e.getBoundingClientRect().bottom > top).slice(0, 4).map((e) => [e.dataset.id, e.getBoundingClientRect().top]);
    if (!vis.length) { f(); return 0; } f(); let b = null, y0 = 0; // bakılan kart kalktıysa sıradaki görünen kart tutulur
    for (const [id, y] of vis) { b = p.querySelector(`.dlist:not([hidden]) .dcard[data-id="${CSS.escape(id)}"]`); if (b) { y0 = y; break; } }
    if (!b) return 0; const dy = b.getBoundingClientRect().top - y0; if (Math.abs(dy) > 0.5) p.scrollTop += dy;
    let n = 0; if (oldIds) for (let e = b.previousElementSibling; e; e = e.previousElementSibling) if (e.dataset && e.dataset.id && !oldIds.has(e.dataset.id)) n++; return n; }
  function nearEnd() { const p = $("p-durum"); if (!p || !p.classList.contains("on")) return; const s = S(dtab); if (s.busy || !s.next || s.err) return;
    if (p.scrollHeight - p.scrollTop - p.clientHeight < 900) load(dtab, true); }
  function sub(t) { if (!TABS.some((x) => x[0] === t)) return; dtab = t; try { localStorage.setItem("bw_durum_tab", t); } catch (e) {}
    document.querySelectorAll("#durumBody .dtabs button").forEach((b) => b.classList.toggle("on", b.dataset.t === t));
    document.querySelectorAll("#durumBody .dlist").forEach((l) => { l.hidden = l.dataset.t !== t; }); draw(t); statDraw();
    const p = $("p-durum"), h = document.querySelector("#durumBody .dhead"); if (p && h && p.scrollTop > h.offsetTop) p.scrollTop = 0; // alt sekme değişince akışın başı
    const s = S(t); if (!s.at || Date.now() - s.at > STALE) load(t); }
  // Kart düğmeleri (akış, detay, kişinin durumları ortak): ⋯ menü · devamı · yorumların hepsini gör · ❤️ beğen · 💬 yorumlar · Yorum yaz
  function cardBtn(e) { const b = e.target.closest && e.target.closest(".igmenu, .igdev, .igall, .mlk, .mcm, .mcw"); if (!b) return false; e.stopPropagation(); const c = b.closest(".dcard[data-id]"), id = c && c.dataset.id;
    if (b.classList.contains("igmenu")) { if (b.dataset.tmenu) durumEkipMenu(b.dataset.tmenu); else if (b.dataset.menu) durumMenu(b.dataset.menu); }
    else if (b.classList.contains("mlk")) { if (id) durumBegen(id); }
    else if (b.classList.contains("mcw")) { if (id) durumYorum(id); }
    else if (b.classList.contains("igall") || b.classList.contains("mcm") || b.dataset.ac) { if (c && !c.classList.contains("full")) durumAc(id); }
    else { const d = c && c.querySelector(".dct"); if (d) d.classList.add("full"); b.remove(); } // açıklama yerinde açılır
    return true; }
  // 🌐 Sugo beğeni / yorum (bayi hesabıyla herkese açık). Bayrak kapalı: yalnız bilgi, istek yok
  const yakinda = () => toast("🌐 Sugo'da beğeni / yorum yakında (gönderilmedi)");
  function likeSet(id, on) { const m = MOM[id]; if (!m) return; m.liked = on; m.likes = Math.max(0, Number(m.likes || 0) + (on ? 1 : -1));
    document.querySelectorAll(`.dcard[data-id="${CSS.escape(id)}"] .mlk`).forEach((b) => { b.classList.toggle("lk", on); b.innerHTML = likeH(m); });
    for (const k of Object.keys(st)) if ((st[k].items || []).some((x) => String(x.id) === id)) save(k); }
  function kalp(id) { document.querySelectorAll(`.dcard[data-id="${CSS.escape(id)}"] .igm`).forEach((g) => { const i = document.createElement("i"); i.className = "dheart"; i.textContent = "❤️"; g.appendChild(i); setTimeout(() => i.remove(), 900); }); }
  window.durumBegen = async (id, cift) => { const m = MOM[id]; if (!m || m.src === "team") return; if (!window.MOMENT_WRITE_ON) { yakinda(); return; }
    if (cift) { kalp(id); if (m.liked) return; } const on = !m.liked; likeSet(id, on);
    let d; try { d = await api("moment_like", { id, on }); } catch (e) { d = { error: "Bağlantı yok" }; } if (d.error) { likeSet(id, !on); toast("❌ " + d.error, true); } };
  window.durumYorum = (id) => { const m = MOM[id]; if (!m || m.src === "team") return; if (!window.MOMENT_WRITE_ON) { yakinda(); return; } const t0 = yorumTaslak[id] || "";
    openModal(`<div class="dpost"><h3 style="margin:0 0 6px">💬 Yorum yaz</h3><div class="dwarn">🌐 Bayi hesabıyla <b>Sugo'da herkese açık</b> yazılır.</div>
      <textarea id="dyTxt" rows="3" maxlength="500" placeholder="Yorumunuz…" oninput="durumYorumTaslak('${escA(id)}', this.value)">${esc(t0)}</textarea><div class="s" id="dySt" style="min-height:18px;margin:6px 0"></div>
      <div class="dpbtns"><button onclick="closeModal()">Vazgeç</button><button class="go" id="dyGo" onclick="durumYorumGonder('${escA(id)}')">Gönder</button></div></div>`, true); };
  const yorumTaslak = {}; window.durumYorumTaslak = (id, v) => { yorumTaslak[id] = v; };
  window.durumYorumGonder = async (id) => { const text = String(yorumTaslak[id] || "").trim(), g = $("dyGo"); if (!text || !g || g.disabled) return; g.disabled = true; $("dySt").textContent = "⏳ Gönderiliyor…";
    let d; try { d = await api("moment_comment_add", { id, text }); } catch (e) { d = { error: "Bağlantı yok" }; }
    if (d.error) { if ($("dySt")) $("dySt").textContent = "❌ " + d.error; if ($("dyGo")) { $("dyGo").disabled = false; $("dyGo").textContent = "↻ Tekrar dene"; } return; } // yazı kaybolmaz
    delete yorumTaslak[id]; const m = MOM[id]; if (m) { m.comments = Number(m.comments || 0) + 1; document.querySelectorAll(`.dcard[data-id="${CSS.escape(id)}"] .mcm b`).forEach((b) => { b.textContent = nf0(m.comments); }); }
    closeModal(); toast(typeof d.ok === "string" ? d.ok : "💬 Yorum gönderildi"); };
  // ❤️ Çift dokunuş (Sugo kartının görselinde) = beğeni; tek dokunuş eskisi gibi (resim büyür / yazı karesinde detay) — 280 ms beklenir. Yakalama evresi: büyütme işleyicisinden önce
  let tap0 = null;
  window.addEventListener("click", (e) => { const g = e.target.closest && e.target.closest(".dcard.ig:not(.tcard):not(.dsk) .igm"); if (!g || e.target.closest("video")) return; const c = g.closest(".dcard[data-id]"); if (!c) return;
    e.stopPropagation(); e.preventDefault(); const id = c.dataset.id, now = Date.now();
    if (tap0 && tap0.id === id && now - tap0.t < 320) { clearTimeout(tap0.h); tap0 = null; durumBegen(id, true); return; }
    const im = e.target.closest("[data-img]"), full = c.classList.contains("full"); if (tap0) clearTimeout(tap0.h);
    tap0 = { id, t: now, h: setTimeout(() => { tap0 = null; if (im) lbOpen(im.dataset.img); else if (!full) durumAc(id); }, 280) }; }, true);
  // 🏢 Ekip paylaşımı menüsü: 🙈 Gizle (silinmez; yazan ya da sahip — sunucu da denetler)
  window.durumEkipMenu = (id) => { const m = MOM[id]; if (!m) return;
    openModal(`<div class="igmn"><div class="igmnh"><b>🏢 ${esc(m.n || "Ekip")}</b><span class="s">· ${timeTag(m.at)}</span></div>${m.own ? `<button onclick="durumGizle('${escA(id)}')">🙈 Gizle</button>` : ""}<button onclick="closeModal()">Vazgeç</button></div>`); fillTimes($("modalBox")); };
  window.durumGizle = (id) => openModal(`<div class="dpost"><h3 style="margin:0 0 8px">🙈 Paylaşım gizlensin mi?</h3><div class="s" style="margin-bottom:12px">Ekipte kimse görmez. Kayıt ve dosyalar silinmez.</div>
    <div class="s" id="dgSt" style="min-height:18px;margin-bottom:6px"></div><div class="dpbtns"><button onclick="closeModal()">Vazgeç</button><button class="go" id="dgGo" onclick="durumGizleOnay('${escA(id)}')">🙈 Gizle</button></div></div>`);
  window.durumGizleOnay = async (id) => { const g = $("dgGo"); if (!g || g.disabled) return; g.disabled = true;
    let d; try { d = await api("team_post_hide", { id }); } catch (e) { d = { error: "Bağlantı yok" }; }
    if (d.error) { if ($("dgSt")) $("dgSt").textContent = "❌ " + d.error; if ($("dgGo")) $("dgGo").disabled = false; return; }
    for (const k of Object.keys(st)) { const s = st[k]; if (s.items && s.items.some((x) => String(x.id) === id)) { s.items = s.items.filter((x) => String(x.id) !== id); draw(k); save(k); } }
    delete MOM[id]; closeModal(); toast(typeof d.ok === "string" ? d.ok : "🙈 Gizlendi"); };
  window.durumMenu = (uid) => { const m = Object.values(MOM).find((x) => String(x.uid) === String(uid)) || { uid, n: "" };
    openModal(`<div class="igmn"><div class="igmnh">${avBox(m)}<b>${nameH(uid, m.n)}</b></div><button onclick="durumGit('p','${escA(uid)}')">👤 Profili aç</button>${typeof can !== "function" || can("mesaj") ? `<button onclick="durumGit('c','${escA(uid)}')">💬 Sohbet aç</button>` : ""}<button onclick="closeModal()">Vazgeç</button></div>`); };
  window.durumGit = (k, uid) => { closeModal(); if (k === "p") { if (typeof prof === "function") prof(uid); return; }
    if ($("prof") && $("prof").classList.contains("on") && window.profMsg) profMsg(uid); else if (typeof pick === "function") pick(uid); else openChat(uid); };
  // Çoklu resim: yana kaydırınca nokta ve "2/4" güncellenir (kaydırma olayı kabarcıklanmaz: yakalama evresinde)
  document.addEventListener("scroll", (e) => { const c = e.target; if (!c || !c.classList || !c.classList.contains("igcs")) return; const i = Math.round(c.scrollLeft / Math.max(1, c.clientWidth)), n = c.children.length;
    const w = c.parentElement, dots = w.nextElementSibling; const cn = w.querySelector(".igcn"); if (cn) cn.textContent = `${Math.min(i + 1, n)}/${n}`;
    if (dots && dots.classList.contains("igdots")) [...dots.children].forEach((d, k) => d.classList.toggle("on", k === i)); }, true);
  function onClick(e) { const tb = e.target.closest(".dtabs button"); if (tb) { sub(tb.dataset.t); return; } if (cardBtn(e)) return;
    const u = e.target.closest("[data-u]"); if (u) { e.stopPropagation(); if (typeof prof === "function") prof(u.dataset.u); return; }
    if (e.target.closest("video,button,a")) return; const c = e.target.closest(".dcard[data-id]"); if (c && !c.classList.contains("dsk")) durumAc(c.dataset.id); }
  window.durumDaha = (t) => load(t, true);
  window.durumYenile = (t) => { const s = S(t), more = !!(s.items && s.items.length && s.next); s.err = null; s.items = s.items || []; draw(t); load(t, more); }; // sonraki sayfa hata verdiyse o sayfa yeniden
  function show(force) { shell(); postBtn(); draw(dtab); const s = S(dtab); if (force || !s.at || Date.now() - s.at > STALE) load(dtab); }
  window.durumShow = show;
  // Gizli alt sekmeler (ve sekme açılmadan önce akış) boşta önbellekten çizilir: dokununca hazır
  function boot() { shell(); draw(dtab); idleRun(() => TABS.forEach(([k]) => { if (k !== dtab) draw(k); })); }
  window.__durumReset = () => { for (const k of Object.keys(st)) delete st[k]; const b = $("durumBody"); if (b) { b.innerHTML = ""; delete b.dataset.on; } boot(); }; // senaryolar: telefonda saklı akıştan yeniden açılış

  // ---- ana sayfaya kancalar: sekme yetkisi (mesaj), aşağı çekip yenile, rol değişince paylaş düğmesi
  try { TAB_PERM.durum = "mesaj"; } catch (e) {}
  // Sekmeye geçiş (tab → refreshTab): son okuma 60 sn'den eskiyse okunur · ↻ ve aşağı çekme: her zaman okunur
  let tabSw = 0;
  try { const tb0 = tab; tab = function () { tabSw = Date.now(); return tb0.apply(this, arguments); }; } catch (e) {}
  try { const rt0 = refreshTab; refreshTab = function () { if (curTab === "durum") { show(Date.now() - tabSw > 40); try { loadTablet(); } catch (e) {} return; } return rt0.apply(this, arguments); }; } catch (e) {}
  try { const ap0 = applyPerms; applyPerms = function () { const r = ap0.apply(this, arguments); postBtn(); return r; }; } catch (e) {}
  const pane = $("p-durum"); if (pane) { let raf = 0; pane.addEventListener("scroll", () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; nearEnd();
    const s = S(dtab); if (s.fresh && pane.scrollTop < 40) { s.fresh = 0; statDraw(); } }); }, { passive: true }); } // en üste çıkınca "yeni durum" şeridi söner
  // Sunucu kişileri okurken (loading > 0) 20 sn'de bir sessiz tazeleme; yalnız Durum sekmesi ekranda ve uygulama önündeyken
  const tick = () => { const p = $("p-durum"); if (document.visibilityState !== "visible" || !p || !p.classList.contains("on") || !$("inbox").classList.contains("on")) return false;
    const s = S(dtab); if (!(s.loading > 0) || s.busy) return false; load(dtab); return true; };
  window.__durumTick = tick; setInterval(tick, TICK);
  setInterval(() => { if (document.visibilityState === "visible") { const p = $("p-durum"); if (p && p.classList.contains("on")) fillTimes(p); } }, 60_000);

  // ---- gönderi detayı: beğenenler + yorumlar (sayfalı)
  let dd = null;
  const personH = (x, extra) => `<div class="drow"><div class="avw" data-u="${escA(x.uid)}"><div class="av dsm">${avHtml(x.n, x.av)}</div></div><div class="b"><div class="t"><b data-u="${escA(x.uid)}">${nameH(x.uid, x.n)}</b>${x.at ? `<span class="s">${timeTag(x.at)}</span>` : ""}</div>${extra || ""}</div></div>`;
  const comH = (x) => personH(x, `<div class="dcom">${x.reply_to ? `<span class="drep">↪ <b>${nameH(x.reply_to.uid, x.reply_to.n)}</b></span> ` : ""}${txtH(x.t || "")}</div>`);
  window.durumAc = (id) => { const m = MOM[String(id)]; if (!m) return;
    if (m.src === "team") { dd = null; openModal(`<div class="ddet">${cardH(m, true)}<button class="fullbtn" style="margin-top:10px" onclick="closeModal()">Kapat</button></div>`); const bx = $("modalBox"); fillTimes(bx);
      bx.querySelector(".ddet").addEventListener("click", (e) => { cardBtn(e); }); bx.onscroll = null; return; }
    dd = { id: String(id), k: Number(m.comments) > 0 || !Number(m.likes) ? "c" : "l", c: { items: null, next: null, total: m.comments, busy: false }, l: { items: null, next: null, total: m.likes, busy: false } };
    openModal(`<div class="ddet">${cardH(m, true)}<div class="ddtabs"><button data-k="c">💬 Yorumlar <b id="ddNc">${nf0(m.comments)}</b></button><button data-k="l">❤️ Beğenenler <b id="ddNl">${nf0(m.likes)}</b></button></div>
      <div id="ddList" class="ddlist"></div><div id="ddTail"></div><button class="fullbtn" style="margin-top:10px" onclick="closeModal()">Kapat</button></div>`);
    const box = $("modalBox"); fillTimes(box); box.querySelector(".ddet").addEventListener("click", (e) => { if (cardBtn(e)) return; const b = e.target.closest(".ddtabs button"); if (b) { ddTab(b.dataset.k); return; }
      const u = e.target.closest("[data-u]"); if (u) { e.stopPropagation(); closeModal(); if (typeof prof === "function") prof(u.dataset.u); } });
    box.onscroll = () => { if (dd && box.scrollHeight - box.scrollTop - box.clientHeight < 300) ddLoad(true); }; ddTab(dd.k); };
  function ddTab(k) { if (!dd) return; dd.k = k; document.querySelectorAll("#modalBox .ddtabs button").forEach((b) => b.classList.toggle("on", b.dataset.k === k)); ddDraw(); if (!dd[k].items) ddLoad(false); }
  function ddDraw() { if (!dd || !$("ddList")) return; const L = dd[dd.k], box = $("ddList");
    // Okunurken aynı boyda not kutusu (Sugo listeyi vermeyince yerine not gelir: pencere kaymaz)
    if (!L.items) { box.innerHTML = `<div class="dnote"><span class="sk" style="width:14em"></span><span class="sk" style="width:9em"></span></div>`; $("ddTail").innerHTML = ""; return; }
    if (L.unav) { const n = nf0(L.total ?? 0); box.innerHTML = `<div class="dnote"><b>${dd.k === "c" ? "💬 " + n + " yorum" : "❤️ " + n + " beğeni"}</b><span>Sugo ${dd.k === "c" ? "yorum" : "beğenen"} listesini dışarıya vermiyor; yalnız sayı görünür.</span></div>`; $("ddTail").innerHTML = ""; return; }
    box.innerHTML = L.items.length ? L.items.map(dd.k === "c" ? comH : (x) => personH(x)).join("") : `<div class="dnote"><b>${dd.k === "c" ? "💬 " + nf0(L.total ?? 0) + " yorum" : "❤️ " + nf0(L.total ?? 0) + " beğeni"}</b><span>${L.err ? "❌ " + esc(L.err) : dd.k === "c" ? "Henüz yorum yok." : "Henüz beğenen yok."}</span></div>`; fillTimes(box); // aynı boy not kutusu
    $("ddTail").innerHTML = L.busy ? `<div class="dend">⏳ Yükleniyor…</div>` : L.next ? `<button class="dmorebtn" id="ddMore" onclick="durumDdDaha()">⬇️ Daha fazla</button>` : L.items.length ? `<div class="dend">· Hepsi bu kadar ·</div>` : ""; }
  window.durumDdDaha = () => ddLoad(true);
  async function ddLoad(more) { if (!dd) return; const k = dd.k, L = dd[k], id = dd.id; if (L.busy || (more && !L.next)) return; L.busy = true; if (more) ddDraw();
    const d = await api(k === "c" ? "moment_comments" : "moment_likes", more ? { id, cursor: L.next } : { id }); L.busy = false; if (!dd || dd.id !== id) return;
    const r = d && d.report; if (!r || !Array.isArray(r.items)) { L.err = (d && d.error) || "Okunamadı"; if (!L.items) L.items = []; ddDraw(); return; }
    L.err = null; L.unav = !!r.unavailable; L.items = more ? L.items.concat(r.items) : r.items; L.next = L.unav ? null : r.next || null; if (r.total != null) { L.total = r.total; const n = $(k === "c" ? "ddNc" : "ddNl"); if (n) n.textContent = nf0(r.total); }
    if (dd.k === k) ddDraw(); }

  // ---- 🏢 ekip paylaşımı: yazı + 0–9 resim (1600 px JPEG + 500 px küçük hâl) + 0–1 video (≤ 60 sn, ≤ 25 MB) → team_post_prep → Storage'a doğrudan yükleme → team_post_add
  // Taslak bellekte kalır (pencere kapansa, hata olsa da); "Tekrar dene" aynı paylaşım kimliğiyle yalnız eksik dosyaları yükler. Medya değişirse yeni kimlik.
  const yeniTaslak = () => ({ text: "", imgs: [], video: null, busy: false, prep: 0, vprep: 0, pid: null, ups: null, done: {}, err: "" });
  let post = yeniTaslak(); window.durumPost = post;
  const planDegisti = () => { post.pid = null; post.ups = null; post.done = {}; };
  const mbS = (b) => (b / 1048576).toFixed(1).replace(".", ",");
  window.durumYaz = () => { if (!canPost()) { toast("Ekip paylaşımı yalnız ajans sahibi ve bayi yetkilisinde", true); return; } composer(); };
  function composer() { openModal(`<div class="dpost"><h3 style="margin:0 0 6px">🏢 Ekibe paylaş</h3><div class="dteam">🏢 <b>Ekip içi — Sugo'da görünmez.</b> Yalnız panel kullanıcıları görür; Sugo'ya hiçbir şey gitmez.</div>
      <textarea id="dpTxt" rows="4" maxlength="2000" placeholder="Ekibe not, duyuru, fiyat listesi…" oninput="durumPost.text=this.value;durumPostUpd()">${esc(post.text)}</textarea>
      <div id="dpImgs" class="dpimgs"></div><input type="file" id="dpFile" accept="image/*" multiple hidden onchange="durumResimler(this.files);this.value=''">
      <input type="file" id="dpVid" accept="video/mp4,video/quicktime,video/webm,video/*" hidden onchange="durumVideo(this.files[0]);this.value=''">
      <div class="s dp2" id="dpInfo" style="margin:6px 0 2px"></div><div id="dpProg" class="dprog det" style="visibility:hidden"><i></i></div><div class="s dp2" id="dpSt" style="margin:4px 0 8px"></div>
      <div class="dpbtns"><button id="dpBack" onclick="closeModal()">Vazgeç</button><button class="go" id="dpGo" onclick="durumGonder()">Paylaş</button></div></div>`, true);
    imgsDraw(); if (post.err) stSet("❌ " + post.err + " — içerik duruyor, tekrar deneyin"); }
  function imgsDraw() { const el = $("dpImgs"); if (!el) return; const n = post.imgs.length, v = post.video, kil = post.busy ? " disabled" : "";
    el.innerHTML = post.imgs.map((x, i) => `<div class="dpi"><img src="${x.th || x.url}" alt=""><button onclick="durumResimSil(${i})" aria-label="Resmi çıkar"${kil}>✕</button></div>`).join("")
      + (v ? `<div class="dpi dpv"><video src="${v.url}" poster="${v.poster}" muted playsinline controls preload="metadata"></video><i class="dvdur">▶ ${dur(v.dur)}</i><button onclick="durumVideoSil()" aria-label="Videoyu çıkar"${kil}>✕</button></div>` : "")
      + (post.prep ? Array.from({ length: post.prep }, () => `<div class="dpi"><span class="sk" style="display:block;width:100%;height:100%"></span></div>`).join("") : "")
      + (n + post.prep < MAXIMG ? `<button class="dpadd" onclick="$('dpFile').click()"${kil}>📷<small>Resim ekle</small></button>` : "")
      + (post.vprep ? `<div class="dpi"><span class="sk" style="display:block;width:100%;height:100%"></span></div>` : !v ? `<button class="dpadd" onclick="$('dpVid').click()"${kil}>🎬<small>Video ekle</small></button>` : ""); // gönderilirken düğmeler kalır (kilitli): ızgara boyu değişmez
    window.durumPostUpd(); }
  window.durumPostUpd = () => { const i = $("dpInfo"), g = $("dpGo"), n = post.imgs.length, v = post.video, kb = post.imgs.reduce((t, x) => t + x.kb, 0);
    if (i) i.textContent = post.prep || post.vprep ? `⏳ Hazırlanıyor… (${n} resim${v ? " · 1 video" : ""})` : [n ? `${n}/${MAXIMG} resim · ${kb > 1024 ? (kb / 1024).toFixed(1).replace(".", ",") + " MB" : kb + " KB"} (1600 px'e küçültüldü)` : "", v ? `🎬 ${dur(v.dur)} · ${mbS(v.size)} MB` : ""].filter(Boolean).join(" · ") || "Resim (en fazla 9) ve video (en fazla 60 sn, 25 MB) eklenebilir";
    if (g) g.disabled = !!post.prep || !!post.vprep || post.busy || (!post.text.trim() && !n && !v); };
  const stSet = (t) => { const e = $("dpSt"); if (e) e.textContent = t; };
  const progSet = (k) => { const p = $("dpProg"); if (!p) return; if (k == null) { p.style.visibility = "hidden"; return; } p.style.visibility = "visible"; p.firstElementChild.style.width = Math.round(Math.min(1, k) * 100) + "%"; };
  window.durumResimSil = (i) => { if (post.busy) return; post.imgs.splice(i, 1); planDegisti(); imgsDraw(); };
  window.durumVideoSil = () => { if (post.busy || !post.video) return; try { URL.revokeObjectURL(post.video.url); } catch (e) {} post.video = null; planDegisti(); imgsDraw(); };
  window.durumResimler = async (files) => { if (post.busy) return; const list = [...(files || [])].filter((f) => /^image\//.test(f.type)).slice(0, MAXIMG - post.imgs.length - post.prep);
    if (!list.length) { if ((files || []).length) toast(`En fazla ${MAXIMG} resim`, true); return; } post.prep += list.length; planDegisti(); imgsDraw();
    for (const f of list) { try { const x = await shrink(f); post.imgs.push(x); } catch (e) { toast("Resim okunamadı: " + (f.name || ""), true); } post.prep--; imgsDraw(); } };
  window.durumKucult = shrink; // senaryolar
  // Tek kaynaktan iki boy: tam (≤ 1600 px, JPEG %85) + küçük hâl (≤ 500 px, akış ve ızgara için)
  async function shrink(file) { let src, w, h, close = () => {};
    if (window.createImageBitmap) { try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { src = null; } }
    if (!src) { const u = URL.createObjectURL(file); src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; }); close = () => URL.revokeObjectURL(u); }
    w = src.width || src.naturalWidth; h = src.height || src.naturalHeight;
    const boy = (max, q) => { const k = Math.min(1, max / Math.max(w, h)), W = Math.max(1, Math.round(w * k)), H = Math.max(1, Math.round(h * k)), c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(src, 0, 0, W, H); return { url: c.toDataURL("image/jpeg", q), w: W, h: H }; };
    const a = boy(MAXPX, 0.85), t = boy(THPX, 0.8); close(); try { src.close && src.close(); } catch (e) {}
    return { url: a.url, w: a.w, h: a.h, kb: Math.round((a.url.length * 3) / 4 / 1024), th: t.url, tw: t.w, thh: t.h }; }
  // 🎬 Video: tür / boyut / süre denetimi (sunucu da aynısını yapar) + önizleme + kapak (ilk kare, ≤ 500 px)
  const VTYPES = { "video/mp4": 1, "video/quicktime": 1, "video/webm": 1 };
  window.durumVideoKontrol = (v) => !v ? "Video okunamadı" : !VTYPES[v.type] ? "Video türü desteklenmiyor (mp4 / mov / webm)"
    : v.size > VMAX ? `Video çok büyük (${mbS(v.size)} MB) — en fazla 25 MB. Telefonda kısaltın ya da daha düşük kaliteyle çekip yeniden seçin.`
    : !(v.dur > 0) ? "Video süresi okunamadı" : v.dur > VSEC + 0.5 ? `Video ${Math.round(v.dur)} sn — en fazla ${VSEC} sn. Telefonda kısaltıp yeniden seçin.` : "";
  const vType = (f) => f.type || (/\.mov$/i.test(f.name || "") ? "video/quicktime" : /\.webm$/i.test(f.name || "") ? "video/webm" : "video/mp4");
  window.durumVideo = async (f) => { if (!f || post.busy) return; if (post.video) { toast("En fazla 1 video", true); return; }
    const type = vType(f), on = window.durumVideoKontrol({ type, size: f.size, dur: 1 }); if (on) { toast(on, true); return; } // boyut / tür: dosyayı açmadan
    post.vprep = 1; imgsDraw(); let m = null; try { m = await vidMeta(f); } catch (e) { m = null; } post.vprep = 0;
    const hata = window.durumVideoKontrol({ type, size: f.size, dur: m && m.dur }); if (hata) { if (m) try { URL.revokeObjectURL(m.url); } catch (e) {} toast(hata, true); imgsDraw(); return; }
    post.video = { file: f, type, size: f.size, url: m.url, dur: m.dur, w: m.w, h: m.h, poster: m.poster }; planDegisti(); imgsDraw(); };
  async function vidMeta(f) { const url = URL.createObjectURL(f), v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    const bekle = (ev, ms) => new Promise((res, rej) => { const t = setTimeout(() => (ev === "loadedmetadata" ? rej(new Error("zaman")) : res()), ms); v.addEventListener(ev, () => { clearTimeout(t); res(); }, { once: true }); if (ev === "loadedmetadata") v.addEventListener("error", () => { clearTimeout(t); rej(new Error("video")); }, { once: true }); });
    try { await bekle("loadedmetadata", 15000); } catch (e) { URL.revokeObjectURL(url); throw e; }
    let d = v.duration; if (!isFinite(d)) { const p = bekle("seeked", 4000); v.currentTime = 1e7; await p; d = v.duration; } // MediaRecorder webm: süre sona atlayınca bilinir
    const p2 = bekle("seeked", 4000); v.currentTime = Math.min(0.1, (isFinite(d) && d > 0 ? d : 1) / 2); await p2;
    const W = v.videoWidth || 320, H = v.videoHeight || 240, k = Math.min(1, THPX / Math.max(W, H)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
    const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height); try { g.drawImage(v, 0, 0, c.width, c.height); } catch (e) {}
    v.removeAttribute("src"); try { v.load(); } catch (e) {}
    return { url, dur: isFinite(d) ? Math.round(d * 10) / 10 : 0, w: W, h: H, poster: c.toDataURL("image/jpeg", 0.8) }; }
  const dBlob = (d) => { const i = d.indexOf(","), bin = atob(d.slice(i + 1)), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return new Blob([u], { type: (/^data:([^;,]+)/.exec(d) || [])[1] || "image/jpeg" }); };
  // Storage'a doğrudan yükleme (imzalı adres): ilerleme olayı; aynı dosya zaten yüklenmişse (önceki denemenin cevabı kaybolduysa) başarı sayılır
  const putFile = (url, blob, type, onp) => new Promise((res, rej) => { const x = new XMLHttpRequest(); x.open("PUT", url); x.setRequestHeader("content-type", type); x.setRequestHeader("cache-control", "max-age=2592000"); x.setRequestHeader("x-upsert", "false");
    x.upload.onprogress = (e) => onp(e.loaded); x.timeout = 300000; x.onload = () => ((x.status >= 200 && x.status < 300) || /Duplicate|already exists/i.test(x.responseText || "") ? res() : rej(new Error("yükleme hatası (" + x.status + ")")));
    x.onerror = () => rej(new Error("bağlantı koptu")); x.ontimeout = () => rej(new Error("zaman aşımı")); x.send(blob); });
  window.durumGonder = async () => { if (post.busy || post.prep || post.vprep) return; const text = post.text.trim(), n = post.imgs.length, v = post.video; if (!text && !n && !v) return;
    post.busy = true; post.err = ""; imgsDraw(); const g = $("dpGo"), bk = $("dpBack"); if (g) { g.disabled = true; g.textContent = "⏳ Paylaşılıyor…"; } if (bk) bk.disabled = true; stSet("⏳ Hazırlanıyor…");
    try {
      if (post.pid && Date.now() - (post.prepAt || 0) > 90 * 60_000) planDegisti(); // imzalı yükleme adresi 2 saat geçerli: eskidiyse yeni kimlik
      if (!post.pid) { let d; try { d = await api("team_post_prep", { imgs: n, video: v ? { type: v.type, size: v.size, dur: v.dur } : null }); } catch (e) { d = { error: "Bağlantı yok" }; }
        if (d.error || !d.report || !d.report.pid) throw new Error(d.error || "Hazırlanamadı"); post.pid = d.report.pid; post.ups = d.report.ups || []; post.done = {}; post.prepAt = Date.now(); }
      const blobOf = (k) => (k === "v" ? v.file : k === "vt" ? dBlob(v.poster) : dBlob(k[0] === "i" ? post.imgs[+k.slice(1)].url : post.imgs[+k.slice(1)].th));
      const list = post.ups.map((u) => ({ u, b: blobOf(u.k) })), tot = list.reduce((t, x) => t + x.b.size, 0) || 1; let base = list.filter((x) => post.done[x.u.k]).reduce((t, x) => t + x.b.size, 0);
      if (list.length) progSet(base / tot);
      for (const x of list) { if (post.done[x.u.k]) continue; const sor = (l) => { const k = (base + l) / tot; progSet(k); stSet(`⏫ Yükleniyor… %${Math.round(k * 100)} (${mbS(base + l)} / ${mbS(tot)} MB)`); }; sor(0);
        await putFile(x.u.url, x.b, x.u.type, sor); post.done[x.u.k] = 1; base += x.b.size; sor(0); }
      stSet("⏳ Kaydediliyor…"); let d; try { d = await api("team_post_add", { pid: post.pid, body: text, media: { images: post.imgs.map((x) => ({ w: x.w, h: x.h })), video: v ? { w: v.w, h: v.h, dur: v.dur } : null } }); } catch (e) { d = { error: "Bağlantı yok" }; }
      if (d.error || !d.report || !d.report.moment) throw new Error(d.error || "Kaydedilemedi");
      const m = d.report.moment; for (const t of ["team", "all"]) { const s = S(t); s.items = [m, ...(s.items || []).filter((x) => String(x.id) !== String(m.id))]; draw(t); save(t); }
      try { if (v) URL.revokeObjectURL(v.url); } catch (e) {} post = yeniTaslak(); window.durumPost = post; closeModal(); toast(typeof d.ok === "string" ? d.ok : "🏢 Ekibe paylaşıldı");
      if (curTab === "durum") { if (dtab !== "team" && dtab !== "all") sub("team"); const p = $("p-durum"); if (p) p.scrollTop = 0; }
    } catch (e) { post.busy = false; post.err = e.message || "Paylaşılamadı"; if (!$("dpGo")) return; imgsDraw(); progSet(null); stSet("❌ " + post.err + " — içerik duruyor, tekrar deneyin");
      const g2 = $("dpGo"), b2 = $("dpBack"); if (g2) { g2.disabled = false; g2.textContent = "↻ Tekrar dene"; } if (b2) b2.disabled = false; } };

  // ---- ⚙️ Ayarlar › 💾 Depo kullanımı (Supabase ücretsiz plan: 1 GB dosya, 500 MB veritabanı). Önce bu cihazdaki son ölçüm, sonra sunucu; satırların boyu sabit
  const depoC = () => lsGet("bw_pane_depo");
  const depoOzet = (u) => (u ? `${mbS(u.files_bytes || 0)} / ${Math.round((u.files_limit || 0) / 1048576)} MB dosya · ekip ${mbS(u.team_bytes || 0)} MB` : "dosya ve veritabanı doluluğu");
  function depoH(u) { const bar = (ic, t, b, lim, alt) => { const k = lim ? Math.min(1, b / lim) : 0, renk = k > 0.9 ? "#ef4444" : k > 0.7 ? "#f59e0b" : "#22c55e";
      return `<div class="ddp"><div class="ddpt"><span>${ic} ${t}</span><b>${u ? `${mbS(b)} MB${lim ? ` / ${Math.round(lim / 1048576)} MB` : ""}` : `<span class="sk" style="width:6em"></span>`}</b></div><div class="ddpb"><i style="width:${Math.round(k * 100)}%;background:${renk}"></i></div><div class="s">${u ? alt : "&nbsp;"}</div></div>`; };
    return bar("📁", "Dosyalar (tümü)", u ? u.files_bytes || 0 : 0, u ? u.files_limit : 0, u ? `%${Math.round(((u.files_bytes || 0) / (u.files_limit || 1)) * 100)} dolu · resim, ses, video, uygulama dosyaları` : "")
      + bar("🏢", "Ekip paylaşımları", u ? u.team_bytes || 0 : 0, u ? u.files_limit : 0, u ? `${nf0(u.team_posts || 0)} paylaşım · ${nf0(u.team_files || 0)} dosya` : "")
      + bar("🗄️", "Veritabanı", u ? u.db_bytes || 0 : 0, u ? u.db_limit : 0, u ? `%${Math.round(((u.db_bytes || 0) / (u.db_limit || 1)) * 100)} dolu` : "")
      + `<div class="s" style="margin-top:10px">Ücretsiz plan: 1 GB dosya, ayda 5 GB indirme. Akışta resimlerin küçük hâli gelir, ekip videoları yalnız dokununca iner.${u && u.at ? ` · Ölçüm ${new Date(u.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : ""}</div>`; }
  window.durumDepo = async () => { if (typeof sheet !== "function") return; sheet("depo", `<h3 style="margin:0 0 8px">💾 Depo kullanımı</h3><div id="dDepo">${depoH(depoC())}</div><button class="fullbtn" style="margin-top:12px" onclick="closeModal()">Kapat</button>`);
    let d; try { d = await api("storage_usage", {}); } catch (e) { d = { error: "Bağlantı yok" }; } const el = $("dDepo"); if (!el) return;
    if (d.error || !d.report) { if (!depoC()) el.innerHTML = depoH(null).replace(/&nbsp;/, "❌ " + esc(d.error || "Okunamadı")); else toast("❌ " + (d.error || "Depo bilgisi okunamadı"), true); return; }
    lsSet("bw_pane_depo", d.report); el.innerHTML = depoH(d.report); const o = $("dDepoS"); if (o) o.textContent = depoOzet(d.report); };
  try { const mh0 = menuHtml; menuHtml = function () { const h = mh0.apply(this, arguments), i = h.lastIndexOf('<button class="setout"'); if (i < 0 || (typeof can === "function" && !can("mesaj"))) return h;
    return h.slice(0, i) + `<div class="setlbl">Depolama</div><div class="setlist"><button class="setrow" onclick="durumDepo()"><span class="si">💾</span><span class="st">Depo kullanımı<small id="dDepoS">${esc(depoOzet(depoC()))}</small></span><span class="chev">›</span></button></div>` + h.slice(i); }; } catch (e) {}

  // ---- profil: "📸 Durumlar (n)" şeridi (sabit yükseklik: veri gelince yalnız içerik dolar)
  const pfm = {}; // uid → { items, next, total, at, busy }
  const pfmGet = (uid) => pfm[uid] || (pfm[uid] = (() => { const c = lsGet("pfm_" + uid); return { items: c ? c.items : null, next: c ? c.next : null, total: c ? c.total : null, at: 0, busy: false }; })());
  const pfmSave = (uid) => { const x = pfm[uid]; try { let k = JSON.parse(localStorage.getItem("pfm_keys") || "[]").filter((y) => y !== uid); k.push(uid); while (k.length > 40) localStorage.removeItem("pfm_" + k.shift());
    localStorage.setItem("pfm_keys", JSON.stringify(k)); localStorage.setItem("pfm_" + uid, JSON.stringify({ items: (x.items || []).slice(0, 12), next: x.next, total: x.total })); } catch (e) {} };
  // 📷 Instagram profil ızgarası: 3 sütun kare, her zaman 2 satır (6 hücre; az durum varsa boş hücre) → yükseklik sabit, veri gelince kayma yok. Dokununca gönderi detayı
  const GRID = 6;
  const tileH = (m) => { MOM[String(m.id)] = m; const im = (m.imgs || []).filter(Boolean)[0] || (m.video && m.video.thumb);
    return `<button class="dpt1" data-mid="${escA(m.id)}">${im ? `<img src="${escA(thumb(im))}" alt="" loading="lazy">` : `<span class="dptx" style="--g:${grOf(m.id)}"><span>${txtH(String(m.t || "").slice(0, 90))}</span></span>`}${m.video && m.video.url ? `<i class="dpn">▶${dur(m.video.dur) ? " " + dur(m.video.dur) : ""}</i>` : (m.imgs || []).filter(Boolean).length > 1 ? `<i class="dpn" title="Çoklu resim">⧉</i>` : ""}</button>`; };
  function stripH(uid) { const x = pfmGet(uid), bos = (n) => Array.from({ length: n }, () => `<span class="dpt1 dpbos"></span>`).join("");
    if (!x.items) return Array.from({ length: GRID }, () => `<span class="dpt1"><span class="sk" style="display:block;width:100%;height:100%;border-radius:0"></span></span>`).join("");
    if (!x.items.length) return `<div class="dpempty">${x.err ? "❌ " + esc(x.err) : "📷 Henüz durum paylaşmamış."}</div>`;
    const v = x.items.slice(0, GRID); return v.map(tileH).join("") + bos(GRID - v.length); }
  const allBtn = (uid) => { const x = pfmGet(uid); return x.items && (x.next || x.items.length > GRID) ? "" : " hidden"; };
  const countOf = (uid) => { const x = pfmGet(uid), l = (window.__pfLiveOf && __pfLiveOf(uid)) || {}; const n = l.moments_count ?? x.total ?? (x.items ? x.items.length + (x.next ? "+" : "") : null); return n == null ? "" : `(${n})`; };
  window.durumPfHtml = (uid) => { uid = String(uid); setTimeout(() => pfLoad(uid), 0);
    return `<div class="pfsec dpfh">📸 Durumlar <span class="s" id="dpfN">${countOf(uid)}</span><button class="dpfall" id="dpfAll" data-all="${escA(uid)}"${allBtn(uid)}>Tümü ›</button></div><div class="dpg" id="dpfStrip" data-uid="${escA(uid)}">${stripH(uid)}</div>`; };
  window.durumPfCount = (uid) => { const n = $("dpfN"); if (n && String(window.__pfUid) === String(uid)) n.textContent = countOf(String(uid)); };
  function pfDraw(uid) { const el = $("dpfStrip"); if (!el || el.dataset.uid !== uid) return; const h = stripH(uid); if (el.__h !== h) { el.__h = h; el.innerHTML = h; } const a = $("dpfAll"); if (a) a.hidden = !!allBtn(uid); window.durumPfCount(uid); }
  async function pfLoad(uid) { const x = pfmGet(uid); if (x.busy || (x.at && Date.now() - x.at < STALE)) return; x.busy = true;
    const d = await api("moments_user", { uid }); x.busy = false; x.at = Date.now(); const r = d && d.report;
    if (!r || !Array.isArray(r.items)) { x.err = (d && d.error) || "Okunamadı"; if (!x.items) x.items = []; pfDraw(uid); return; }
    x.err = null; x.items = r.items; x.next = r.next || null; if (r.total != null) x.total = r.total; pfmSave(uid); pfDraw(uid); }
  document.addEventListener("click", (e) => { const t = e.target.closest && e.target.closest("#dpfStrip button, #dpfAll"); if (!t) return;
    if (t.dataset.mid) durumAc(t.dataset.mid); else if (t.dataset.all) durumKisi(t.dataset.all); });
  // Kişinin tüm durumları (pencere, sayfalı)
  window.durumKisi = (uid) => { const x = pfmGet(uid), L = { items: x.items ? [...x.items] : [], next: x.next, busy: false };
    openModal(`<div class="ddet"><h3 style="margin:0 0 8px">📸 Durumlar</h3><div id="dkList"></div><div id="dkTail"></div><button class="fullbtn" style="margin-top:10px" onclick="closeModal()">Kapat</button></div>`);
    const box = $("modalBox"), drawK = () => { const el = $("dkList"); if (!el) return; patch(el, L.items, (m) => cardH(m)); $("dkTail").innerHTML = L.busy ? SKC(1) : L.next ? `<button class="dmorebtn" id="dkMore">⬇️ Daha fazla</button>` : `<div class="dend">· Hepsi bu kadar ·</div>`; };
    const more = async () => { if (L.busy || !L.next) return; L.busy = true; drawK(); const d = await api("moments_user", { uid, cursor: L.next }); L.busy = false; const r = d && d.report;
      if (r && Array.isArray(r.items)) { const ids = new Set(L.items.map((m) => String(m.id))); L.items = L.items.concat(r.items.filter((m) => !ids.has(String(m.id)))); L.next = r.next || null; } else L.next = null; drawK(); };
    box.querySelector(".ddet").addEventListener("click", (e) => { if (e.target.id === "dkMore") { more(); return; } if (cardBtn(e)) return; const u = e.target.closest("[data-u]"); if (u) { closeModal(); prof(u.dataset.u); return; }
      if (e.target.closest("video,button,a")) return; const c = e.target.closest(".dcard[data-id]"); if (c) durumAc(c.dataset.id); });
    box.onscroll = () => { if (box.scrollHeight - box.scrollTop - box.clientHeight < 400) more(); }; drawK(); };

  // ---- görünüm
  const css = document.createElement("style"); css.textContent = `
  #durumBody { min-height: 100%; }
  .dhead { position: sticky; top: 0; z-index: 5; background: var(--bg); border-bottom: 1px solid var(--line); }
  .dtabs { display: grid; grid-template-columns: 1.5fr 1.25fr .85fr 1fr; gap: 4px; padding: 8px 8px; }
  .dtabs button { padding: 8px 3px; font-size: 13px; font-weight: 700; border-radius: 999px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .dtabs button.on { background: linear-gradient(135deg, #f472b6, #a855f7 55%, #6366f1); border-color: #a855f7; color: #fff; }
  .dstat { height: 22px; line-height: 22px; padding: 0 12px 4px; font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: content-box; }
  .dstat .dspin { display: inline-block; animation: ptrspin 1.2s linear infinite; } .dfresh { padding: 0 10px; height: 22px; line-height: 20px; font-size: 12px; border-radius: 999px; color: var(--brand3); font-weight: 700; }
  .dpin { margin-left: 6px; font-size: 13px; } .dvid { position: relative; } .dvdur { position: absolute; right: 8px; bottom: 8px; font-style: normal; font-size: 12px; background: #000b; color: #fff; border-radius: 8px; padding: 1px 7px; pointer-events: none; }
  .dnote { display: flex; flex-direction: column; justify-content: center; gap: 4px; height: 96px; overflow: hidden; margin: 8px 0; padding: 10px 12px; border-radius: 12px; border: 1px dashed var(--line); font-size: 14px; color: var(--muted); } .dnote b { color: var(--text); font-size: 15px; }
  .dpostb { display: flex; align-items: center; gap: 10px; width: calc(100% - 20px); margin: 10px 10px 0; text-align: left; border-radius: 16px; padding: 10px 12px; background: var(--panel); border: 1px dashed color-mix(in srgb, var(--brand) 60%, transparent); }
  .dpostb .dpav { width: 40px; height: 40px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; font-size: 20px; background: linear-gradient(135deg, var(--go2), var(--go)); }
  .dpostb .dpt { flex: 1; min-width: 0; color: var(--text); font-weight: 600; font-size: 15px; } .dpostb .dpt small { display: block; color: var(--muted); font-weight: 400; font-size: 12px; }
  .dpostb .dpplus { flex: none; font-size: 22px; color: var(--brand3); }
  /* 📷 Gönderi (Instagram gibi): kenardan kenara, alt çizgiyle ayrılır */
  .dct { margin: 10px 0 0; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; } .dct.full { display: block; }
  .dcard.ig { background: transparent; border: 0; border-bottom: 1px solid var(--line); border-radius: 0; margin: 0; padding: 0 0 12px; cursor: pointer; isolation: isolate; }
  .dcard.ig .dch { display: flex; align-items: center; gap: 10px; padding: 10px 4px 10px 12px; } .dcard.ig .dch .av { width: 34px; height: 34px; font-size: 14px; } .dch .avw { cursor: pointer; }
  .dcn { min-width: 0; flex: 1; display: flex; align-items: center; white-space: nowrap; overflow: hidden; font-size: 14px; } .dcn > b { overflow: hidden; text-overflow: ellipsis; cursor: pointer; font-size: 14px; min-width: 0; }
  .dcn .alo { font-weight: 400; } .dvip { margin-left: 6px; flex: none; } .igt { flex: none; color: var(--muted); margin-left: 5px; }
  .igmenu { flex: none; background: none; border: 0; padding: 2px 10px; font-size: 22px; line-height: 1; color: var(--text); }
  .igm { position: relative; width: 100%; aspect-ratio: 4 / 5; background: #000; overflow: hidden; }
  .igm > img, .igm > video { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; } .igm.dvid video { object-fit: contain; cursor: default; }
  .igcs { display: flex; width: 100%; height: 100%; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain; } .igcs::-webkit-scrollbar { display: none; }
  .igcs img { flex: 0 0 100%; width: 100%; height: 100%; object-fit: cover; display: block; scroll-snap-align: start; cursor: zoom-in; }
  .igcn { position: absolute; top: 10px; right: 10px; font-style: normal; font-size: 12px; font-weight: 600; background: #000a; color: #fff; border-radius: 999px; padding: 2px 8px; pointer-events: none; }
  .igdots { display: flex; justify-content: center; gap: 4px; height: 6px; margin-top: 8px; } .igdots i { width: 6px; height: 6px; border-radius: 50%; background: var(--muted); opacity: .45; } .igdots i.on { background: var(--brand); opacity: 1; }
  .igtx { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; padding: 28px; background: linear-gradient(135deg, var(--g)); }
  .igtx span { color: #fff; font-size: 21px; font-weight: 700; line-height: 1.35; text-align: center; white-space: pre-wrap; overflow-wrap: anywhere; text-shadow: 0 1px 3px #0005; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden; }
  .dcard.ig .dcf { display: flex; gap: 16px; align-items: center; height: 30px; padding: 8px 12px 0; margin: 0; font-size: 15px; color: var(--text); box-sizing: content-box; } .dcf .lk { color: #f472b6; }
  .dcf .mlk, .dcf .mcm { background: none; border: 0; padding: 0 2px; min-width: 0; height: 30px; font-size: 15px; color: var(--text); border-radius: 8px; } .dcf .mlk.lk b { color: #f472b6; }
  .dcf .dsg { margin-left: auto; font-size: 12px; color: var(--muted); white-space: nowrap; } .dcf.tcf { font-size: 13px; color: var(--muted); }
  .mcw { display: block; width: calc(100% - 24px); height: 34px; margin: 8px 12px 0; padding: 0 14px; text-align: left; font-size: 14px; color: var(--muted); background: var(--panel); border: 1px solid var(--line); border-radius: 999px; white-space: nowrap; overflow: hidden; }
  .dheart { position: absolute; left: 50%; top: 50%; font-style: normal; font-size: 84px; line-height: 1; transform: translate(-50%, -50%) scale(.2); opacity: 0; pointer-events: none; animation: dheart .9s ease-out forwards; filter: drop-shadow(0 4px 10px #0007); }
  @keyframes dheart { 15% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); } 30% { transform: translate(-50%, -50%) scale(.95); } 70% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -60%) scale(1); } }
  /* 🏢 Ekip paylaşımı */
  .tav { display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; background: linear-gradient(135deg, var(--g)); } .igmenu.tnone { width: 42px; height: 22px; padding: 0; }
  .tbadge { flex: none; margin-left: 6px; padding: 1px 7px; border-radius: 999px; font-size: 11.5px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #0ea5e9, #6366f1); }
  .dteam { background: #0ea5e922; border: 1px solid #0ea5e977; color: var(--text); border-radius: 12px; padding: 9px 12px; font-size: 14px; margin-bottom: 10px; }
  .igcs > video { flex: 0 0 100%; width: 100%; height: 100%; object-fit: contain; background: #000; display: block; scroll-snap-align: start; }
  .dprog.det i { width: 0; animation: none; transition: width .2s; } .dpost .dp2 { height: 36px; line-height: 18px; overflow: hidden; } /* bilgi / durum satırı: 2 satır yer baştan ayrılmış, yazı değişince düğmeler kaymaz */
  .dpadd:disabled { opacity: .4; } .dpost .dpbtns button { height: 44px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dpv video { width: 100%; height: 100%; object-fit: cover; display: block; background: #000; } .dpv .dvdur { left: 6px; right: auto; bottom: 6px; font-size: 11px; }
  .ddp { margin: 0 0 14px; } .ddpt { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; height: 22px; align-items: center; } .ddpt b { white-space: nowrap; }
  .ddpb { height: 8px; border-radius: 4px; background: var(--panel2); overflow: hidden; margin: 4px 0; } .ddpb i { display: block; height: 100%; border-radius: 4px; } .ddp .s { height: 18px; font-size: 12px; }
  .dcard.ig .dct { margin: 6px 12px 0; font-size: 14px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } .dcard.ig .dct.full { display: block; } .dct > b { cursor: pointer; }
  .igdev { background: none; border: 0; padding: 2px 12px; font-size: 14px; color: var(--muted); } .igall { display: block; background: none; border: 0; padding: 4px 12px 0; font-size: 14px; color: var(--muted); text-align: left; }
  .dtail { padding: 0 0 24px; } .dend, .dempty { text-align: center; color: var(--muted); padding: 18px 12px; font-size: 14px; } .dmorebtn { display: block; margin: 8px auto; }
  .ddet .dcard.ig { cursor: default; border: 0; margin: -10px -16px 6px; padding-bottom: 4px; } .ddet .dcard.ig .igmenu { margin-right: 6px; }
  .ddtabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; position: sticky; top: -16px; background: var(--panel); padding: 8px 0; z-index: 2; }
  .ddtabs button { font-size: 14px; padding: 8px 6px; border-radius: 999px; } .ddtabs button.on { background: var(--brand2); border-color: var(--brand2); color: #fff; font-weight: 700; } .ddtabs b { margin-left: 3px; }
  .drow { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); } .drow .b { min-width: 0; flex: 1; } .drow .t { display: flex; gap: 8px; align-items: baseline; justify-content: space-between; }
  .drow .t b { overflow-wrap: anywhere; cursor: pointer; font-size: 14px; } .drow .t .s { flex: none; font-size: 12px; } .drow .avw { cursor: pointer; } .av.dsm { width: 36px; height: 36px; font-size: 14px; }
  .dcom { font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; margin-top: 2px; } .drep { color: #7dd3fc; font-size: 13px; }
  .dpimgs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; } .dpimgs.sm { grid-template-columns: repeat(5, 1fr); gap: 4px; }
  .dpi { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: var(--panel2); } .dpi img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .dpi button { position: absolute; top: 4px; right: 4px; width: 26px; height: 26px; padding: 0; border-radius: 50%; background: #000a; border: 0; color: #fff; font-size: 13px; line-height: 26px; }
  .dpadd { aspect-ratio: 1; border-radius: 10px; border: 1.5px dashed var(--line); background: none; font-size: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 0; } .dpadd small { font-size: 12px; color: var(--muted); }
  .dpbtns { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; } .dpost textarea { resize: vertical; min-height: 96px; }
  .dwarn { background: #f59e0b22; border: 1px solid #f59e0b77; color: #fde68a; border-radius: 12px; padding: 10px 12px; font-size: 14px; margin-bottom: 10px; }
  .dpsum { border: 1px solid var(--line); border-radius: 12px; padding: 10px; max-height: 40vh; overflow-y: auto; } .dpsum .dct { margin: 0; }
  .dprog { height: 6px; border-radius: 3px; background: var(--panel2); overflow: hidden; margin-top: 10px; } .dprog i { display: block; height: 100%; width: 40%; border-radius: 3px; background: linear-gradient(90deg, #f472b6, #a855f7); animation: dprog 1.1s ease-in-out infinite; }
  @keyframes dprog { 0% { transform: translateX(-100%); } 100% { transform: translateX(250%); } }
  /* 📷 Profil ızgarası (Instagram gibi): 3 sütun × 2 satır kare, yükseklik sabit */
  .dpfh { display: flex; align-items: center; gap: 6px; height: 28px; } .dpfall { margin-left: auto; padding: 3px 10px; font-size: 13px; line-height: 18px; border-radius: 999px; } /* "Tümü" çıkınca başlık boyu değişmez */
  .dpg { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(2, 1fr); gap: 2px; aspect-ratio: 3 / 2; margin: 0 0 8px; border-radius: 10px; overflow: hidden; }
  .dpt1 { position: relative; width: 100%; height: 100%; padding: 0; border: 0; border-radius: 0; background: var(--panel2); overflow: hidden; display: block; min-width: 0; }
  .dpt1 img { width: 100%; height: 100%; object-fit: cover; display: block; } .dpt1.dpbos { background: transparent; }
  .dptx { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 8px; background: linear-gradient(135deg, var(--g)); }
  .dptx > span { color: #fff; font-size: 12px; font-weight: 700; text-align: center; line-height: 1.3; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
  .dpt1 .dpn { position: absolute; top: 5px; right: 6px; font-style: normal; font-size: 12px; font-weight: 700; color: #fff; text-shadow: 0 1px 3px #000c; pointer-events: none; }
  .dpempty { grid-column: 1 / -1; grid-row: 1 / -1; display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: 14px; border: 1px dashed var(--line); border-radius: 10px; }
  .igmn { display: grid; gap: 8px; } .igmnh { display: flex; align-items: center; gap: 10px; padding: 0 2px 6px; } .igmnh .av { width: 36px; height: 36px; } .igmn button { padding: 12px; font-size: 15px; }
  /* 👤 Profil rozetleri (Sugo gibi): tek satır, sabit yükseklik */
  .pfbadges { display: flex; gap: 5px; flex-wrap: nowrap; overflow-x: auto; height: 24px; margin-top: 6px; scrollbar-width: none; } .pfbadges::-webkit-scrollbar { display: none; }
  .pfbadges > span { flex: none; display: inline-flex; align-items: center; gap: 3px; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 12px; font-weight: 800; color: #fff; white-space: nowrap; line-height: 1; }
  .pfbadges .gsym { width: 12px; height: 12px; } .pfbadges img { width: 14px; height: 14px; border-radius: 4px; object-fit: cover; }
  .pfbadges .bg-m { background: linear-gradient(135deg, #38bdf8, #2563eb); } .pfbadges .bg-f { background: linear-gradient(135deg, #f9a8d4, #db2777); } .pfbadges .bg-x { background: #64748b; }
  .pfbadges .bg-w { background: linear-gradient(135deg, #fbbf24, #ea580c); } .pfbadges .bg-c { background: linear-gradient(135deg, #f0abfc, #a855f7); } .pfbadges .bg-v { background: var(--vc); } .pfbadges .bg-v.dk { color: #2a1d00; }
  .pfbadges .bg-fa { background: linear-gradient(135deg, #2dd4bf, #0f766e); } .pfbadges .bg-sk { background: #ffffff14; }
  .pfbadges .bg-fa small { margin-left: 4px; padding: 0 5px; border-radius: 999px; background: #0004; font-size: 10.5px; line-height: 16px; display: inline-flex; align-items: center; gap: 2px; } .pfbadges small img { width: 12px; height: 12px; }
  .pfbadges .bg-sl { background: linear-gradient(135deg, #fde047, #ca8a04); color: #2a1d00; } .pfbadges .bg-ac { background: linear-gradient(135deg, #4ade80, #15803d); } .pfbadges .bg-md { background: linear-gradient(135deg, #fb923c, #b45309); }
  .pffam { display: flex; align-items: center; gap: 8px; height: 34px; margin-top: 8px; padding: 0 10px; border-radius: 12px; background: #ffffff10; border: 1px solid #ffffff1a; font-size: 14px; white-space: nowrap; overflow: hidden; }
  .pffam img { width: 22px; height: 22px; border-radius: 6px; object-fit: cover; flex: none; } .pffam .fn { overflow: hidden; text-overflow: ellipsis; min-width: 0; } .pffam.none { color: var(--muted); }
  `; document.head.appendChild(css);

  boot();
  if (typeof curTab !== "undefined" && curTab === "durum" && $("p-durum") && $("p-durum").classList.contains("on")) show(); // sekme açıkken açıldıysa (bu dosya ana betikten sonra yüklenir)
})();
