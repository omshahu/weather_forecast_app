/* ═══════════════════════════════════════════════════════════
   WEATHER MAP DASHBOARD  —  map.js
   Real-time heatmap via OWM temp_new tile layer + GeoJSON interaction
═══════════════════════════════════════════════════════════ */
'use strict';

// ── Country list (code, capital, flag) ───────────────────────────
const COUNTRIES = [
  { name:'Afghanistan',          code:'AF', capital:'Kabul',          flag:'🇦🇫' },
  { name:'Albania',              code:'AL', capital:'Tirana',         flag:'🇦🇱' },
  { name:'Algeria',              code:'DZ', capital:'Algiers',        flag:'🇩🇿' },
  { name:'Angola',               code:'AO', capital:'Luanda',         flag:'🇦🇴' },
  { name:'Argentina',            code:'AR', capital:'Buenos Aires',   flag:'🇦🇷' },
  { name:'Australia',            code:'AU', capital:'Sydney',         flag:'🇦🇺' },
  { name:'Austria',              code:'AT', capital:'Vienna',         flag:'🇦🇹' },
  { name:'Bangladesh',           code:'BD', capital:'Dhaka',          flag:'🇧🇩' },
  { name:'Belgium',              code:'BE', capital:'Brussels',       flag:'🇧🇪' },
  { name:'Bolivia',              code:'BO', capital:'La Paz',         flag:'🇧🇴' },
  { name:'Brazil',               code:'BR', capital:'Brasilia',       flag:'🇧🇷' },
  { name:'Canada',               code:'CA', capital:'Ottawa',         flag:'🇨🇦' },
  { name:'Chile',                code:'CL', capital:'Santiago',       flag:'🇨🇱' },
  { name:'China',                code:'CN', capital:'Beijing',        flag:'🇨🇳' },
  { name:'Colombia',             code:'CO', capital:'Bogota',         flag:'🇨🇴' },
  { name:'Congo',                code:'CG', capital:'Brazzaville',    flag:'🇨🇬' },
  { name:'Cuba',                 code:'CU', capital:'Havana',         flag:'🇨🇺' },
  { name:'Czech Republic',       code:'CZ', capital:'Prague',         flag:'🇨🇿' },
  { name:'Denmark',              code:'DK', capital:'Copenhagen',     flag:'🇩🇰' },
  { name:'Ecuador',              code:'EC', capital:'Quito',          flag:'🇪🇨' },
  { name:'Egypt',                code:'EG', capital:'Cairo',          flag:'🇪🇬' },
  { name:'Ethiopia',             code:'ET', capital:'Addis Ababa',    flag:'🇪🇹' },
  { name:'Finland',              code:'FI', capital:'Helsinki',       flag:'🇫🇮' },
  { name:'France',               code:'FR', capital:'Paris',          flag:'🇫🇷' },
  { name:'Germany',              code:'DE', capital:'Berlin',         flag:'🇩🇪' },
  { name:'Ghana',                code:'GH', capital:'Accra',          flag:'🇬🇭' },
  { name:'Greece',               code:'GR', capital:'Athens',         flag:'🇬🇷' },
  { name:'Guatemala',            code:'GT', capital:'Guatemala City', flag:'🇬🇹' },
  { name:'Hungary',              code:'HU', capital:'Budapest',       flag:'🇭🇺' },
  { name:'India',                code:'IN', capital:'New Delhi',      flag:'🇮🇳' },
  { name:'Indonesia',            code:'ID', capital:'Jakarta',        flag:'🇮🇩' },
  { name:'Iran',                 code:'IR', capital:'Tehran',         flag:'🇮🇷' },
  { name:'Iraq',                 code:'IQ', capital:'Baghdad',        flag:'🇮🇶' },
  { name:'Ireland',              code:'IE', capital:'Dublin',         flag:'🇮🇪' },
  { name:'Israel',               code:'IL', capital:'Tel Aviv',       flag:'🇮🇱' },
  { name:'Italy',                code:'IT', capital:'Rome',           flag:'🇮🇹' },
  { name:'Japan',                code:'JP', capital:'Tokyo',          flag:'🇯🇵' },
  { name:'Jordan',               code:'JO', capital:'Amman',          flag:'🇯🇴' },
  { name:'Kazakhstan',           code:'KZ', capital:'Astana',         flag:'🇰🇿' },
  { name:'Kenya',                code:'KE', capital:'Nairobi',        flag:'🇰🇪' },
  { name:'Malaysia',             code:'MY', capital:'Kuala Lumpur',   flag:'🇲🇾' },
  { name:'Mexico',               code:'MX', capital:'Mexico City',    flag:'🇲🇽' },
  { name:'Morocco',              code:'MA', capital:'Rabat',          flag:'🇲🇦' },
  { name:'Mozambique',           code:'MZ', capital:'Maputo',         flag:'🇲🇿' },
  { name:'Myanmar',              code:'MM', capital:'Naypyidaw',      flag:'🇲🇲' },
  { name:'Nepal',                code:'NP', capital:'Kathmandu',      flag:'🇳🇵' },
  { name:'Netherlands',          code:'NL', capital:'Amsterdam',      flag:'🇳🇱' },
  { name:'New Zealand',          code:'NZ', capital:'Wellington',     flag:'🇳🇿' },
  { name:'Nigeria',              code:'NG', capital:'Abuja',          flag:'🇳🇬' },
  { name:'Norway',               code:'NO', capital:'Oslo',           flag:'🇳🇴' },
  { name:'Pakistan',             code:'PK', capital:'Islamabad',      flag:'🇵🇰' },
  { name:'Peru',                 code:'PE', capital:'Lima',           flag:'🇵🇪' },
  { name:'Philippines',          code:'PH', capital:'Manila',         flag:'🇵🇭' },
  { name:'Poland',               code:'PL', capital:'Warsaw',         flag:'🇵🇱' },
  { name:'Portugal',             code:'PT', capital:'Lisbon',         flag:'🇵🇹' },
  { name:'Romania',              code:'RO', capital:'Bucharest',      flag:'🇷🇴' },
  { name:'Russia',               code:'RU', capital:'Moscow',         flag:'🇷🇺' },
  { name:'Saudi Arabia',         code:'SA', capital:'Riyadh',         flag:'🇸🇦' },
  { name:'Senegal',              code:'SN', capital:'Dakar',          flag:'🇸🇳' },
  { name:'South Africa',         code:'ZA', capital:'Pretoria',       flag:'🇿🇦' },
  { name:'South Korea',          code:'KR', capital:'Seoul',          flag:'🇰🇷' },
  { name:'Spain',                code:'ES', capital:'Madrid',         flag:'🇪🇸' },
  { name:'Sri Lanka',            code:'LK', capital:'Colombo',        flag:'🇱🇰' },
  { name:'Sudan',                code:'SD', capital:'Khartoum',       flag:'🇸🇩' },
  { name:'Sweden',               code:'SE', capital:'Stockholm',      flag:'🇸🇪' },
  { name:'Switzerland',          code:'CH', capital:'Bern',           flag:'🇨🇭' },
  { name:'Syria',                code:'SY', capital:'Damascus',       flag:'🇸🇾' },
  { name:'Tanzania',             code:'TZ', capital:'Dodoma',         flag:'🇹🇿' },
  { name:'Thailand',             code:'TH', capital:'Bangkok',        flag:'🇹🇭' },
  { name:'Turkey',               code:'TR', capital:'Ankara',         flag:'🇹🇷' },
  { name:'Uganda',               code:'UG', capital:'Kampala',        flag:'🇺🇬' },
  { name:'Ukraine',              code:'UA', capital:'Kyiv',           flag:'🇺🇦' },
  { name:'United Arab Emirates', code:'AE', capital:'Dubai',          flag:'🇦🇪' },
  { name:'United Kingdom',       code:'GB', capital:'London',         flag:'🇬🇧' },
  { name:'United States',        code:'US', capital:'Washington DC',  flag:'🇺🇸' },
  { name:'Uruguay',              code:'UY', capital:'Montevideo',     flag:'🇺🇾' },
  { name:'Uzbekistan',           code:'UZ', capital:'Tashkent',       flag:'🇺🇿' },
  { name:'Venezuela',            code:'VE', capital:'Caracas',        flag:'🇻🇪' },
  { name:'Vietnam',              code:'VN', capital:'Hanoi',          flag:'🇻🇳' },
  { name:'Yemen',                code:'YE', capital:'Sanaa',          flag:'🇾🇪' },
  { name:'Zambia',               code:'ZM', capital:'Lusaka',         flag:'🇿🇲' },
  { name:'Zimbabwe',             code:'ZW', capital:'Harare',         flag:'🇿🇼' },
];

