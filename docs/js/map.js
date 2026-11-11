const TILE_SIZE = 256;
const INITIAL_CENTER = { lat: 43.258, lon: -1.826 };
const TILE_HOST = 'https://a.tile.opentopomap.org';

function project(lat, lon, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const radians = Math.min(85.0511, Math.max(-85.0511, lat)) * Math.PI / 180;
  return { x: (lon + 180) / 360 * scale, y: (1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2 * scale };
}

function unproject(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  return { lon: x / scale * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) * 180 / Math.PI };
}

function buttonMarker(record, x, y) {
  const button = document.createElement('button');
  button.className = 'map-marker';
  button.type = 'button';
  button.style.left = `${x}px`;
  button.style.top = `${y}px`;
  button.title = record.species;
  button.dataset.id = record.id;
  button.setAttribute('aria-label', `${record.species}: ${record.quantity} ejemplares`);
  button.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-mushroom"/></svg>';
  return button;
}

export class ArtikutzaMap {
  constructor(viewport, tiles, overlay, markers, attribution) {
    this.viewport = viewport;
    this.tiles = tiles;
    this.overlay = overlay;
    this.markers = markers;
    this.attribution = attribution;
    this.center = { ...INITIAL_CENTER };
    this.zoom = 13;
    this.records = [];
    this.routes = [];
    this.offlineMap = null;
    this.offlineUrl = null;
    this.drag = null;
    this.renderQueued = false;
    this.viewport.addEventListener('pointerdown', e => this.pointerDown(e));
    this.viewport.addEventListener('pointermove', e => this.pointerMove(e));
    this.viewport.addEventListener('pointerup', e => this.pointerUp(e));
    this.viewport.addEventListener('pointercancel', e => this.pointerUp(e));
    this.viewport.addEventListener('wheel', e => { e.preventDefault(); this.setZoom(this.zoom + (e.deltaY < 0 ? 1 : -1)); }, { passive: false });
    this.viewport.addEventListener('dblclick', e => { e.preventDefault(); this.setZoom(this.zoom + 1); });
    new ResizeObserver(() => this.queueRender()).observe(this.viewport);
    window.addEventListener('online', () => this.queueRender());
    window.addEventListener('offline', () => this.queueRender());
  }

