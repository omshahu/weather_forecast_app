import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
    WEATHER_API_URL = os.getenv('WEATHER_API_URL', 'http://api.openweathermap.org/data/2.5/weather')
    FORECAST_API_URL = os.getenv('FORECAST_API_URL', 'http://api.openweathermap.org/data/2.5/forecast')
    
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')
    RATE_LIMIT_ENABLED = os.getenv('RATE_LIMIT_ENABLED', 'True').lower() in ('true', '1', 't')
    CACHE_ENABLED = os.getenv('CACHE_ENABLED', 'True').lower() in ('true', '1', 't')
    
    CACHE_TTL_SECONDS = int(os.getenv('CACHE_TTL_SECONDS', '300'))
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))
    REQUEST_TIMEOUT_SECONDS = int(os.getenv('REQUEST_TIMEOUT_SECONDS', '5'))
    RETRY_BACKOFF_FACTOR = float(os.getenv('RETRY_BACKOFF_FACTOR', '0.5'))
    
    HOST = os.getenv('HOST', '127.0.0.1')
    PORT = int(os.getenv('PORT', '8080'))

    def validate(self):
        if not self.OPENWEATHER_API_KEY:
            print("ERROR: OPENWEATHER_API_KEY is not set in environment or .env file.")
            return False
        return True
        
    def display(self):
        print("--- Configuration ---")
        print(f"DEBUG: {self.DEBUG}")
        print(f"RATE_LIMIT_ENABLED: {self.RATE_LIMIT_ENABLED}")
        print(f"CACHE_ENABLED: {self.CACHE_ENABLED}")
        print(f"HOST: {self.HOST}")
        print(f"PORT: {self.PORT}")
        print("---------------------")

# Export a single instance to be imported by app.py
config = Config()
