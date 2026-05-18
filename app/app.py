#!/usr/bin/env python3
"""
Weather Forecast Web Application - ENTERPRISE EDITION
Production-ready Flask application with caching, rate limiting, and monitoring
"""

from flask import Flask, render_template, request, jsonify, g
import requests
import time
from functools import wraps
from contextlib import contextmanager
import hashlib
from typing import Tuple, Dict, Any

import sys
import os

# Ensure the root project directory is in sys.path so 'app.config' can be found
# regardless of how the script is executed.
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import custom modules
from app.config import config
from app.cache_manager import weather_cache
from app.rate_limiter import rate_limiter
from app.logger import logger, LoggerContext
from app.metrics import metrics
from app.exceptions import APIError, ValidationError, NetworkError

# -----------------------------------------------------------------------------
# FLASK APPLICATION INITIALIZATION
# -----------------------------------------------------------------------------
app = Flask(
    __name__,
    template_folder=os.path.join(parent_dir, 'templates'),
    static_folder=os.path.join(parent_dir, 'static')
)
app.config['SECRET_KEY'] = config.SECRET_KEY
app.config['DEBUG'] = config.DEBUG

# -----------------------------------------------------------------------------
# MIDDLEWARE & DECORATORS
# -----------------------------------------------------------------------------

@contextmanager
def timer(operation: str):
    """Context manager for timing operations"""
    start = time.perf_counter()
    yield
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.debug(f"{operation} completed in {elapsed_ms:.2f}ms")
    return elapsed_ms


def rate_limit_middleware(f):
    """Decorator for rate limiting"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not config.RATE_LIMIT_ENABLED:
            return f(*args, **kwargs)
        
        # Get client IP
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        
        # Check rate limit
        allowed, stats = rate_limiter.is_allowed(client_ip)
        
        if not allowed:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return jsonify({
                'error': 'Rate limit exceeded',
                'retry_after': stats['reset_in_seconds'],
                'message': f'Too many requests. Limit: {stats["limit"]} requests per minute'
            }), 429
        
        # Add rate limit headers to response
        response = f(*args, **kwargs)
        
        # If response is a tuple (response, status_code), handle accordingly
        if isinstance(response, tuple):
            resp_obj, status_code = response
            if isinstance(resp_obj, dict):
                resp_obj['rate_limit'] = {
                    'remaining': stats['remaining'],
                    'limit': stats['limit'],
                    'reset_in': stats['reset_in_seconds']
                }
                return jsonify(resp_obj), status_code
        
        return response
    return decorated_function


def cache_response(ttl_seconds: int = 300):
    """Decorator for caching API responses"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not config.CACHE_ENABLED:
                return f(*args, **kwargs)
            
            # Generate cache key from request
            cache_key = hashlib.md5(
                f"{request.path}{request.query_string}".encode()
            ).hexdigest()
            
            # Try to get from cache
            cached_response = weather_cache.get(cache_key)
            if cached_response:
                metrics.record_cache(hit=True)
                logger.debug(f"Cache HIT for key: {cache_key[:8]}")
                # Add cached flag to response
                if isinstance(cached_response, dict):
                    cached_response['cached'] = True
                return jsonify(cached_response), 200
            
            metrics.record_cache(hit=False)
            
            # Execute function
            result = f(*args, **kwargs)
            
            # Store in cache if successful
            if isinstance(result, tuple):
                data, status = result
                if status == 200:
                    weather_cache.set(cache_key, data)
            
            return result
        return decorated_function
    return decorator


@app.before_request
def before_request():
    """Pre-request logging and metrics"""
    metrics.metrics['active_requests'] += 1
    g.start_time = time.perf_counter()
    logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")


@app.after_request
def after_request(response):
    """Post-request logging and metrics"""
    elapsed_ms = (time.perf_counter() - g.start_time) * 1000
    metrics.record_request(
        success=response.status_code < 400,
        response_time_ms=elapsed_ms,
        status_code=response.status_code
    )
    metrics.metrics['active_requests'] -= 1
    
    logger.info(
        f"Response: {response.status_code} | {elapsed_ms:.2f}ms | "
        f"Size: {response.content_length or 0} bytes"
    )
    
    # Add performance headers
    response.headers['X-Response-Time-MS'] = int(elapsed_ms)
    response.headers['X-API-Version'] = '2.0.0'
    
    return response

# -----------------------------------------------------------------------------
# HEALTH CHECK ENDPOINTS (Enterprise Monitoring)
# -----------------------------------------------------------------------------