  setData(records, routes) { this.records = records; this.routes = routes; this.queueRender(); }
  setZoom(zoom) { this.zoom = Math.max(10, Math.min(16, zoom)); this.queueRender(); }
  centerOn(lat, lon, zoom) { this.center = { lat, lon }; if (zoom) this.zoom = zoom; this.queueRender(); }
  setOfflineMap(map) {
    if (this.offlineUrl) URL.revokeObjectURL(this.offlineUrl);
    this.offlineMap = map;
    this.offlineUrl = map?.image ? URL.createObjectURL(map.image) : null;
    this.queueRender();
  }
  queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => { this.renderQueued = false; this.render(); });
  }

  pointerDown(event) {
    if (event.target.closest('button,a')) return;
    const start = project(this.center.lat, this.center.lon, this.zoom);
    this.drag = { x: event.clientX, y: event.clientY, start };
    this.viewport.setPointerCapture(event.pointerId);
  }
  pointerMove(event) {
    if (!this.drag) return;
    const x = this.drag.start.x - (event.clientX - this.drag.x);
    const y = this.drag.start.y - (event.clientY - this.drag.y);
    this.center = unproject(x, y, this.zoom);
    this.queueRender();
  }
  pointerUp(event) {
    this.drag = null;
    if (this.viewport.hasPointerCapture(event.pointerId)) this.viewport.releasePointerCapture(event.pointerId);
  }

  render() {
    const width = this.viewport.clientWidth;
    const height = this.viewport.clientHeight;
    if (!width || !height) return;
    const center = project(this.center.lat, this.center.lon, this.zoom);
    const left = center.x - width / 2;
    const top = center.y - height / 2;
    this.tiles.replaceChildren();
    if (this.offlineMap && this.offlineUrl) {
      const [south, west, north, east] = this.offlineMap.bounds;
      const nw = project(north, west, this.zoom);
      const se = project(south, east, this.zoom);
      const img = document.createElement('img');
      img.src = this.offlineUrl;
      img.alt = '';
      img.style.left = `${nw.x - left}px`;
      img.style.top = `${nw.y - top}px`;
      img.style.width = `${se.x - nw.x}px`;
      img.style.height = `${se.y - nw.y}px`;
      this.tiles.append(img);
      this.attribution.textContent = this.offlineMap.attribution || 'Mapa local · licencia indicada por quien lo importa';
    } else if (navigator.onLine) {
      const minX = Math.floor(left / TILE_SIZE), maxX = Math.floor((left + width) / TILE_SIZE);
      const minY = Math.floor(top / TILE_SIZE), maxY = Math.floor((top + height) / TILE_SIZE);
      const limit = 2 ** this.zoom;
      for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
        if (y < 0 || y >= limit) continue;
        const img = document.createElement('img');
        img.src = `${TILE_HOST}/${this.zoom}/${((x % limit) + limit) % limit}/${y}.png`;
        img.className = 'topo-tile';
        img.alt = '';
        img.loading = 'eager';
        img.style.left = `${x * TILE_SIZE - left}px`;
        img.style.top = `${y * TILE_SIZE - top}px`;
        this.tiles.append(img);
      }
      this.attribution.innerHTML = '<a href="https://opentopomap.org/about" target="_blank" rel="noopener">© OpenTopoMap</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>, SRTM · <a href="https://opendata.euskadi.eus/catalogo/-/rutas-senderismo-recorridos-cortos/" target="_blank" rel="noopener">Ruta: Gipuzkoa Irekia, CC BY 4.0</a>';
    } else {
      this.attribution.textContent = 'Sin mapa base local. Importa uno con licencia para usarlo sin conexión.';
    }
    this.overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.overlay.replaceChildren();
    for (const route of this.routes) {
      if (!Array.isArray(route.points) || route.points.length < 2) continue;
      const points = route.points.map(([lat,lon]) => { const p = project(lat, lon, this.zoom); return `${(p.x-left).toFixed(1)},${(p.y-top).toFixed(1)}`; }).join(' ');
      const shadow = document.createElementNS('http://www.w3.org/2000/svg','polyline');
      shadow.setAttribute('points',points); shadow.setAttribute('fill','none'); shadow.setAttribute('stroke','#091b0c'); shadow.setAttribute('stroke-width','8'); shadow.setAttribute('stroke-linecap','round'); shadow.setAttribute('stroke-linejoin','round'); shadow.setAttribute('opacity','.7');
      const line = shadow.cloneNode(); line.setAttribute('stroke','#ed2b1e'); line.setAttribute('stroke-width','5'); line.setAttribute('opacity','1');
      this.overlay.append(shadow,line);
    }
    this.markers.replaceChildren();
    for (const record of this.records) {
      if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude)) continue;
      const p = project(record.latitude, record.longitude, this.zoom);
      const x = p.x - left, y = p.y - top;
      if (x < -50 || x > width + 50 || y < -50 || y > height + 50) continue;
      this.markers.append(buttonMarker(record,x,y));
    }
  }
}

export function parseGpx(text, filename) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('El GPX no es XML válido');
  const nodes = [...doc.getElementsByTagNameNS('*','trkpt')];
  if (!nodes.length) nodes.push(...doc.getElementsByTagNameNS('*','rtept'));
  const points = nodes.map(node => [Number(node.getAttribute('lat')), Number(node.getAttribute('lon'))]).filter(([lat,lon]) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180).slice(0,50000);
  if (points.length < 2) throw new Error('No se encontró un trayecto GPX válido');
  const track = doc.getElementsByTagNameNS('*','trk')[0] || doc.getElementsByTagNameNS('*','rte')[0];
  const name = track?.getElementsByTagNameNS('*','name')[0]?.textContent?.trim() || filename.replace(/\.gpx$/i,'');
  return { id: crypto.randomUUID(), name: name.slice(0,120), points, source: filename };
}
