const API_BASE = '/api';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchIconBtn = document.getElementById('searchIconBtn');
const headerCity = document.getElementById('headerCity');
const locationBtn = document.getElementById('locationBtn');

const mainTemp = document.getElementById('mainTemp');
const mainDesc = document.getElementById('mainDesc');
const feelsLike = document.getElementById('feelsLike');
const mainIcon = document.getElementById('mainIcon');

const windVal = document.getElementById('windVal');
const humidityVal = document.getElementById('humidityVal');
const pressureVal = document.getElementById('pressureVal');

const forecastSection = document.getElementById('forecastSection');
const forecastContainer = document.getElementById('forecastContainer');

const errorMessage = document.getElementById('errorMessage');
const loadingOverlay = document.getElementById('loadingOverlay');

const savedListContainer = document.getElementById('savedList');

// Global state
let isLoading = false;
let currentUnit = 'metric';
let savedLocations = JSON.parse(localStorage.getItem('savedLocations') || '["London", "New York", "Tokyo"]');
let lastFetchedCity = '';
let forecastChartInstance = null; // Store chart instance to destroy later

// --- TAB SWITCHING LOGIC ---
const navItems = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');

let leafletMap = null;
let mapMarker = null;
let mapClickedData = null;

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        tabViews.forEach(v => v.style.display = 'none');

        item.classList.add('active');
        const targetViewId = item.getAttribute('data-tab');
        document.getElementById(targetViewId).style.display =
            targetViewId === 'mapView' ? 'flex' : 'block';

        if (targetViewId === 'savedView') renderSavedLocations();
        if (targetViewId === 'mapView') initMap();
    });
});

function switchToHomeTab() {
    navItems.forEach(n => n.classList.remove('active'));
    tabViews.forEach(v => v.style.display = 'none');
    document.querySelector('.nav-item[data-tab="homeView"]').classList.add('active');
    document.getElementById('homeView').style.display = 'block';
}

// --- LOADING & ERROR UI ---
function showLoading() {
    isLoading = true;
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    isLoading = false;
    loadingOverlay.classList.remove('active');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000);
}

// --- WEATHER API LOGIC ---
async function fetchWeather(city) {
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/weather?city=${encodeURIComponent(city)}`);
        const data = await res.json();
        
        if (res.ok) {
            lastFetchedCity = data.city;
            updateUI(data);
            fetchForecast(data.city);
            saveLocation(data.city);
            switchToHomeTab(); // Ensure we are on home tab when data loads
        } else {
            showError(data.error || 'Failed to fetch weather');
        }
    } catch (err) {
        showError('Network error');
    } finally {
        hideLoading();
    }
}

async function fetchForecast(city) {
    try {
        const res = await fetch(`${API_BASE}/weather/forecast?city=${encodeURIComponent(city)}`);
        const data = await res.json();
        
        if (res.ok && data.forecast) {
            updateForecastUI(data.forecast);     // Hourly slider + chart (first day items)
            renderDailyForecast(data.forecast);  // Daily 5-day cards
        }
    } catch (err) {
        console.error('Forecast error:', err);
    }
}

async function fetchByLocation(lat, lon) {
    showLoading();
    try {
        const res = await fetch(`${API_BASE}/weather/coordinates?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        
        if (res.ok) {
            lastFetchedCity = data.city;
            updateUI(data);
            fetchForecast(data.city);
            saveLocation(data.city);
            switchToHomeTab();
        } else {
            showError(data.error || 'Location error');
        }
    } catch (err) {
        showError('Network error');
    } finally {
        hideLoading();
    }
}

// --- UI UPDATERS ---
function convertTemp(temp) {
    if (currentUnit === 'imperial') {
        return Math.round((temp * 9/5) + 32);
    }
    return Math.round(temp);
}

function getUnitSymbol() {
    return currentUnit === 'imperial' ? 'F' : 'C';
}

