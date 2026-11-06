const CACHE='slovo-v1';
const root=new URL('./',self.location.href);
const url=p=>new URL(p,root).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const response=await fetch(url('index.html'),{cache:'reload'});
  if(!response.ok)throw new Error('App download failed');
  const html=await response.text();
  const assets=[...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>new URL(m[1],root)).filter(u=>u.origin===root.origin).map(u=>u.href);
  const cache=await caches.open(CACHE);
  await cache.addAll([...new Set([url(''),url('index.html'),url('dictionary.json'),url('dictionary-LICENSE.txt'),url('manifest.webmanifest'),url('icon-192.png'),url('icon-512.png'),...assets])]);
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('slovo-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage('offline-ready');})()));
self.addEventListener('fetch',event=>{
 const req=event.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==root.origin||!u.pathname.startsWith(root.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const hit=await cache.match(req,{ignoreSearch:true});if(hit)return hit;try{const response=await fetch(req);if(response.ok)await cache.put(req,response.clone());return response;}catch(e){if(req.mode==='navigate'){const page=await cache.match(url('index.html'));if(page)return page;}throw e;}})());
});
