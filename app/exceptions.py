class APIError(Exception):
    """Exception raised for general API errors."""
    pass

class ValidationError(Exception):
    """Exception raised for validation errors (e.g., bad user input)."""
    pass

class NetworkError(Exception):
    """Exception raised for network-related errors when reaching external services."""
    pass
