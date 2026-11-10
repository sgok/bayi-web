// Bildirim servisi: sunucudan gelen bildirimi gösterir (telefon sessizde değilse sesli), dokununca ilgili sohbeti açar.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
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