// ── App state ─────────────────────────────────────────────────────
let map, geoLayer, tempTileLayer;
let owmKey        = '';
let weatherData   = {};   // ISO-A2 → weather object
let unit          = 'C';
let autoRefreshId = null;
let geoJSON       = null;

// ── DOM refs ──────────────────────────────────────────────────────
const $loading    = document.getElementById('map-loading');
const $loaderProg = document.getElementById('loader-progress');
const $panel      = document.getElementById('detail-panel');
const $tooltip    = document.getElementById('map-tooltip');
const $search     = document.getElementById('country-search');
const $dropdown   = document.getElementById('search-dropdown');
const $toastBox   = document.getElementById('toast-container');
const $statLoaded = document.getElementById('stat-loaded');
const $statHot    = document.getElementById('stat-hot');
const $statCold   = document.getElementById('stat-cold');
const $statTime   = document.getElementById('stat-time');

// ═══════════════════════ UTILS ════════════════════════════════════
function toDisplay(c) { return unit === 'F' ? Math.round(c * 9/5 + 32) : Math.round(c); }
function unitLabel()  { return unit === 'F' ? '°F' : '°C'; }

function tempColor(c) {
  const stops = [
    [-20,   0,   0, 139],
    [-10,  65, 105, 225],
    [  0,  50, 205,  50],
    [ 20, 255, 215,   0],
    [ 30, 255, 140,   0],
    [ 40, 220,  20,  60],
    [ 50, 107,   0,   0],
  ];
  if (c <= stops[0][0]) return `rgb(${stops[0][1]},${stops[0][2]},${stops[0][3]})`;
  const last = stops[stops.length-1];
  if (c >= last[0])     return `rgb(${last[1]},${last[2]},${last[3]})`;
  for (let i = 1; i < stops.length; i++) {
    if (c <= stops[i][0]) {
      const lo = stops[i-1], hi = stops[i];
      const r = (c - lo[0]) / (hi[0] - lo[0]);
      const L = (a,b) => Math.round(a + (b-a)*r);
      return `rgb(${L(lo[1],hi[1])},${L(lo[2],hi[2])},${L(lo[3],hi[3])})`;
    }
  }
}

