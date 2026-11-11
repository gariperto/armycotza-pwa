const DB_NAME = 'armycotza-private-v1';
const DB_VERSION = 1;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('routes')) db.createObjectStore('routes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('offlineMaps')) db.createObjectStore('offlineMaps', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const db = await openDb();
  try {
    return await requestResult(db.transaction(storeName).objectStore(storeName).getAll());
  } finally { db.close(); }
}

export async function put(storeName, value) {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  } finally { db.close(); }
}

export async function remove(storeName, id) {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  } finally { db.close(); }
}

export async function clearAll() {
  const db = await openDb();
  try {
    const tx = db.transaction(['records','routes','offlineMaps'], 'readwrite');
    for (const name of ['records','routes','offlineMaps']) tx.objectStore(name).clear();
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
  } finally { db.close(); }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(value) {
  if (typeof value !== 'string' || !/^data:image\/(?:jpeg|png|webp|heic|heif);base64,/i.test(value)) return null;
  const [header, data] = value.split(',', 2);
  const bytes = atob(data);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
  return new Blob([array], { type: header.slice(5, -7) });
}

export async function exportBackup() {
  const records = await getAll('records');
  const routes = await getAll('routes');
  const offlineMaps = await getAll('offlineMaps');
  return {
    app: 'ARMYCOTZA', version: 1, exportedAt: new Date().toISOString(),
    records: await Promise.all(records.map(async ({ photo, ...record }) => ({ ...record, photo: photo ? await blobToDataUrl(photo) : null }))),
    routes,
    offlineMaps: await Promise.all(offlineMaps.map(async ({ image, ...map }) => ({ ...map, image: image ? await blobToDataUrl(image) : null })))
  };
}

export async function importBackup(value) {
  if (!value || value.app !== 'ARMYCOTZA' || value.version !== 1 || !Array.isArray(value.records) || !Array.isArray(value.routes) || !Array.isArray(value.offlineMaps)) throw new Error('Archivo de copia no válido');
  if (value.records.length > 10000 || value.routes.length > 1000 || value.offlineMaps.length > 100) throw new Error('La copia supera los límites admitidos');
  const existingRecords = new Set((await getAll('records')).map(item => item.id));
  const existingRoutes = new Set((await getAll('routes')).map(item => item.id));
  const existingMaps = new Set((await getAll('offlineMaps')).map(item => item.id));
  let imported = 0;
  for (const record of value.records) {
    if (!record || typeof record.id !== 'string' || existingRecords.has(record.id) || typeof record.species !== 'string' || !Number.isFinite(Number(record.quantity))) continue;
    const photo = record.photo ? dataUrlToBlob(record.photo) : null;
    await put('records', { id: record.id, createdAt: String(record.createdAt || new Date().toISOString()), species: record.species.slice(0, 120), quantity: Math.max(1, Math.min(999, Number(record.quantity))), condition: String(record.condition || ''), habitat: String(record.habitat || ''), latitude: record.latitude == null ? null : Number(record.latitude), longitude: record.longitude == null ? null : Number(record.longitude), notes: String(record.notes || '').slice(0, 5000), photo });
    imported++;
  }
  for (const route of value.routes) {
    if (!route || typeof route.id !== 'string' || existingRoutes.has(route.id) || !Array.isArray(route.points)) continue;
    const points = route.points.filter(p => Array.isArray(p) && p.length === 2 && Number.isFinite(+p[0]) && Number.isFinite(+p[1]) && Math.abs(+p[0]) <= 90 && Math.abs(+p[1]) <= 180).slice(0, 50000);
    if (points.length > 1) { await put('routes', { id: route.id, name: String(route.name || 'Ruta').slice(0, 120), points, source: String(route.source || 'Copia importada').slice(0, 200) }); imported++; }
  }
  for (const map of value.offlineMaps) {
    if (!map || typeof map.id !== 'string' || existingMaps.has(map.id) || !Array.isArray(map.bounds) || map.bounds.length !== 4) continue;
    const image = dataUrlToBlob(map.image);
    const bounds = map.bounds.map(Number);
    if (image && bounds.every(Number.isFinite) && bounds[0] < bounds[2] && bounds[1] < bounds[3]) { await put('offlineMaps', { id: map.id, name: String(map.name || 'Mapa local').slice(0,120), bounds, attribution: String(map.attribution || '').slice(0,500), image }); imported++; }
  }
  return imported;
}