function updateUI(data) {
    headerCity.textContent = data.city;
    cityInput.value = '';
    cityInput.placeholder = data.city;

    const temp = convertTemp(data.temperature);
    const feelsLikeTemp = convertTemp(data.feels_like);

    mainTemp.textContent = `${temp}°${getUnitSymbol()}`;
    mainDesc.textContent = data.description;
    feelsLike.textContent = `Feels like ${feelsLikeTemp}°${getUnitSymbol()}`;

    // Convert wind speed to mph if imperial
    let windDisplay = data.wind_speed;
    let windUnit = 'm/s';
    if (currentUnit === 'imperial') {
        windDisplay = (data.wind_speed * 2.237).toFixed(1); // m/s to mph
        windUnit = 'mph';
    }
    document.querySelector('#windVal + .metric-label').textContent = `Wind (${windUnit})`;
    windVal.textContent = windDisplay;

    humidityVal.textContent = data.humidity;
    pressureVal.textContent = data.pressure;

    // OpenWeather map icon
    if (data.icon) {
        mainIcon.src = `https://openweathermap.org/img/wn/${data.icon}@4x.png`;
        mainIcon.style.display = 'block';
    }

    // Dynamic background — premium deep-space gradients based on temperature
    const container = document.querySelector('.mobile-container');
    if (data.temperature > 30) {
        // Scorching hot — deep amber to dark
        container.style.background = 'linear-gradient(160deg, #3d1a00 0%, #1a0900 50%, #020817 100%)';
        container.style.setProperty('--accent', '#fb923c');
    } else if (data.temperature > 20) {
        // Warm — teal-blue sunset
        container.style.background = 'linear-gradient(160deg, #0d2e3c 0%, #071624 50%, #020817 100%)';
        container.style.setProperty('--accent', '#38bdf8');
    } else if (data.temperature < 5) {
        // Freezing — deep indigo ice
        container.style.background = 'linear-gradient(160deg, #0f0c2e 0%, #07091c 50%, #020817 100%)';
        container.style.setProperty('--accent', '#818cf8');
    } else {
        // Default cool blue
        container.style.background = 'linear-gradient(160deg, #0d1f3c 0%, #080e1e 50%, #020817 100%)';
        container.style.setProperty('--accent', '#38bdf8');
    }
}

function updateForecastUI(forecastList) {
    forecastSection.style.display = 'block';
    forecastContainer.innerHTML = '';

    const labels = [];
    const tempData = [];

    forecastList.forEach(item => {
        const date = new Date(item.date);
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        const temp = convertTemp(item.temp);
        
        labels.push(timeStr);
        tempData.push(temp);

        const card = document.createElement('div');
        card.className = 'forecast-item';
        card.innerHTML = `
            <span class="f-time">${timeStr}</span>
            <img class="f-icon" src="https://openweathermap.org/img/wn/${item.icon}.png" alt="icon">
            <span class="f-temp">${temp}°</span>
        `;
        forecastContainer.appendChild(card);
    });

    renderForecastChart(labels, tempData);
}

function renderDailyForecast(forecastList) {
    const dailySection = document.getElementById('dailySection');
    const dailyContainer = document.getElementById('dailyContainer');
    if (!dailySection || !dailyContainer) return;

    dailySection.style.display = 'block';
    dailyContainer.innerHTML = '';

    const today = new Date().toISOString().slice(0, 10);

    forecastList.forEach(item => {
        const date = new Date(item.date + 'T12:00:00');
        const isToday = item.date === today;
        const isTomorrow = (() => {
            const t = new Date(); t.setDate(t.getDate() + 1);
            return item.date === t.toISOString().slice(0, 10);
        })();

        const dayLabel = isToday ? 'Today' :
                         isTomorrow ? 'Tomorrow' :
                         date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        const maxTemp = convertTemp(item.temp_max !== undefined ? item.temp_max : item.temp);
        const minTemp = convertTemp(item.temp_min !== undefined ? item.temp_min : item.temp - 3);
        const humidity = item.humidity !== undefined ? item.humidity : '--';
        const unit = getUnitSymbol();

        const card = document.createElement('div');
        card.className = 'daily-card';
        card.innerHTML = `
            <span class="day-name ${isToday ? 'today-label' : ''}">${dayLabel}</span>
            <img class="day-icon" src="https://openweathermap.org/img/wn/${item.icon}.png" alt="${item.description}">
            <span class="day-desc">${item.description}</span>
            <span class="day-humidity"><i class="fas fa-droplet"></i> ${humidity}%</span>
            <span class="day-temps">
                <span class="day-max">${maxTemp}°</span>
                <span class="day-min">${minTemp}°</span>
            </span>
        `;
        dailyContainer.appendChild(card);
    });
}

function renderForecastChart(labels, tempData) {
    const ctx = document.getElementById('forecastChart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (forecastChartInstance) {
        forecastChartInstance.destroy();
    }

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `Temperature (${getUnitSymbol()})`,
                data: tempData,
                borderColor: '#3b82f6', // var(--accent)
                backgroundColor: 'rgba(59, 130, 246, 0.2)', // glow
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide legend to save space
                },
                tooltip: {
                    backgroundColor: 'rgba(32, 43, 59, 0.9)',
                    titleColor: '#9ca3af',
                    bodyColor: '#ffffff',
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '°' + getUnitSymbol();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxTicksLimit: 5 // Avoid clutter
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#9ca3af',
                        stepSize: 2,
                        callback: function(value) {
                            return value + '°';
                        }
                    }
                }
            }
        }
    });
}

