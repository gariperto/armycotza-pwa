import { getAll, put, remove, clearAll, exportBackup, importBackup } from './db.js?v=13';
import { SPECIES, MONTHS, recordsForPeriod, statsFor, monthlyCounts } from './data.js?v=13';
import { ArtikutzaMap, parseGpx } from './map.js?v=13';

const $ = selector => document.querySelector(selector);
const svg = id => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const state = { screen: 'map', records: [], routes: [], baseRoutes: [], maps: [], period: 'season', guideFilter: 'all', photo: null, photoUrl: null };
const map = new ArtikutzaMap($('#map-viewport'),$('#map-tiles'),$('#map-overlay'),$('#map-markers'),$('.map-attribution'));
let toastTimer;

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

function openSheet(html) { $('#sheet-content').innerHTML = html; if (!$('#sheet').open) $('#sheet').showModal(); }
function closeSheet() { $('#sheet').close(); }

function showScreen(screen) {
  state.screen = screen;
  for (const el of document.querySelectorAll('.screen')) {
    el.hidden = el.id !== `screen-${screen}`;
    el.classList.toggle('active', !el.hidden);
  }
  for (const button of document.querySelectorAll('.bottom-nav button')) button.classList.toggle('selected', button.dataset.screen === screen);
  const title = $('#header-title');
  const left = $('#header-left');
  const right = $('#header-right');
  const titles = { registro: 'Nuevo hallazgo', guia: 'Especies', estadisticas: 'Estadísticas', calendario: 'Calendario micológico' };
  title.innerHTML = screen === 'map' ? '<img class="header-logo" src="./assets/logo-oficial.png" alt="ARMYCOTZA, logotipo oficial">' : escapeHtml(titles[screen]);
  left.innerHTML = svg(screen === 'map' ? 'menu' : screen === 'registro' ? 'back' : screen === 'calendario' ? 'calendar' : 'bars');
  left.setAttribute('aria-label', screen === 'map' ? 'Menú' : 'Volver al mapa');
  right.style.visibility = ['map','guia'].includes(screen) ? 'visible' : 'hidden';
  if (screen === 'map') requestAnimationFrame(() => map.queueRender());
  if (screen === 'estadisticas') renderStats();
  if (screen === 'calendario') renderCalendar();
}

function renderGuide() {
  const list = $('#guide-list');
  const visible = state.guideFilter === 'all' ? SPECIES : SPECIES.filter(s => s.category === state.guideFilter);
  list.innerHTML = visible.length ? visible.map(s => `<button type="button" class="guide-card" data-species="${escapeHtml(s.id)}">${s.image ? `<img src="${escapeHtml(s.image)}" alt="${s.photo ? 'Fotografía' : 'Imagen ilustrativa'} de ${escapeHtml(s.name)}" loading="lazy" decoding="async">` : `<span class="species-placeholder" aria-label="Sin fotografía verificada">${svg('mushroom')}</span>`}<div class="guide-text"><strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.common)}</span></div>${svg('arrow')}</button>`).join('') : '<p class="guide-empty">No hay fichas verificadas en esta categoría. La guía se ampliará con fuentes micológicas revisadas.</p>';
}

