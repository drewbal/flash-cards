import { type Data, validData } from './core';
let database: Promise<IDBDatabase>;
function db() { return database ||= new Promise((resolve, reject) => { const r = indexedDB.open('slovo-flash-cards', 1); r.onupgradeneeded = () => r.result.createObjectStore('state'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
export async function load(): Promise<Data> { const d = await db(); return new Promise((resolve, reject) => { const r = d.transaction('state').objectStore('state').get('data'); r.onsuccess = () => { if (r.result === undefined)
    resolve({ cards: [], history: [] });
else if (validData(r.result))
    resolve(r.result);
else
    reject(new Error('Не удалось прочитать сохранённые данные. Они не были изменены.')); }; r.onerror = () => reject(r.error); }); }
export async function save(data: Data, expected?: Data) { const d = await db(); return new Promise<void>((resolve, reject) => { const t = d.transaction('state', 'readwrite'), store = t.objectStore('state'); let conflict = false; const r = store.get('data'); r.onsuccess = () => { if (expected && JSON.stringify(r.result || { cards: [], history: [] }) !== JSON.stringify(expected)) {
    conflict = true;
    t.abort();
    return;
} store.put(data, 'data'); }; t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(conflict ? new Error('Коллекция изменилась в другой вкладке. Перезагрузи страницу перед продолжением.') : t.error); }); }