// --- SAVED LOCATIONS LOGIC ---
function saveLocation(city) {
    if (!city) return;
    // Remove if exists
    savedLocations = savedLocations.filter(c => c.toLowerCase() !== city.toLowerCase());
    // Add to top
    savedLocations.unshift(city);
    // Keep max 10
    savedLocations = savedLocations.slice(0, 10);
    localStorage.setItem('savedLocations', JSON.stringify(savedLocations));
}

function renderSavedLocations() {
    if (savedLocations.length === 0) {
        savedListContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No saved locations yet.</p>';
        return;
    }

    savedListContainer.innerHTML = savedLocations.map(city => `
        <div class="saved-item" onclick="fetchWeather('${city}')" style="background: var(--card-bg); padding: 15px 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: 0.2s;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <i class="fas fa-location-dot" style="color: var(--accent);"></i>
                <span style="color: white; font-weight: 500; font-size: 1.1rem;">${city}</span>
            </div>
            <i class="fas fa-chevron-right" style="color: var(--text-secondary); font-size: 0.8rem;"></i>
        </div>
    `).join('');
}

// --- EVENT LISTENERS ---
function triggerSearch() {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
}

// Listen to Enter key
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') triggerSearch();
});

// Listen to Search Icon click
searchIconBtn.addEventListener('click', triggerSearch);

// Listen to Location button
locationBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => fetchByLocation(pos.coords.latitude, pos.coords.longitude),
            () => showError('Location permission denied')
        );
    } else {
        showError('Geolocation not supported');
    }
});

// Listen to Unit switch in Settings tab
document.getElementById('unitSelect').addEventListener('change', (e) => {
    currentUnit = e.target.value;
    // Re-fetch weather for current city to update UI with new units immediately
    if (lastFetchedCity) {
        fetchWeather(lastFetchedCity);
    }
});

// ─── MAP LOGIC ──────────────────────────────────────────────────────────────

function initMap() {
    // Only init once
    if (leafletMap) {
        setTimeout(() => leafletMap.invalidateSize(), 100);
        return;
    }

    leafletMap = L.map('leafletMap', {
        center: [20, 0],
        zoom: 2,
        zoomControl: false,
        attributionControl: false
    });

    // Dark tile layer (CartoDB dark)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18
    }).addTo(leafletMap);

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

    // Custom marker icon
    const pinIcon = L.divIcon({
        className: '',
        html: `<div style="
            width:32px; height:32px; border-radius:50% 50% 50% 0;
            background: linear-gradient(135deg,#38bdf8,#818cf8);
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 16px rgba(56,189,248,0.6);
        "></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    // Map click → fetch weather
    leafletMap.on('click', async (e) => {
        const { lat, lng } = e.latlng;

        // Place / move marker
        if (mapMarker) {
            mapMarker.setLatLng([lat, lng]);
        } else {
            mapMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(leafletMap);
        }

        // Fetch weather for clicked coordinates
        try {
            const res = await fetch(`/api/weather/coordinates?lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (res.ok) {
                showMapPopup(data);
                mapClickedData = data;
            } else {
                showError(data.error || 'No weather data for this location');
            }
        } catch {
            showError('Network error');
        }
    });
}

function showMapPopup(data) {
    const popup = document.getElementById('mapWeatherPopup');
    document.getElementById('mapCity').textContent = data.city || 'Unknown';
    document.getElementById('mapCountry').textContent = data.country || '';
    document.getElementById('mapTemp').textContent = `${convertTemp(data.temperature)}°${getUnitSymbol()}`;
    document.getElementById('mapDesc').textContent = data.description || '';
    document.getElementById('mapWind').textContent = data.wind_speed || '--';
    document.getElementById('mapHumidity').textContent = data.humidity || '--';
    if (data.icon) {
        document.getElementById('mapIcon').src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
    }
    popup.style.display = 'block';
}

// Close map popup
document.getElementById('mapPopupClose').addEventListener('click', () => {
    document.getElementById('mapWeatherPopup').style.display = 'none';
});

// "Use This Location" — switch to home and load weather
document.getElementById('mapUseBtn').addEventListener('click', () => {
    if (mapClickedData) {
        updateUI(mapClickedData);
        fetchForecast(mapClickedData.city);
        saveLocation(mapClickedData.city);
        // Switch to home tab
        document.getElementById('mapWeatherPopup').style.display = 'none';
        navItems.forEach(n => n.classList.remove('active'));
        tabViews.forEach(v => v.style.display = 'none');
        document.querySelector('.nav-item[data-tab="homeView"]').classList.add('active');
        document.getElementById('homeView').style.display = 'block';
    }
});

// ─── INIT ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    if (savedLocations.length > 0) {
        fetchWeather(savedLocations[0]);
    } else {
        fetchWeather('London');
    }
});
