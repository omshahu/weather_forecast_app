// ============================================================
// WEATHERSPHERE — Static GitHub Pages Version
// Calls OpenWeatherMap API directly (no Flask backend)
// ============================================================

const OWM_KEY  = '4f983b601b0ecbf72487c1666df5ef87';
const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

// DOM
const cityInput      = document.getElementById('cityInput');
const searchIconBtn  = document.getElementById('searchIconBtn');
const headerCity     = document.getElementById('headerCity');
const locationBtn    = document.getElementById('locationBtn');
const mainTemp       = document.getElementById('mainTemp');
const mainDesc       = document.getElementById('mainDesc');
const feelsLike      = document.getElementById('feelsLike');
const mainIcon       = document.getElementById('mainIcon');
const windVal        = document.getElementById('windVal');
const humidityVal    = document.getElementById('humidityVal');
const pressureVal    = document.getElementById('pressureVal');
const forecastSection   = document.getElementById('forecastSection');
const forecastContainer = document.getElementById('forecastContainer');
const errorMessage      = document.getElementById('errorMessage');
const loadingOverlay    = document.getElementById('loadingOverlay');
const savedListContainer = document.getElementById('savedList');

// State
let currentUnit       = 'metric';
let savedLocations    = JSON.parse(localStorage.getItem('savedLocations') || '["London","New York","Tokyo"]');
let lastFetchedCity   = '';
let forecastChartInst = null;
let leafletMap        = null;
let mapMarker         = null;
let mapClickedData    = null;

// ── Tab switching ────────────────────────────────────────────
const navItems = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        tabViews.forEach(v => v.style.display = 'none');
        item.classList.add('active');
        const id = item.getAttribute('data-tab');
        document.getElementById(id).style.display = id === 'mapView' ? 'flex' : 'block';
        if (id === 'savedView') renderSavedLocations();
        if (id === 'mapView')   initMap();
    });
});

function switchHome() {
    navItems.forEach(n => n.classList.remove('active'));
    tabViews.forEach(v => v.style.display = 'none');
    document.querySelector('.nav-item[data-tab="homeView"]').classList.add('active');
    document.getElementById('homeView').style.display = 'block';
}

// ── Loading / Error ──────────────────────────────────────────
function showLoading() { loadingOverlay.classList.add('active'); }
function hideLoading() { loadingOverlay.classList.remove('active'); }

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.add('show');
    setTimeout(() => errorMessage.classList.remove('show'), 3500);
}

// ── Unit helpers ─────────────────────────────────────────────
function convertTemp(c) {
    return currentUnit === 'imperial' ? Math.round(c * 9/5 + 32) : Math.round(c);
}
function unitSym() { return currentUnit === 'imperial' ? 'F' : 'C'; }

// ── Fetch current weather by city ────────────────────────────
async function fetchWeather(city) {
    showLoading();
    try {
        const r = await fetch(
            `${OWM_BASE}/weather?q=${encodeURIComponent(city)}&appid=${OWM_KEY}&units=metric`
        );
        const d = await r.json();
        if (r.ok) {
            lastFetchedCity = d.name;
            renderCurrent(d);
            await fetchForecast(d.name);
            saveLocation(d.name);
            switchHome();
        } else {
            showError(d.message || `City "${city}" not found`);
        }
    } catch { showError('Network error'); }
    finally  { hideLoading(); }
}

// ── Fetch current weather by coordinates ────────────────────
async function fetchByCoords(lat, lon) {
    showLoading();
    try {
        const r = await fetch(
            `${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${OWM_KEY}&units=metric`
        );
        const d = await r.json();
        if (r.ok) {
            lastFetchedCity = d.name;
            renderCurrent(d);
            cityInput.placeholder = d.name;
            await fetchForecast(d.name);
            saveLocation(d.name);
            switchHome();
        } else { showError('Unable to get weather for this location'); }
    } catch { showError('Network error'); }
    finally  { hideLoading(); }
}

// ── Fetch 5-day forecast ─────────────────────────────────────
async function fetchForecast(city) {
    try {
        const r = await fetch(
            `${OWM_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${OWM_KEY}&units=metric&cnt=40`
        );
        const d = await r.json();
        if (r.ok) {
            processAndRenderForecast(d.list);
        }
    } catch { /* forecast is optional */ }
}