function weatherIcon(main='') {
  const m = main.toLowerCase();
  if (m.includes('thunder')) return '⛈️';
  if (m.includes('drizzle')) return '🌦️';
  if (m.includes('rain'))    return '🌧️';
  if (m.includes('snow'))    return '❄️';
  if (m.includes('mist')||m.includes('fog')||m.includes('haze')) return '🌫️';
  if (m.includes('cloud'))   return '☁️';
  if (m.includes('clear'))   return '☀️';
  return '🌡️';
}

// ═══════════════════════ MAP INIT ════════════════════════════════
function initMap() {
  map = L.map('world-map', {
    center: [20, 10], zoom: 2,
    minZoom: 2, maxZoom: 8,
    zoomControl: true, attributionControl: false,
  });

  // ── Base layer: Stamen Toner-Lite (clean, white/grey) so the
  //    colorful OWM heatmap pops on top ──────────────────────────
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

  map.on('click', () => closePanel());
}

// ── Add OWM temperature tile overlay ─────────────────────────────
function addTempLayer(apiKey) {
  if (tempTileLayer) { tempTileLayer.remove(); }
  // OWM provides a real-time temperature heatmap tile layer
  tempTileLayer = L.tileLayer(
    `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${apiKey}`,
    { opacity: 0.82, maxZoom: 19, attribution: '' }
  ).addTo(map);
}

