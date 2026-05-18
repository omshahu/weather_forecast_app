import time

class RateLimiter:
    def __init__(self, max_requests=100, window_seconds=60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients = {}

    def is_allowed(self, client_ip):
        current_time = time.time()
        
        # Clean up old requests for this IP
        if client_ip in self.clients:
            self.clients[client_ip] = [
                req_time for req_time in self.clients[client_ip]
                if current_time - req_time < self.window_seconds
            ]
        else:
            self.clients[client_ip] = []

        # Check if allowed
        history = self.clients[client_ip]
        allowed = len(history) < self.max_requests
        
        if allowed:
            self.clients[client_ip].append(current_time)
            remaining = self.max_requests - len(self.clients[client_ip])
        else:
            remaining = 0

        # Calculate reset time (oldest request + window)
        if self.clients[client_ip]:
            reset_in = max(0, int(self.clients[client_ip][0] + self.window_seconds - current_time))
        else:
            reset_in = 0

        stats = {
            'limit': self.max_requests,
            'remaining': remaining,
            'reset_in_seconds': reset_in
        }

        return allowed, stats

rate_limiter = RateLimiter()
