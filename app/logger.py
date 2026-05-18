import logging
from contextlib import ContextDecorator

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger('weather_app')

class LoggerContext(ContextDecorator):
    def __init__(self, logger_instance, **kwargs):
        self.logger = logger_instance
        self.kwargs = kwargs

    def __enter__(self):
        context_str = ", ".join(f"{k}={v}" for k, v in self.kwargs.items())
        self.logger.info(f"Starting context: [{context_str}]")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        context_str = ", ".join(f"{k}={v}" for k, v in self.kwargs.items())
        if exc_type:
            self.logger.error(f"Error in context: [{context_str}] - {exc_val}")
        else:
            self.logger.info(f"Finished context: [{context_str}]")
        return False