// ── Country name labels on top ────────────────────────────────────
function addLabelLayer() {
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19, pane: 'overlayPane',
  }).addTo(map);
}

// ═══════════════════════ GEOJSON (transparent — only for events) ══
async function loadGeoJSON() {
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    );
    if (!res.ok) throw new Error();
    geoJSON = await res.json();
  } catch(_) {
    showToast('Could not load country boundaries', 'error');
  }
}

function buildGeoLayer() {
  if (geoLayer) geoLayer.remove();
  if (!geoJSON)  return;

  geoLayer = L.geoJSON(geoJSON, {
    style: () => ({
      fillColor:   'transparent',
      fillOpacity: 0,
      color:       'rgba(255,255,255,0.18)',
      weight:      0.7,
    }),
    onEachFeature: (feat, layer) => {
      // ISO_A2 may be '-99' for some territories — fall back to name matching
      const iso  = feat.properties.ISO_A2;
      const name = feat.properties.ADMIN || feat.properties.NAME || '';
      // Also try to find by country name in case ISO doesn't match
      const knownCountry = COUNTRIES.find(c =>
        c.code === iso ||
        c.name.toLowerCase() === name.toLowerCase()
      );

      layer.on({
        mouseover: e => onHover(e, knownCountry ? knownCountry.code : iso, name),
        mouseout:  ()=> hideTooltip(),
        click:     e => {
          L.DomEvent.stopPropagation(e);
          if (knownCountry) onCountryClick(knownCountry.code, knownCountry.name);
          else if (name) showToast(`No weather data for ${name}`, 'error');
        },
      });
    },
  }).addTo(map);
}

// ═══════════════════════ FETCH WEATHER ═══════════════════════════
async function fetchAllWeather() {
  $loading.classList.remove('hidden');
  const total = COUNTRIES.length;
  let done = 0;

  for (let i = 0; i < COUNTRIES.length; i += 10) {
    const chunk = COUNTRIES.slice(i, i + 10);
    await Promise.all(chunk.map(async c => {
      try {
        const res  = await fetch(`/api/weather?city=${encodeURIComponent(c.capital)}`);
        const data = await res.json();
        if (!data.error) weatherData[c.code] = { ...data, flag: c.flag, countryName: c.name };
      } catch(_) {}
      $loaderProg.textContent = `Fetching ${++done} / ${total} countries`;
    }));
    await delay(120);
  }

  updateStats();
  $statTime.textContent = new Date().toLocaleTimeString();
  $loading.classList.add('hidden');
  showToast('Temperature data loaded!', 'success');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateStats() {
  const vals = Object.values(weatherData);
  if (!vals.length) return;
  $statLoaded.textContent = vals.length;
  const sorted = [...vals].sort((a,b) => b.temperature - a.temperature);
  const hot  = sorted[0], cold = sorted[sorted.length-1];
  $statHot.textContent  = `${hot.countryName}  ${toDisplay(hot.temperature)}${unitLabel()}`;
  $statCold.textContent = `${cold.countryName}  ${toDisplay(cold.temperature)}${unitLabel()}`;
}

// ═══════════════════════ HOVER / TOOLTIP ════════════════════════
function onHover(e, iso, name) {
  const wd = weatherData[iso];

  // Highlight border
  e.target.setStyle({ color: 'rgba(255,255,255,0.9)', weight: 2 });
  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) e.target.bringToFront();

  // Fill tooltip
  document.getElementById('tt-name').textContent = wd ? `${wd.flag} ${name}` : name;
  document.getElementById('tt-temp').textContent = wd
    ? `${toDisplay(wd.temperature)}${unitLabel()}` : 'No data';
  document.getElementById('tt-temp').style.color = wd ? tempColor(wd.temperature) : '#aaa';
  document.getElementById('tt-desc').textContent = wd ? (wd.description || '') : '';
  $tooltip.classList.add('visible');

  positionTooltip(e);
  map.on('mousemove', positionTooltipMove);
}

