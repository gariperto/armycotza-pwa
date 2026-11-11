export const SPECIES = [
  { id: 'boletus-edulis', name: 'Boletus edulis', common: 'Hongo blanco', category: 'edible', image: './assets/especie-1.png', note: 'Ficha visual de referencia. Identifica cada ejemplar con una persona experta antes de cualquier consumo.' },
  { id: 'lactarius-deliciosus', name: 'Lactarius deliciosus', common: 'Níscalo', category: 'edible', image: './assets/especie-2.png', note: 'La imagen de la infografía es ilustrativa; confirma rasgos y hábitat con una persona experta.' },
  { id: 'cantharellus-cibarius', name: 'Cantharellus cibarius', common: 'Rebozuelo', category: 'edible', image: './assets/especie-3.png', note: 'La imagen de la infografía es ilustrativa; confirma rasgos y hábitat con una persona experta.' },
  { id: 'amanita-caesarea', name: 'Amanita caesarea', common: 'Oronja', category: 'edible', image: './assets/especie-4.png', note: 'No determines una amanita por una fotografía. La confusión con especies peligrosas puede ser grave.' },
  { id: 'hydnum-repandum', name: 'Hydnum repandum', common: 'Lengua de vaca', category: 'edible', image: './assets/especie-5.png', note: 'La imagen de la infografía es ilustrativa; confirma rasgos y hábitat con una persona experta.' },
  { id: 'boletus-aereus', name: 'Boletus aereus', common: 'Boleto negro', category: 'unverified', aliases: ['aereus'], image: './assets/boletus-aereus.jpg', photo: { author: 'Roberto Petruzzo', license: 'Dominio público', source: 'https://commons.wikimedia.org/wiki/File:Boletus_aereus_IT.JPG' }, source: 'https://www.gbif.org/taxon/MC92', note: 'Nombre contrastado. Ficha de identificación y comestibilidad pendiente de revisión.' },
  { id: 'imleria-badia', name: 'Imleria badia', common: 'Boleto bayo', category: 'unverified', aliases: ['Boletus badius', 'boletus badio', 'badio'], image: './assets/imleria-badia.jpg', photo: { author: 'nbasargin', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Imleria_badia_237720624.jpg' }, source: 'https://www.gbif.org/taxon/3PJ2R', note: 'Antes citado como Boletus badius. Ficha de identificación y comestibilidad pendiente de revisión.' },
  { id: 'butyriboletus-regius', name: 'Butyriboletus regius', common: 'Boleto real', category: 'unverified', aliases: ['Boletus regius', 'boletus regio', 'regio'], image: './assets/butyriboletus-regius.jpg', photo: { author: 'Davide Puddu', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Butyriboletus_regius.jpg' }, source: 'https://www.gbif.org/taxon/NZ86', note: 'Antes citado como Boletus regius. Ficha de identificación y comestibilidad pendiente de revisión.' },
  { id: 'boletus-pinophilus', name: 'Boletus pinophilus', common: 'Boleto de pino', category: 'unverified', aliases: ['Boletus pinicola', 'pinicola'], image: './assets/boletus-pinophilus.jpg', photo: { author: 'Aorg1961', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', source: 'https://commons.wikimedia.org/wiki/File:Boletus_pinophilus_DSCF6307.jpg' }, source: 'https://www.gbif.org/taxon/MCWC', note: 'También citado como Boletus pinicola. Ficha de identificación y comestibilidad pendiente de revisión.' },
  { id: 'neoboletus-erythropus', name: 'Neoboletus erythropus', common: 'Boleto de pie rojo', category: 'unverified', aliases: ['Boletus erythropus', 'boletus erytropus', 'erytropus'], image: './assets/neoboletus-erythropus.jpg', photo: { author: 'Lucian Clanet', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Neoboletus_erythropus_2.jpg' }, source: 'https://www.gbif.org/taxon/9ZC6Y', note: 'Antes citado como Boletus erythropus. La identificación y la comestibilidad requieren revisión experta.' },
  { id: 'leccinellum-lepidum', name: 'Leccinellum lepidum', common: 'Boleto agradable', category: 'unverified', aliases: ['Leccinum lepidum', 'leccinum lecium', 'lecium'], image: './assets/leccinellum-lepidum.jpg', photo: { author: 'sarahfaulwetter', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Leccinellum_lepidum_1.jpg' }, source: 'https://www.gbif.org/taxon/6P5F2', note: 'Antes citado como Leccinum lepidum. Ficha de identificación y comestibilidad pendiente de revisión.' },
  { id: 'craterellus-cornucopioides', name: 'Craterellus cornucopioides', common: 'Trompeta de los muertos', category: 'unverified', aliases: ['trompetas de las muertos', 'trompetas de los muertos'], image: './assets/craterellus-cornucopioides.jpg', photo: { author: 'Lucian Clanet', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', source: 'https://commons.wikimedia.org/wiki/File:Craterellus_cornucopioides_collection.jpg' }, source: 'https://www.gbif.org/taxon/Z8S9', note: 'Nombre contrastado. Ficha de identificación y comestibilidad pendiente de revisión.' }
];

export const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function seasonStart(year) { return new Date(year, 6, 1); }

export function recordsForPeriod(records, period, now = new Date()) {
  if (period === 'all') return records;
  if (period === 'year') return records.filter(r => new Date(r.createdAt).getFullYear() === now.getFullYear());
  const start = now.getMonth() >= 6 ? seasonStart(now.getFullYear()) : seasonStart(now.getFullYear() - 1);
  return records.filter(r => new Date(r.createdAt) >= start);
}

export function statsFor(records) {
  const locations = new Set(records.filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)).map(r => `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`));
  return { records: records.length, specimens: records.reduce((sum, r) => sum + Number(r.quantity || 0), 0), zones: locations.size, species: new Set(records.map(r => r.species)).size };
}

export function monthlyCounts(records, year) {
  const result = Array(12).fill(0);
  for (const r of records) { const d = new Date(r.createdAt); if (!Number.isNaN(d.getTime()) && d.getFullYear() === year) result[d.getMonth()]++; }
  return result;
}
