"""Unit tests for cache manager"""

import pytest
import time
from app.cache_manager import CacheManager


def test_cache_set_and_get():
    """Test basic cache operations"""
    cache = CacheManager(max_size=10, ttl_seconds=5)
    cache.set("test_key", "test_value")
    assert cache.get("test_key") == "test_value"


def test_cache_expiration():
    """Test cache TTL expiration"""
    cache = CacheManager(max_size=10, ttl_seconds=1)
    cache.set("test_key", "test_value")
    time.sleep(1.1)
    assert cache.get("test_key") is None


def test_cache_max_size():
    """Test cache size limit"""
    cache = CacheManager(max_size=2, ttl_seconds=10)
    cache.set("key1", "value1")
    cache.set("key2", "value2")
    cache.set("key3", "value3")
    assert cache.get("key1") is None
    assert cache.get("key2") == "value2"
    assert cache.get("key3") == "value3"


def test_cache_stats():
    """Test cache statistics"""
    cache = CacheManager(max_size=10, ttl_seconds=5)
    cache.set("key1", "value1")
    cache.get("key1")  # Hit
    cache.get("key2")  # Miss
    
    stats = cache.get_stats()
    assert stats['hits'] == 1
    assert stats['misses'] == 1