function positionTooltip(e) {
  const mx = e.originalEvent ? e.originalEvent.clientX : e.clientX;
  const my = e.originalEvent ? e.originalEvent.clientY : e.clientY;
  const tw = $tooltip.offsetWidth + 16, th = $tooltip.offsetHeight + 16;
  let l = mx + 14, t = my + 14;
  if (l + tw > window.innerWidth)  l = mx - tw;
  if (t + th > window.innerHeight) t = my - th;
  $tooltip.style.left = l + 'px';
  $tooltip.style.top  = t + 'px';
}
function positionTooltipMove(e) { positionTooltip(e); }

function hideTooltip() {
  $tooltip.classList.remove('visible');
  map.off('mousemove', positionTooltipMove);
  if (geoLayer) geoLayer.resetStyle();
}

// ═══════════════════════ CLICK → DETAIL PANEL ═══════════════════
function onCountryClick(iso, name) {
  const wd = weatherData[iso];
  if (!wd) { showToast(`No data available for ${name}`, 'error'); return; }
  openPanel(wd);
}

function openPanel(wd) {
  const temp  = toDisplay(wd.temperature);
  const feels = toDisplay(wd.feels_like ?? wd.temperature);

  document.getElementById('panel-flag').textContent    = wd.flag || '';
  document.getElementById('panel-country').textContent = wd.countryName || wd.city;
  document.getElementById('panel-time').textContent    = new Date().toLocaleString();
  document.getElementById('panel-temp').textContent    = `${temp}${unitLabel()}`;
  document.getElementById('panel-feels').textContent   = `Feels like ${feels}${unitLabel()}`;
  document.getElementById('panel-icon').textContent    = weatherIcon(wd.weather_main);
  document.getElementById('panel-desc').textContent    = wd.description || '';
  document.getElementById('pm-humidity').textContent   = `${wd.humidity ?? '—'}%`;
  document.getElementById('pm-wind').textContent       = `${wd.wind_speed ?? '—'} m/s`;
  document.getElementById('pm-pressure').textContent   = `${wd.pressure ?? '—'} hPa`;
  document.getElementById('pm-feelslike').textContent  = `${feels}${unitLabel()}`;

  // Temp bar marker (range -20 to 50)
  const pct = Math.min(100, Math.max(0, (wd.temperature + 20) / 70 * 100));
  document.getElementById('panel-bar-fill').style.cssText   = `width:${100-pct}%; left:${pct}%`;
  document.getElementById('panel-bar-marker').style.left     = `${pct}%`;
  document.getElementById('panel-cached-badge').style.display = wd.cached ? 'inline-flex' : 'none';

  $panel.classList.add('open');
  $panel.setAttribute('aria-hidden', 'false');
}

function closePanel() {
  $panel.classList.remove('open');
  $panel.setAttribute('aria-hidden', 'true');
}
document.getElementById('panel-close').addEventListener('click', closePanel);

// ═══════════════════════ SEARCH ══════════════════════════════════
$search.addEventListener('input', () => {
  const q = $search.value.trim().toLowerCase();
  if (!q) { $dropdown.classList.remove('open'); return; }
  const hits = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q
  ).slice(0, 8);
  if (!hits.length) { $dropdown.classList.remove('open'); return; }
  $dropdown.innerHTML = hits.map(c => {
    const wd = weatherData[c.code];
    const ts = wd ? `${toDisplay(wd.temperature)}${unitLabel()}` : '';
    const col = wd ? tempColor(wd.temperature) : '#aaa';
    return `<div class="dd-item" data-code="${c.code}" data-name="${c.name}" role="option" tabindex="0">
      <span>${c.flag}</span><span>${c.name}</span>
      <span class="dd-temp" style="color:${col}">${ts}</span></div>`;
  }).join('');
  $dropdown.classList.add('open');
});

