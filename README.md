# 🌤️ WeatherSphere — Enterprise Weather App

A professional, mobile-first weather dashboard built with **Flask** (Python backend) and a premium dark-mode UI featuring real-time weather, 5-day forecasts, interactive maps, and beautiful data visualizations.

---

## ✨ Features

- 🌡️ **Live Weather** — Current temperature, feels-like, humidity, wind, pressure
- 📅 **5-Day Forecast** — Daily min/max temperature cards with weather icons
- 📊 **Temperature Chart** — Interactive Chart.js line graph for forecast data
- 🗺️ **Interactive Map** — Click anywhere on the Leaflet world map to get weather
- 📍 **GPS Location** — One-tap to get weather for your current location
- 🔖 **Saved Locations** — Auto-saves your recent searches (localStorage)
- 🌡️ **Unit Toggle** — Switch between Celsius and Fahrenheit in Settings
- 🎨 **Dynamic Theming** — Background color changes with temperature (hot/cold/normal)
- ⚡ **Caching** — API responses cached to avoid unnecessary requests
- 🛡️ **Rate Limiting** — IP-based request throttling

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- An [OpenWeatherMap API key](https://openweathermap.org/api) (free tier works)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/weather-enterprise-app.git
cd weather-enterprise-app

# 2. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up your API key
copy .env.example .env        # Windows
cp .env.example .env          # Mac/Linux
# Edit .env and add your OpenWeatherMap API key

# 5. Run the app
py -m app.app
```

Open your browser at **http://127.0.0.1:8080** 🎉

---

## 📁 Project Structure

```
weather-enterprise-app/
├── app/
│   ├── app.py            # Flask application & API routes
│   ├── config.py         # Configuration & environment variables
│   ├── cache_manager.py  # In-memory caching
│   ├── rate_limiter.py   # IP-based rate limiting
│   ├── metrics.py        # Request metrics tracking
│   ├── logger.py         # Structured logging
│   └── exceptions.py     # Custom exception classes
├── static/
│   ├── css/style.css     # Premium mobile-first UI styles
│   └── js/script.js      # Frontend logic (search, map, chart)
├── templates/
│   └── index.html        # Mobile app HTML structure
├── tests/                # Unit tests
├── .env.example          # Environment variable template
├── requirements.txt      # Python dependencies
└── run.bat               # Windows quick-start script
```

---

## 🔑 Environment Variables

Create a `.env` file based on `.env.example`:

| Variable | Description |
|---|---|
| `OPENWEATHER_API_KEY` | Your OpenWeatherMap API key |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| Weather API | OpenWeatherMap |
| Frontend | Vanilla HTML/CSS/JS |
| Map | Leaflet.js + CartoDB Dark tiles |
| Charts | Chart.js |
| Font | Google Fonts — Outfit |
| Icons | Font Awesome 6 |

---

## 📱 Mobile UI Preview

The app is designed as a **mobile-first** experience, rendered in a phone shell on desktop browsers.

---

## 📄 License

MIT License — feel free to use and modify!