function renderStats() {
  const records = recordsForPeriod(state.records, state.period);
  const stats = statsFor(records);
  $('#stat-records').textContent = stats.records;
  $('#stat-specimens').textContent = stats.specimens;
  $('#stat-zones').textContent = stats.zones;
  $('#stat-species').textContent = stats.species;
  const year = new Date().getFullYear();
  const counts = state.period === 'all' ? Array.from({length:12},(_,month) => records.filter(r => new Date(r.createdAt).getMonth() === month).length) : monthlyCounts(records,year);
  const months = [6,7,8,9,10];
  const max = Math.max(1,...months.map(month => counts[month]));
  const points = months.map((month,index) => [28+index*70, 160-counts[month]/max*125]);
  const line = points.map(([x,y]) => `${x},${y}`).join(' ');
  const area = `28,160 ${line} 308,160`;
  $('#stats-chart').innerHTML = `<svg viewBox="0 0 338 190" role="img" aria-label="Registros reales de julio a noviembre"><line x1="28" y1="160" x2="308" y2="160" class="chart-grid"/><line x1="28" y1="98" x2="308" y2="98" class="chart-grid"/><line x1="28" y1="35" x2="308" y2="35" class="chart-grid"/><text x="2" y="163" class="chart-label">0</text><text x="2" y="101" class="chart-label">${Math.round(max/2)}</text><text x="2" y="38" class="chart-label">${max}</text><polygon points="${area}" class="chart-area"/><polyline points="${line}" class="chart-line"/>${points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${counts[months[i]]?3:2}" fill="${counts[months[i]]?'#fff':'#ef2b20'}" stroke="#ef2b20" stroke-width="2"/>`).join('')}${months.map((m,i)=>`<text x="${28+i*70}" y="180" class="chart-label" text-anchor="middle">${MONTHS[m]}</text>`).join('')}</svg>`;
}

function renderCalendar() {
  const months = [6,7,8,9,10];
  const year = new Date().getFullYear();
  const shown = SPECIES.filter((s, i) => i < 4 || state.records.some(r => r.species === s.name || s.aliases?.includes(r.species)));
  const rows = shown.map(s => ({ species:s, counts:months.map(m => state.records.filter(r => (r.species === s.name || s.aliases?.includes(r.species)) && new Date(r.createdAt).getFullYear() === year && new Date(r.createdAt).getMonth() === m).length) }));
  const max = Math.max(0,...rows.flatMap(row => row.counts));
  $('#calendar-grid').innerHTML = `<span></span>${months.map(m=>`<span class="calendar-head">${MONTHS[m]}</span>`).join('')}${rows.map(row=>`<span class="calendar-row-label" title="${escapeHtml(row.species.name)}">${svg('mushroom')}</span>${row.counts.map(count=>`<span class="calendar-cell ${count ? count/max >= .85 ? 'peak' : count/max >= .6 ? 'high' : count/max >= .3 ? 'med' : 'low' : ''}" title="${escapeHtml(row.species.name)}: ${count} registros">${count||''}</span>`).join('')}`).join('')}`;
  $('#calendar-message').textContent = state.records.length ? 'Actividad observada según tus registros. Aún no se calcula una probabilidad de fructificación.' : 'El calendario se completará con tus hallazgos reales. Aún no se calcula una probabilidad de fructificación.';
}

async function refreshWeather() {
  const cacheKey = 'armycotza-weather-artikutza';
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch(error) {}
  const show = data => {
    if (!data?.current) return;
    const current = data.current;
    $('#weather-temp').textContent = Number.isFinite(current.temperature_2m) ? `${Math.round(current.temperature_2m)} °C` : '—';
    $('#weather-humidity').textContent = Number.isFinite(current.relative_humidity_2m) ? `${Math.round(current.relative_humidity_2m)} %` : '—';
    $('#weather-rain').textContent = Number.isFinite(current.precipitation) ? `${current.precipitation.toFixed(1)} mm` : '—';
    $('#weather-source').innerHTML = `Modelo meteorológico para Artikutza · ${escapeHtml(current.time?.replace('T',' ') || '')}${data.cached ? ' · último dato guardado' : ''} · <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo, CC BY 4.0</a>`;
  };
  if (cached) show({...cached.data,cached:true});
  if (!navigator.onLine || (cached && Date.now()-cached.savedAt < 30*60*1000)) return;
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=43.21302&longitude=-1.79645&current=temperature_2m,relative_humidity_2m,precipitation&timezone=Europe%2FMadrid');
    if (!response.ok) return;
    const data = await response.json();
    if (data?.current) { show(data); try { localStorage.setItem(cacheKey,JSON.stringify({savedAt:Date.now(),data})); } catch(error) {} }
  } catch(error) { console.warn('No se pudieron cargar las condiciones meteorológicas',error); }
}

async function refresh() {
  [state.records,state.routes,state.maps] = await Promise.all([getAll('records'),getAll('routes'),getAll('offlineMaps')]);
  state.records.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  map.setData(state.records,[...state.baseRoutes,...state.routes]);
  $('#map-empty').hidden = state.records.some(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  renderStats(); renderCalendar();
  const activeMapId = localStorage.getItem('armycotza-offline-map');
  map.setOfflineMap(state.maps.find(item => item.id === activeMapId) || null);
}

function setupForm() {
  $('#species').innerHTML = '<option value="">Seleccionar especie</option><option value="Sin identificar">Sin identificar</option>' + SPECIES.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
  $('#qty-minus').addEventListener('click',() => $('#quantity').value = Math.max(1, Number($('#quantity').value||1)-1));
  $('#qty-plus').addEventListener('click',() => $('#quantity').value = Math.min(999, Number($('#quantity').value||1)+1));
  const acceptPhoto = event => {
    const file = event.target.files[0]; if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 20*1024*1024) { toast('Usa una imagen de hasta 20 MB.'); event.target.value=''; return; }
    state.photo = file;
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photoUrl = URL.createObjectURL(file);
    $('#photo-preview').src = state.photoUrl;
    $('#photo-example').hidden = true;
    $('#photo-panel').classList.add('has-photo');
  };
  $('#photo-input').addEventListener('change',acceptPhoto);
  $('#gallery-input').addEventListener('change',acceptPhoto);
  $('#gps-btn').addEventListener('click',getGps);
  $('#record-form').addEventListener('submit',async event => {
    event.preventDefault();
    const species = $('#species').value;
    const quantity = Number($('#quantity').value);
    const latitude = $('#latitude').value === '' ? null : Number($('#latitude').value);
    const longitude = $('#longitude').value === '' ? null : Number($('#longitude').value);
    if (!species || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) { toast('Selecciona una especie y una cantidad válida.'); return; }
    if ((latitude === null) !== (longitude === null) || (latitude !== null && (Math.abs(latitude)>90 || Math.abs(longitude)>180))) { toast('Introduce latitud y longitud válidas.'); return; }
    try {
      await put('records',{id:crypto.randomUUID(),createdAt:new Date().toISOString(),species,quantity,condition:document.querySelector('input[name="condition"]:checked')?.value||'Óptimo',habitat:$('#habitat').value,latitude,longitude,notes:$('#notes').value.trim().slice(0,5000),photo:state.photo});
      $('#record-form').reset(); $('#quantity').value='1'; $('#photo-preview').src='./assets/hallazgo-referencia.png'; $('#photo-example').hidden=false; $('#photo-panel').classList.remove('has-photo'); state.photo=null;
      if (state.photoUrl) URL.revokeObjectURL(state.photoUrl); state.photoUrl=null;
      await refresh(); showScreen('map'); toast('Hallazgo guardado solo en este dispositivo.');
    } catch(error) { toast('No se pudo guardar. Comprueba el espacio disponible.'); }
  });
}

function getGps() {
  if (!navigator.geolocation) { toast('Este dispositivo no ofrece GPS.'); return; }
  toast('Buscando ubicación…');
  navigator.geolocation.getCurrentPosition(position => {
    const lat=position.coords.latitude, lon=position.coords.longitude;
    $('#latitude').value=lat.toFixed(6); $('#longitude').value=lon.toFixed(6);
    map.centerOn(lat,lon,14); toast('Ubicación añadida al hallazgo.');
  }, error => toast(error.code===1?'Permiso de ubicación denegado.':'No se pudo obtener la ubicación.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function showSpecies(id) {
  const species = SPECIES.find(s => s.id === id); if (!species) return;
  const visual = species.image ? `<img src="${escapeHtml(species.image)}" alt="${species.photo ? 'Fotografía' : 'Imagen ilustrativa'} de ${escapeHtml(species.name)}" class="species-sheet-image">` : `<div class="species-sheet-placeholder" role="img" aria-label="Sin fotografía verificada">${svg('mushroom')}<span>Sin fotografía verificada</span></div>`;
  const aliases = species.aliases?.length ? `<p class="source-note">También: ${escapeHtml(species.aliases.join(', '))}</p>` : '';
  const source = species.source ? `<a href="${escapeHtml(species.source)}" target="_blank" rel="noopener">Nombre científico: Catalogue of Life / GBIF</a>` : 'Imagen ilustrativa de la infografía v0.2.';
  const credit = species.photo ? `<p class="source-note">Foto: ${escapeHtml(species.photo.author)} · <a href="${escapeHtml(species.photo.source)}" target="_blank" rel="noopener">Wikimedia Commons</a> · ${species.photo.licenseUrl ? `<a href="${escapeHtml(species.photo.licenseUrl)}" target="_blank" rel="noopener">${escapeHtml(species.photo.license)}</a>` : escapeHtml(species.photo.license)}. Imagen reducida para la app.</p>` : '';
  openSheet(`<h2>${escapeHtml(species.name)}</h2>${visual}<p><strong>${escapeHtml(species.common)}</strong></p>${aliases}<p>${escapeHtml(species.note)}</p>${credit}<p class="source-note">${source} Las fotografías son ilustrativas y no bastan para identificar un ejemplar.</p><button type="button" id="record-this">Registrar esta especie</button>`);
  $('#record-this').addEventListener('click',()=>{ closeSheet(); showScreen('registro'); $('#species').value=species.name; });
}

function showRecordList() {
  openSheet(`<h2>Mis hallazgos</h2>${state.records.length ? state.records.map(r=>`<button type="button" class="record-row" data-record="${escapeHtml(r.id)}"><span>${escapeHtml(r.species)} · ${r.quantity} · ${escapeHtml(new Date(r.createdAt).toLocaleDateString('es-ES'))}</span></button>`).join('') : '<p>Aún no hay hallazgos guardados.</p>'}`);
  for (const button of $('#sheet-content').querySelectorAll('[data-record]')) button.addEventListener('click',()=>showRecord(button.dataset.record));
}

function showRecord(id) {
  const r = state.records.find(item=>item.id===id); if (!r) return;
  const date = new Date(r.createdAt).toLocaleString('es-ES');
  openSheet(`<h2>${escapeHtml(r.species)}</h2><p>${escapeHtml(date)} · ${r.quantity} ejemplares · ${escapeHtml(r.condition)}</p><p>Hábitat: ${escapeHtml(r.habitat)}</p><p>Ubicación: ${Number.isFinite(r.latitude)?`${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}`:'sin GPS'}</p><p>${escapeHtml(r.notes)}</p><div id="record-photo"></div><button type="button" id="delete-record" class="danger">Eliminar hallazgo</button>`);
  if (r.photo) { const url=URL.createObjectURL(r.photo); const img=document.createElement('img'); img.src=url; img.alt='Foto del hallazgo'; img.style.cssText='width:100%;max-height:250px;object-fit:contain;border-radius:10px'; img.onload=()=>URL.revokeObjectURL(url); $('#record-photo').append(img); }
  $('#delete-record').addEventListener('click',async()=>{ if (!confirm('¿Eliminar este hallazgo del dispositivo?')) return; await remove('records',id); closeSheet(); await refresh(); toast('Hallazgo eliminado.'); });
}

async function exportData() {
  try {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup)],{type:'application/json'});
    const filename=`armycotza-copia-${new Date().toISOString().slice(0,10)}.json`;
    const shareFile = new File([blob],filename,{type:'application/json'});
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && navigator.canShare?.({files:[shareFile]})) await navigator.share({files:[shareFile],title:'Copia privada ARMYCOTZA'});
    else { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); }
    closeSheet();
    toast('Copia exportada. Guárdala en un lugar privado.');
  } catch(error) { if (error.name!=='AbortError') {console.warn('No se pudo exportar',error);toast(`No se pudo exportar: ${error.message}`);} }
}

async function importData(file) {
  if (!file) return;
  if (file.size>50*1024*1024) { toast('La copia supera 50 MB.'); return; }
  try { const count=await importBackup(JSON.parse(await file.text())); await refresh(); closeSheet(); toast(`${count} elementos importados. Los existentes se han conservado.`); }
  catch(error) { toast(error.message || 'No se pudo importar la copia.'); }
}

async function importRoute(file) {
  if (!file) return;
  if (file.size>5*1024*1024) { toast('El GPX supera 5 MB.'); return; }
  try { const route=parseGpx(await file.text(),file.name); await put('routes',route); await refresh(); closeSheet(); map.centerOn(route.points[0][0],route.points[0][1],13); showScreen('map'); toast('Ruta GPX añadida en rojo.'); }
  catch(error) { toast(error.message || 'No se pudo importar la ruta.'); }
}

function showMapPanel() {
  openSheet(`<h2>Capas y mapas</h2><p>Topografía en línea: OpenTopoMap. La ruta roja inicial «Antigua vía férrea de Artikutza» procede de Gipuzkoa Irekia (CC BY 4.0). Puedes añadir más trazados GPX.</p><label class="action">${svg('import')} Importar ruta GPX <input id="gpx-file" type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml"></label>${state.routes.length?state.routes.map(r=>`<button type="button" data-route="${escapeHtml(r.id)}">Ruta: ${escapeHtml(r.name)} · eliminar</button>`).join(''):'<p class="source-note">No hay rutas personales importadas.</p>'}<button type="button" id="offline-panel">Mapas sin conexión</button><p class="source-note"><a href="https://opendata.euskadi.eus/catalogo/-/rutas-senderismo-recorridos-cortos/" target="_blank" rel="noopener">Fuente y licencia de la ruta inicial</a> · <a href="https://www.donostia.eus/es/como-es-ciudad/parques-jardines/entornos-naturales/artikutza/actividades" target="_blank" rel="noopener">Más rutas oficiales de Artikutza</a>.</p>`);
  $('#gpx-file').addEventListener('change',e=>importRoute(e.target.files[0]));
  $('#offline-panel').addEventListener('click',showOfflinePanel);
  for (const button of $('#sheet-content').querySelectorAll('[data-route]')) button.addEventListener('click',async()=>{ if (!confirm('¿Eliminar esta ruta?')) return; await remove('routes',button.dataset.route); await refresh(); showMapPanel(); });
}