$dropdown.addEventListener('click', e => {
  const item = e.target.closest('.dd-item');
  if (!item) return;
  $search.value = item.dataset.name;
  $dropdown.classList.remove('open');
  zoomToCountry(item.dataset.code, item.dataset.name);
});

document.addEventListener('click', e => {
  if (!document.getElementById('search-wrapper').contains(e.target))
    $dropdown.classList.remove('open');
});

function zoomToCountry(code, name) {
  if (geoJSON) {
    const feat = geoJSON.features.find(f => f.properties.ISO_A2 === code);
    if (feat) {
      const lyr = L.geoJSON(feat);
      map.fitBounds(lyr.getBounds(), { padding:[60,60], maxZoom:5 });
    }
  }
  onCountryClick(code, name);
}

// ═══════════════════════ UNIT TOGGLE ════════════════════════════
document.getElementById('btn-celsius').addEventListener('click',     () => setUnit('C'));
document.getElementById('btn-fahrenheit').addEventListener('click',  () => setUnit('F'));

function setUnit(u) {
  unit = u;
  ['btn-celsius','btn-fahrenheit'].forEach(id => {
    const isActive = (id === 'btn-celsius') === (u === 'C');
    document.getElementById(id).classList.toggle('active', isActive);
    document.getElementById(id).setAttribute('aria-pressed', isActive);
  });
  if ($panel.classList.contains('open')) {
    const name = document.getElementById('panel-country').textContent;
    const wd   = Object.values(weatherData).find(w => w.countryName === name);
    if (wd) openPanel(wd);
  }
  updateStats();
}

// ═══════════════════════ REFRESH ════════════════════════════════
document.getElementById('refresh-btn').addEventListener('click', async () => {
  const btn = document.getElementById('refresh-btn');
  btn.classList.add('spinning');
  // Reload heatmap tiles (bust cache)
  if (tempTileLayer) { tempTileLayer.remove(); addTempLayer(owmKey); }
  weatherData = {};
  await fetchAllWeather();
  btn.classList.remove('spinning');
});

document.getElementById('auto-refresh-toggle').addEventListener('change', e => {
  if (e.target.checked) {
    autoRefreshId = setInterval(async () => {
      if (tempTileLayer) { tempTileLayer.remove(); addTempLayer(owmKey); }
      weatherData = {};
      await fetchAllWeather();
    }, 5 * 60 * 1000);
    showToast('Auto-refresh ON — every 5 minutes', 'success');
  } else {
    clearInterval(autoRefreshId);
    showToast('Auto-refresh OFF');
  }
});

// ═══════════════════════ TOAST ═══════════════════════════════════
function showToast(msg, type='') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $toastBox.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

// ═══════════════════════ BOOTSTRAP ══════════════════════════════
(async function boot() {
  initMap();

  // 1. Get API key from backend
  try {
    const cfg = await fetch('/api/config').then(r => r.json());
    owmKey = cfg.owm_key || '';
  } catch(_) {}

  // 2. OWM temperature heatmap tiles (the NASA-style colored layer)
  if (owmKey) {
    addTempLayer(owmKey);
  } else {
    showToast('API key missing — map tiles unavailable', 'error');
  }

  // 3. Country name labels on top
  addLabelLayer();

  // 4. Transparent GeoJSON for click/hover interaction
  $loaderProg.textContent = 'Loading country boundaries…';
  await loadGeoJSON();
  buildGeoLayer();

  // 5. Fetch weather data for all capitals (populates detail panel + search)
  $loaderProg.textContent = `Fetching 0 / ${COUNTRIES.length} countries`;
  await fetchAllWeather();
})();
