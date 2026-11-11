// Bildirim servisi: sunucudan gelen bildirimi gösterir (telefon sessizde değilse sesli), dokununca ilgili sohbeti açar.
// + Uygulama kabuğu önbelleği: sayfa (index.html) ve aynı kökten statik dosyalar (emoji, simge, manifest, js) "önce önbellek, arkada tazele".
//   API (/api, /functions/), version.json ve sw.js ASLA önbellekten verilmez. Önbellek adı yayın sürümüne bağlı (bw-shell-<sürüm>):
//   sayfa açılışında arkada version.json sorulur; sürüm değiştiyse yeni kabuk ağdan alınıp yeni önbelleğe yazılır. Eski kabuk, yeni kabuk
//   önbellekten verildiği BİR SONRAKİ açılışta silinir (o ana kadar eski sayfanın ?v=ESKİ dosyaları eski önbellekten gelir: eski sayfa + yeni js karışmaz).
//   ?v= etiketli dosyalar değişmez: hangi kabuk önbelleğinde varsa oradan, yoksa ağdan bir kez (arkada tazeleme yok).
//   Sayfanın kendi sürüm kontrolü (checkUpdate) yeni sürümü görünce önbelleği silip yeniler → en geç bir sonraki açılış/yenilemede yeni kod.
const SHELL = "bw-shell-", META = "bw-shell-meta";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const scopeUrl = (p) => new URL(p, self.registration.scope).href;
const never = (u) => /\/api(\/|$)|\/functions\/|version\.json|\/sw\.js$/.test(u.pathname); // canlı veri ve sürüm denetimi: hep ağdan
const metaGet = async () => { try { const r = await (await caches.open(META)).match(scopeUrl("./__v")); return r ? String((await r.json()).v || "") : ""; } catch (x) { return ""; } };
const metaSet = async (v) => { try { await (await caches.open(META)).put(scopeUrl("./__v"), new Response(JSON.stringify({ v }), { headers: { "content-type": "application/json" } })); } catch (x) { /* yok */ } };
let checking = null;
// Arkada: yayın sürümü değiştiyse yeni önbellek adı (eskiler hemen silinmez – bkz. cleanup)
function verCheck() {
  if (checking) return checking;
  checking = (async () => {
    try { const r = await fetch(scopeUrl("version.json?sw=" + Date.now()), { cache: "no-store" }); if (!r.ok) return await metaGet();
      const v = String((await r.json()).v || ""), old = await metaGet();
      if (v && v !== old) await metaSet(v);
      return v || old;
    } catch (x) { return await metaGet(); } finally { checking = null; } // aynı anda gelenler tek istek; her açılışta yeniden sorulur
  })();
  return checking;
}
async function cleanup(v) { if (!v) return; try { const ks = await caches.keys(); await Promise.all(ks.filter((k) => k.startsWith(SHELL) && k !== META && k !== SHELL + v).map((k) => caches.delete(k))); } catch (x) { /* yok */ } }
async function refresh(req, key, v) {
  try { const r = await fetch(req, { cache: "no-cache" });
    if (r && r.ok && r.type === "basic" && !r.redirected) await (await caches.open(SHELL + (v || "0"))).put(key, r.clone());
    return r; } catch (x) { return null; }
}
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  let u; try { u = new URL(req.url); } catch (x) { return; }
  if (u.origin !== self.location.origin || never(u)) return; // başka köken (Supabase, resimler, CDN) ve API: tarayıcı kendisi
  const nav = req.mode === "navigate";
  if (!nav && !/\.(js|json|png|webp|jpg|svg|ico|css|woff2?)$/i.test(u.pathname)) return;
  const key = nav ? scopeUrl("./") : req.url; // sayfa: adresteki ?c= / ?t= ne olursa olsun tek kopya
  if (!nav && u.searchParams.has("v")) { // sürüm etiketli dosya: önce tüm kabuk önbellekleri (eski sayfa kendi sürümünün dosyasını alsın)
    e.respondWith((async () => { let hit = null; try { hit = await caches.match(req.url); } catch (x) { hit = null; } if (hit) return hit;
      const v = await metaGet(), r = await fetch(req).catch(() => null);
      if (r && r.ok && r.type === "basic" && !r.redirected) { const cp = r.clone(); e.waitUntil((async () => { try { await (await caches.open(SHELL + (v || "0"))).put(req.url, cp); } catch (x) { /* yok */ } })()); }
      return r || fetch(req); })());
    return; }
  e.respondWith((async () => {
    const v = await metaGet();
    let hit = null; try { hit = await (await caches.open(SHELL + (v || "0"))).match(key); } catch (x) { hit = null; }
    // Arkada tazele: sayfada önce sürüm (değiştiyse yeni önbellek), sonra dosyanın kendisi
    const bg = (async () => { const nv = nav ? await verCheck() : v; return refresh(nav ? new Request(scopeUrl("./"), { credentials: "same-origin" }) : req, key, nv); })();
    e.waitUntil(bg.catch(() => null));
    if (hit && nav) e.waitUntil(bg.then(async () => { if (v && (await metaGet()) === v) await cleanup(v); }).catch(() => null)); // bu açılış güncel kabukla oldu: eski kabuklar artık gereksiz
    if (hit) return hit;
    const r = await bg; return r && !r.redirected ? r : fetch(req);
  })());
});

self.addEventListener("push", (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: "Sugo Coins Bayi", body: e.data ? e.data.text() : "" }; }
  e.waitUntil((async () => {
    // Sayfa açık ve önündeyse ona da haber ver (ses çalar, listeyi yeniler)
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    cs.forEach((c) => c.postMessage({ kind: "push", data: d }));
    await self.registration.showNotification(d.title || "Sugo Coins Bayi", { body: d.body || "", tag: d.tag || "bayi", renotify: true, icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" } });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil((async () => {
    // iPhone: arka plandaki sayfa uyurken mesaj kaybolabiliyor → hedef önbelleğe yazılır, sayfa öne gelince okur ve açar (2 dk geçerli)
    try { const ch = await caches.open("bw-nav"); await ch.put("./__open", new Response(JSON.stringify({ url, at: Date.now() }), { headers: { "content-type": "application/json" } })); } catch (x) {}
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) { if ("focus" in c) { c.postMessage({ kind: "open", url }); return c.focus(); } }
    return self.clients.openWindow(url);
  })());
});