function showOfflinePanel() {
  openSheet(`<h2>Mapas sin conexión</h2><p>La app funciona sin red y conserva tus registros. Para ver topografía sin conexión, importa una imagen cartográfica que tengas derecho a guardar y sus límites geográficos. No descargamos masivamente las teselas de OpenTopoMap.</p><button type="button" id="use-online">Usar mapa en línea</button>${state.maps.map(m=>`<button type="button" data-map="${escapeHtml(m.id)}">${escapeHtml(m.name)} · usar</button>`).join('')}<form id="offline-form"><label class="field-label">Imagen cartográfica PNG/JPEG/WebP<input id="offline-image" type="file" accept="image/png,image/jpeg,image/webp" required></label><label class="field-label">Nombre<input id="offline-name" type="text" maxlength="120" required placeholder="Artikutza topo"></label><label class="field-label">Límites: sur, oeste, norte, este</label><div class="bounds-inputs"><input id="bound-s" type="number" step="any" required placeholder="Sur"><input id="bound-w" type="number" step="any" required placeholder="Oeste"><input id="bound-n" type="number" step="any" required placeholder="Norte"><input id="bound-e" type="number" step="any" required placeholder="Este"></div><label class="field-label">Atribución y licencia<input id="offline-attribution" type="text" maxlength="500" required placeholder="© autor · licencia"></label><button type="submit">Guardar mapa local</button></form><p class="source-note">Los mapas importados quedan en este navegador. Comprueba los permisos del proveedor antes de exportarlos o compartirlos.</p>`);
  $('#use-online').addEventListener('click',()=>{localStorage.removeItem('armycotza-offline-map');map.setOfflineMap(null);closeSheet();toast('Mapa en línea seleccionado.');});
  for (const button of $('#sheet-content').querySelectorAll('[data-map]')) button.addEventListener('click',()=>{localStorage.setItem('armycotza-offline-map',button.dataset.map);map.setOfflineMap(state.maps.find(m=>m.id===button.dataset.map));closeSheet();toast('Mapa local activado.');});
  $('#offline-form').addEventListener('submit',async e=>{
    e.preventDefault(); const image=$('#offline-image').files[0]; if (!image || image.size>30*1024*1024) {toast('Usa una imagen de hasta 30 MB.');return;}
    const bounds=['#bound-s','#bound-w','#bound-n','#bound-e'].map(selector=>Number($(selector).value));
    if (!bounds.every(Number.isFinite)||bounds[0]>=bounds[2]||bounds[1]>=bounds[3]||Math.abs(bounds[0])>90||Math.abs(bounds[2])>90||Math.abs(bounds[1])>180||Math.abs(bounds[3])>180){toast('Los límites geográficos no son válidos.');return;}
    const item={id:crypto.randomUUID(),name:$('#offline-name').value.trim(),bounds,attribution:$('#offline-attribution').value.trim(),image};
    try {await put('offlineMaps',item);localStorage.setItem('armycotza-offline-map',item.id);await refresh();closeSheet();toast('Mapa local guardado y activado.');}catch(error){toast('No se pudo guardar el mapa. Comprueba el espacio disponible.');}
  });
}