@app.route('/health')
def health_check():
    """Basic health check endpoint for orchestration"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '2.0.0',
        'service': 'weather-forecast-app'
    }), 200


@app.route('/metrics')
def get_metrics():
    """Detailed metrics endpoint for monitoring"""
    cache_stats = weather_cache.get_stats()
    rate_stats = {
        'global': {
            'max_requests': rate_limiter.max_requests,
            'window_seconds': rate_limiter.window_seconds,
            'enabled': config.RATE_LIMIT_ENABLED
        }
    }
    
    return jsonify({
        'application': metrics.get_summary(),
        'cache': cache_stats,
        'rate_limiting': rate_stats,
        'config': {
            'debug': config.DEBUG,
            'cache_enabled': config.CACHE_ENABLED,
            'rate_limiting_enabled': config.RATE_LIMIT_ENABLED
        }
    }), 200

# -----------------------------------------------------------------------------
# WEATHER API ENDPOINTS (Enhanced)
# -----------------------------------------------------------------------------

@app.route('/')
def index():
    """Serve main application page"""
    return render_template('index.html')


@app.route('/api/weather')
@rate_limit_middleware
@cache_response(ttl_seconds=config.CACHE_TTL_SECONDS)
def get_weather() -> Tuple[Dict, int]:
    """
    Enhanced weather endpoint with retry logic and validation
    Query: ?city=London
    """
    city = request.args.get('city', '').strip()
    
    # Input validation
    if not city:
        logger.warning("Weather request with empty city")
        return {'error': 'City name is required'}, 400
    
    if len(city) > 100:
        logger.warning(f"City name too long: {len(city)} characters")
        return {'error': 'City name too long (max 100 characters)'}, 400
    
    # Build API request
    params = {
        'q': city,
        'appid': config.OPENWEATHER_API_KEY,
        'units': 'metric'
    }
    
    # Retry logic
    for attempt in range(config.MAX_RETRIES):
        try:
            metrics.record_api_call('weather')
            with LoggerContext(logger, city=city, attempt=attempt + 1):
                logger.info(f"Fetching weather for city: {city}")
                
                response = requests.get(
                    config.WEATHER_API_URL,
                    params=params,
                    timeout=config.REQUEST_TIMEOUT_SECONDS
                )
                data = response.json()
                
                # Success handling
                if response.status_code == 200:
                    weather_data = {
                        'city': data.get('name'),
                        'country': data.get('sys', {}).get('country'),
                        'temperature': round(data.get('main', {}).get('temp', 0)),
                        'feels_like': round(data.get('main', {}).get('feels_like', 0)),
                        'humidity': data.get('main', {}).get('humidity'),
                        'wind_speed': data.get('wind', {}).get('speed'),
                        'pressure': data.get('main', {}).get('pressure'),
                        'description': data.get('weather', [{}])[0].get('description', '').title(),
                        'icon': data.get('weather', [{}])[0].get('icon', '01d'),
                        'weather_main': data.get('weather', [{}])[0].get('main', 'Clear'),
                        'cached': False
                    }
                    logger.info(f"Successfully fetched weather for {city}")
                    return weather_data, 200
                
                # Error handling by status code
                elif response.status_code == 404:
                    logger.warning(f"City not found: {city}")
                    return {'error': f"City '{city}' not found. Please check spelling."}, 404
                
                elif response.status_code == 401:
                    logger.error("Invalid API key - please check configuration")
                    return {'error': 'API configuration error. Please contact support.'}, 500
                
                elif response.status_code == 429:
                    logger.warning("Rate limit exceeded on external API")
                    if attempt == config.MAX_RETRIES - 1:
                        return {'error': 'Weather service is busy. Please try again in a moment.'}, 429
                    time.sleep(config.RETRY_BACKOFF_FACTOR * (2 ** attempt))
                    continue
                
                else:
                    logger.error(f"Unexpected status code: {response.status_code}")
                    return {'error': f'Service error: HTTP {response.status_code}'}, response.status_code
                    
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error for city {city}: {str(e)}")
            if attempt == config.MAX_RETRIES - 1:
                return {'error': 'Network error. Please check your internet connection.'}, 503
            time.sleep(config.RETRY_BACKOFF_FACTOR * (2 ** attempt))
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout error for city {city}: {str(e)}")
            if attempt == config.MAX_RETRIES - 1:
                return {'error': 'Request timeout. The service is slow to respond. Please try again.'}, 504
            
        except Exception as e:
            logger.exception(f"Unexpected error: {str(e)}")
            return {'error': 'Internal server error. Please try again later.'}, 500
    
    return {'error': 'Max retries exceeded. Please try again later.'}, 500


@app.route('/api/weather/forecast')
@rate_limit_middleware
@cache_response(ttl_seconds=600)
def get_forecast() -> Tuple[Dict, int]:
    """
    5-day weather forecast endpoint
    Query: ?city=London
    """
    city = request.args.get('city', '').strip()
    
    if not city:
        return {'error': 'City name is required'}, 400
    
    params = {
        'q': city,
        'appid': config.OPENWEATHER_API_KEY,
        'units': 'metric',
        'cnt': 40
    }
    
    try:
        response = requests.get(
            config.FORECAST_API_URL,
            params=params,
            timeout=config.REQUEST_TIMEOUT_SECONDS
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Group by day and compute daily summary
            from collections import defaultdict
            daily = defaultdict(lambda: {
                'temps': [], 'humidity': [], 'wind': [],
                'icons': [], 'descriptions': []
            })
            
            for item in data['list']:
                day_key = item['dt_txt'][:10]  # YYYY-MM-DD
                daily[day_key]['temps'].append(round(item['main']['temp']))
                daily[day_key]['humidity'].append(item['main']['humidity'])
                daily[day_key]['wind'].append(item['wind']['speed'])
                daily[day_key]['icons'].append(item['weather'][0]['icon'])
                daily[day_key]['descriptions'].append(
                    item['weather'][0]['description'].title()
                )
            
            forecast_data = []
            for day_key in sorted(daily.keys()):
                d = daily[day_key]
                # Pick the most common icon/description for the day
                from collections import Counter
                common_icon = Counter(d['icons']).most_common(1)[0][0]
                common_desc = Counter(d['descriptions']).most_common(1)[0][0]
                forecast_data.append({
                    'date': day_key,
                    'temp_max': max(d['temps']),
                    'temp_min': min(d['temps']),
                    'temp': round(sum(d['temps']) / len(d['temps'])),
                    'humidity': round(sum(d['humidity']) / len(d['humidity'])),
                    'wind_speed': round(sum(d['wind']) / len(d['wind']), 1),
                    'description': common_desc,
                    'icon': common_icon
                })
            
            return {
                'city': data['city']['name'],
                'country': data['city']['country'],
                'forecast': forecast_data[:6]  # Today + 5 future days
            }, 200
        else:
            return {'error': f'Unable to fetch forecast for {city}'}, response.status_code
            
    except Exception as e:
        logger.exception(f"Forecast error: {str(e)}")
        return {'error': 'Unable to fetch forecast data'}, 500


@app.route('/api/weather/coordinates')
@rate_limit_middleware
@cache_response(ttl_seconds=config.CACHE_TTL_SECONDS)
def get_weather_by_coords() -> Tuple[Dict, int]:
    """Get weather by geographic coordinates"""
    lat = request.args.get('lat', '')
    lon = request.args.get('lon', '')
    
    if not lat or not lon:
        return {'error': 'Latitude and longitude are required'}, 400
    
    try:
        # Validate coordinates
        lat_val = float(lat)
        lon_val = float(lon)
        if not (-90 <= lat_val <= 90):
            return {'error': 'Invalid latitude. Must be between -90 and 90'}, 400
        if not (-180 <= lon_val <= 180):
            return {'error': 'Invalid longitude. Must be between -180 and 180'}, 400
    except ValueError:
        return {'error': 'Invalid coordinates format'}, 400
    
    params = {
        'lat': lat,
        'lon': lon,
        'appid': config.OPENWEATHER_API_KEY,
        'units': 'metric'
    }
    
    try:
        response = requests.get(
            config.WEATHER_API_URL,
            params=params,
            timeout=config.REQUEST_TIMEOUT_SECONDS
        )
        
        if response.status_code == 200:
            data = response.json()
            weather_data = {
                'city': data.get('name'),
                'country': data.get('sys', {}).get('country'),
                'temperature': round(data.get('main', {}).get('temp', 0)),
                'feels_like': round(data.get('main', {}).get('feels_like', 0)),
                'humidity': data.get('main', {}).get('humidity'),
                'wind_speed': data.get('wind', {}).get('speed'),
                'pressure': data.get('main', {}).get('pressure'),
                'description': data.get('weather', [{}])[0].get('description', '').title(),
                'icon': data.get('weather', [{}])[0].get('icon', '01d'),
                'weather_main': data.get('weather', [{}])[0].get('main', 'Clear'),
                'cached': False
            }
            return weather_data, 200
        else:
            return {'error': 'Unable to fetch weather for this location'}, response.status_code
            
    except Exception as e:
        logger.exception(f"Coordinates error: {str(e)}")
        return {'error': 'Unable to fetch weather data'}, 500

# -----------------------------------------------------------------------------
# ERROR HANDLERS
# -----------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {request.path}")
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.exception("Internal server error")
    return jsonify({'error': 'Internal server error'}), 500


@app.errorhandler(429)
def rate_limit_error(error):
    return jsonify({'error': 'Rate limit exceeded. Please slow down your requests.'}), 429

# -----------------------------------------------------------------------------
# MAIN ENTRY POINT
# -----------------------------------------------------------------------------

if __name__ == '__main__':
    # Validate configuration
    if not config.validate():
        exit(1)
    
    # Display configuration
    config.display()
    
    # Start server
    print("\n" + "*"*70)
    print("  WEATHER FORECAST APPLICATION - ENTERPRISE EDITION  ")
    print("*"*70)
    print(f"\n✓ Server running at: http://{config.HOST}:{config.PORT}")
    print(f"✓ Health check: http://{config.HOST}:{config.PORT}/health")
    print(f"✓ Metrics: http://{config.HOST}:{config.PORT}/metrics")
    print("\n📊 API Endpoints:")
    print(f"   GET /api/weather?city=London")
    print(f"   GET /api/weather/forecast?city=London")
    print(f"   GET /api/weather/coordinates?lat=51.5074&lon=-0.1278")
    print("\nPress CTRL+C to stop the server\n")
    
    app.run(
        host=config.HOST,
        port=config.PORT,
        debug=config.DEBUG,
        threaded=True
    )