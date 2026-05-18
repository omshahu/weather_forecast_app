class Metrics:
    def __init__(self):
        self.metrics = {
            'active_requests': 0,
            'total_requests': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'total_response_time_ms': 0.0,
            'api_calls': {}
        }
        self.cache_hits = 0
        self.cache_misses = 0
        self.status_codes = {}

    def record_request(self, success, response_time_ms, status_code):
        self.metrics['total_requests'] += 1
        if success:
            self.metrics['successful_requests'] += 1
        else:
            self.metrics['failed_requests'] += 1
            
        self.metrics['total_response_time_ms'] += response_time_ms
        
        status_str = str(status_code)
        self.status_codes[status_str] = self.status_codes.get(status_str, 0) + 1

    def record_cache(self, hit):
        if hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1

    def record_api_call(self, endpoint):
        self.metrics['api_calls'][endpoint] = self.metrics['api_calls'].get(endpoint, 0) + 1

    def get_summary(self):
        avg_response_time = 0
        if self.metrics['total_requests'] > 0:
            avg_response_time = self.metrics['total_response_time_ms'] / self.metrics['total_requests']
            
        return {
            'active_requests': self.metrics['active_requests'],
            'total_requests': self.metrics['total_requests'],
            'success_rate': (self.metrics['successful_requests'] / self.metrics['total_requests']) if self.metrics['total_requests'] > 0 else 0,
            'avg_response_time_ms': avg_response_time,
            'status_codes': self.status_codes,
            'api_calls': self.metrics['api_calls']
        }

metrics = Metrics()