function showMenu() {
  openSheet(`<h2>ARMYCOTZA</h2><p>Tu cuaderno micológico privado de Artikutza. Hallazgos, fotos y mapas importados se guardan en este dispositivo.</p><button type="button" id="menu-records">Mis hallazgos (${state.records.length})</button><button type="button" id="menu-maps">Capas, rutas y mapas sin conexión</button><button type="button" id="menu-export">Exportar copia privada</button><label class="action">Importar copia privada<input id="backup-file" type="file" accept=".json,application/json"></label><button type="button" id="menu-install">Cómo instalar la app</button><button type="button" id="menu-delete" class="danger">Borrar todos los datos locales</button><p class="source-note">La instalación de la PWA requiere HTTPS o localhost. Las teselas en línea proceden de OpenTopoMap y no se precargan para uso sin conexión.</p>`);
  $('#menu-records').addEventListener('click',showRecordList);
  $('#menu-maps').addEventListener('click',showMapPanel);
  $('#menu-export').addEventListener('click',exportData);
  $('#backup-file').addEventListener('change',e=>importData(e.target.files[0]));
  $('#menu-install').addEventListener('click',()=>openSheet('<h2>Instalar ARMYCOTZA</h2><p>En iPhone: abre esta dirección en Safari, toca Compartir y elige «Añadir a pantalla de inicio».</p><p>En escritorio: usa el icono de instalación del navegador. La app queda disponible sin red; la topografía necesita un mapa local importado.</p>'));
  $('#menu-delete').addEventListener('click',async()=>{if(!confirm('¿Borrar todos los hallazgos, rutas y mapas guardados en este dispositivo? Exporta una copia antes si quieres conservarlos.'))return;await clearAll();localStorage.removeItem('armycotza-offline-map');localStorage.removeItem('armycotza-weather-artikutza');await refresh();closeSheet();toast('Datos locales borrados.');});
}

