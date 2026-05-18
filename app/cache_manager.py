import time
from functools import wraps
from flask import request

class SimpleCache:
    def __init__(self):
        self.cache = {}
        self.hits = 0
        self.misses = 0

    def get(self, key):
        if key in self.cache:
            data, expiry = self.cache[key]
            if time.time() < expiry:
                self.hits += 1
                return data
            else:
                del self.cache[key]
        self.misses += 1
        return None

    def set(self, key, data, timeout=300):
        self.cache[key] = (data, time.time() + timeout)

    def get_stats(self):
        return {
            'hits': self.hits,
            'misses': self.misses,
            'size': len(self.cache)
        }

weather_cache = SimpleCache()