// ── Render current weather ───────────────────────────────────
function renderCurrent(d) {
    headerCity.textContent     = d.name;
    cityInput.placeholder      = d.name;
    cityInput.value            = '';
    mainTemp.textContent       = `${convertTemp(d.main.temp)}°${unitSym()}`;
    mainDesc.textContent       = d.weather[0].description;
    feelsLike.textContent      = `Feels like ${convertTemp(d.main.feels_like)}°${unitSym()}`;
    windVal.textContent        = d.wind.speed;
    humidityVal.textContent    = d.main.humidity;
    pressureVal.textContent    = d.main.pressure;

    const icon = d.weather[0].icon;
    mainIcon.src          = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    mainIcon.style.display = 'block';

    // Dynamic background
    const c = document.querySelector('.mobile-container');
    const t = d.main.temp;
    if (t > 30) {
        c.style.background = 'linear-gradient(160deg,#3d1a00 0%,#1a0900 50%,#020817 100%)';
        c.style.setProperty('--accent','#fb923c');
    } else if (t > 20) {
        c.style.background = 'linear-gradient(160deg,#0d2e3c 0%,#071624 50%,#020817 100%)';
        c.style.setProperty('--accent','#38bdf8');
    } else if (t < 5) {
        c.style.background = 'linear-gradient(160deg,#0f0c2e 0%,#07091c 50%,#020817 100%)';
        c.style.setProperty('--accent','#818cf8');
    } else {
        c.style.background = 'linear-gradient(160deg,#0d1f3c 0%,#080e1e 50%,#020817 100%)';
        c.style.setProperty('--accent','#38bdf8');
    }
}

// ── Process & render forecast ────────────────────────────────
function processAndRenderForecast(list) {
    // Group by date
    const daily = {};
    list.forEach(item => {
        const day = item.dt_txt.slice(0, 10);
        if (!daily[day]) daily[day] = { temps:[], icons:[], descs:[], humidity:[] };
        daily[day].temps.push(item.main.temp);
        daily[day].icons.push(item.weather[0].icon);
        daily[day].descs.push(item.weather[0].description);
        daily[day].humidity.push(item.main.humidity);
    });

    // Hourly slider (first 8 items = today)
    forecastSection.style.display = 'block';
    forecastContainer.innerHTML = '';
    const labels = [], tempData = [];
    list.slice(0, 8).forEach(item => {
        const t   = new Date(item.dt_txt);
        const lbl = t.toLocaleTimeString('en-US',{hour:'numeric',hour12:true});
        const tmp = convertTemp(item.main.temp);
        labels.push(lbl); tempData.push(tmp);

        const card = document.createElement('div');
        card.className = 'forecast-item';
        card.innerHTML = `
            <span class="f-time">${lbl}</span>
            <img class="f-icon" src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png">
            <span class="f-temp">${tmp}°</span>`;
        forecastContainer.appendChild(card);
    });

    renderChart(labels, tempData);

    // Daily cards
    const dailySection = document.getElementById('dailySection');
    const dailyCont    = document.getElementById('dailyContainer');
    dailySection.style.display = 'block';
    dailyCont.innerHTML = '';
    const today = new Date().toISOString().slice(0,10);

    Object.keys(daily).sort().slice(0, 6).forEach(day => {
        const d = daily[day];
        const max = convertTemp(Math.max(...d.temps));
        const min = convertTemp(Math.min(...d.temps));
        const humidity = Math.round(d.humidity.reduce((a,b)=>a+b,0)/d.humidity.length);
        // Most common icon
        const iconCounts = {};
        d.icons.forEach(i => iconCounts[i] = (iconCounts[i]||0)+1);
        const icon = Object.keys(iconCounts).sort((a,b)=>iconCounts[b]-iconCounts[a])[0];
        const desc = d.descs[0];

        const isToday    = day === today;
        const tomorrowD  = new Date(); tomorrowD.setDate(tomorrowD.getDate()+1);
        const isTomorrow = day === tomorrowD.toISOString().slice(0,10);
        const label      = isToday ? 'Today' : isTomorrow ? 'Tomorrow'
            : new Date(day+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

        const card = document.createElement('div');
        card.className = 'daily-card';
        card.innerHTML = `
            <span class="day-name ${isToday?'today-label':''}">${label}</span>
            <img class="day-icon" src="https://openweathermap.org/img/wn/${icon}.png">
            <span class="day-desc">${desc}</span>
            <span class="day-humidity"><i class="fas fa-droplet"></i> ${humidity}%</span>
            <span class="day-temps">
                <span class="day-max">${max}°</span>
                <span class="day-min">${min}°</span>
            </span>`;
        dailyCont.appendChild(card);
    });
}

// ── Chart ────────────────────────────────────────────────────
function renderChart(labels, data) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    if (forecastChartInst) forecastChartInst.destroy();
    forecastChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Temperature (°${unitSym()})`,
                data,
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56,189,248,0.15)',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#38bdf8',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(13,21,38,0.95)',
                    titleColor: '#8b9ab8', bodyColor: '#fff', displayColors: false,
                    callbacks: { label: ctx => `${ctx.parsed.y}°${unitSym()}` }
                }
            },
            scales: {
                x: { grid:{display:false}, ticks:{color:'#8b9ab8', maxTicksLimit:5} },
                y: { grid:{color:'rgba(255,255,255,0.05)'}, ticks:{color:'#8b9ab8', callback:v=>`${v}°`} }
            }
        }
    });
}

// ── Saved Locations ──────────────────────────────────────────
function saveLocation(city) {
    if (!city) return;
    savedLocations = savedLocations.filter(c => c.toLowerCase() !== city.toLowerCase());
    savedLocations.unshift(city);
    savedLocations = savedLocations.slice(0, 10);
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
}

function renderSavedLocations() {
    if (!savedListContainer) return;
    if (savedLocations.length === 0) {
        savedListContainer.innerHTML = '<p style="color:var(--text-secondary);text-align:center;">No saved locations.</p>';
        return;
    }
    savedListContainer.innerHTML = savedLocations.map(city => `
        <div onclick="fetchWeather('${city}')" style="background:var(--card-bg);padding:15px 20px;border-radius:16px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--card-border);cursor:pointer;transition:0.2s;">
            <div style="display:flex;align-items:center;gap:15px;">
                <i class="fas fa-location-dot" style="color:var(--accent);"></i>
                <span style="color:white;font-weight:500;font-size:1.05rem;">${city}</span>
            </div>
            <i class="fas fa-chevron-right" style="color:var(--text-secondary);font-size:0.8rem;"></i>
        </div>`).join('');
}

// ── Leaflet Map ──────────────────────────────────────────────
function initMap() {
    if (leafletMap) { setTimeout(()=>leafletMap.invalidateSize(),100); return; }
    leafletMap = L.map('leafletMap',{center:[20,0],zoom:2,zoomControl:false,attributionControl:false});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:18}).addTo(leafletMap);
    L.control.zoom({position:'bottomright'}).addTo(leafletMap);

    const pinIcon = L.divIcon({
        className:'',
        html:`<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#38bdf8,#818cf8);transform:rotate(-45deg);border:3px solid white;box-shadow:0 4px 16px rgba(56,189,248,0.6);"></div>`,
        iconSize:[28,28], iconAnchor:[14,28]
    });

    leafletMap.on('click', async e => {
        const {lat,lng} = e.latlng;
        if (mapMarker) mapMarker.setLatLng([lat,lng]);
        else mapMarker = L.marker([lat,lng],{icon:pinIcon}).addTo(leafletMap);

        try {
            const r = await fetch(`${OWM_BASE}/weather?lat=${lat}&lon=${lng}&appid=${OWM_KEY}&units=metric`);
            const d = await r.json();
            if (r.ok) { showMapPopup(d); mapClickedData = d; }
            else showError('No weather for this location');
        } catch { showError('Network error'); }
    });
}