function showSearch() {
  openSheet('<h2>Buscar especies</h2><input id="species-query" type="search" placeholder="Nombre científico o común" style="width:100%;padding:10px;border-radius:9px"><div id="search-results"></div>');
  const input=$('#species-query');
  const render=()=>{const q=input.value.trim().toLocaleLowerCase('es');$('#search-results').innerHTML=SPECIES.filter(s=>(s.name+' '+s.common+' '+(s.aliases||[]).join(' ')).toLocaleLowerCase('es').includes(q)).map(s=>`<button type="button" data-species="${s.id}">${escapeHtml(s.name)} · ${escapeHtml(s.common)}</button>`).join('')||'<p>Sin resultados.</p>';for(const button of $('#search-results').querySelectorAll('[data-species]'))button.addEventListener('click',()=>showSpecies(button.dataset.species));};
  input.addEventListener('input',render);render();input.focus();
}

function setupEvents() {
  document.querySelectorAll('.bottom-nav button').forEach(button=>button.addEventListener('click',()=>showScreen(button.dataset.screen)));
  $('#header-left').addEventListener('click',()=>state.screen==='map'?showMenu():showScreen('map'));
  $('#header-right').addEventListener('click',showSearch);
  $('#guide-filters').addEventListener('click',e=>{const button=e.target.closest('button[data-filter]');if(!button)return;state.guideFilter=button.dataset.filter;for(const item of $('#guide-filters').querySelectorAll('button'))item.classList.toggle('selected',item===button);renderGuide();});
  $('#guide-list').addEventListener('click',e=>{const button=e.target.closest('button[data-species]');if(button)showSpecies(button.dataset.species);});
  $('#stats-filters').addEventListener('click',e=>{const button=e.target.closest('button[data-period]');if(!button)return;state.period=button.dataset.period;for(const item of $('#stats-filters').querySelectorAll('button'))item.classList.toggle('selected',item===button);renderStats();});
  $('#layers-btn').addEventListener('click',showMapPanel);
  $('#map-settings-btn').addEventListener('click',showOfflinePanel);
  $('#zoom-in').addEventListener('click',()=>map.setZoom(map.zoom+1));
  $('#zoom-out').addEventListener('click',()=>map.setZoom(map.zoom-1));
  $('#locate-btn').addEventListener('click',getGps);
  $('#map-markers').addEventListener('click',e=>{const button=e.target.closest('.map-marker');if(button)showRecord(button.dataset.id);});
  $('.sheet-close').addEventListener('click',closeSheet);
}

async function init() {
  setupForm();setupEvents();renderGuide();showScreen('map');
  try { state.baseRoutes = await fetch('./assets/official-routes.json').then(response => response.json()); } catch(error) { state.baseRoutes = []; }
  try {await refresh();} catch(error) {toast('El almacenamiento local no está disponible en este navegador.');}
  refreshWeather();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js?v=15').catch(()=>{});
}
init();