function showMapPopup(d) {
    document.getElementById('mapCity').textContent    = d.name || 'Unknown';
    document.getElementById('mapCountry').textContent = d.sys?.country || '';
    document.getElementById('mapTemp').textContent    = `${convertTemp(d.main.temp)}°${unitSym()}`;
    document.getElementById('mapDesc').textContent    = d.weather[0].description;
    document.getElementById('mapWind').textContent    = d.wind.speed;
    document.getElementById('mapHumidity').textContent = d.main.humidity;
    document.getElementById('mapIcon').src = `https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png`;
    document.getElementById('mapWeatherPopup').style.display = 'block';
}

document.getElementById('mapPopupClose').addEventListener('click', () => {
    document.getElementById('mapWeatherPopup').style.display = 'none';
});

document.getElementById('mapUseBtn').addEventListener('click', () => {
    if (mapClickedData) {
        renderCurrent(mapClickedData);
        fetchForecast(mapClickedData.name);
        saveLocation(mapClickedData.name);
        document.getElementById('mapWeatherPopup').style.display = 'none';
        switchHome();
    }
});

// ── Event Listeners ──────────────────────────────────────────
function triggerSearch() {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
    else showError('Please enter a city name');
}

cityInput.addEventListener('keypress', e => { if (e.key==='Enter') triggerSearch(); });
searchIconBtn.addEventListener('click', triggerSearch);

locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
            ()  => showError('Location permission denied')
        );
    } else showError('Geolocation not supported');
});

document.getElementById('unitSelect').addEventListener('change', e => {
    currentUnit = e.target.value;
    if (lastFetchedCity) fetchWeather(lastFetchedCity);
});

// ── Init ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const last = savedLocations[0] || 'London';
    fetchWeather(last);
});
