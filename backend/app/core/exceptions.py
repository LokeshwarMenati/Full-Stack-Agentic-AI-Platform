from typing import Any, Dict, Optional


class NexusException(Exception):
    def __init__(self, message: str, status_code: int = 500, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(NexusException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, details=details)


class ConflictError(NexusException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=409, details=details)


class ValidationError(NexusException):
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, details=details)


class SlotUnavailableError(ConflictError):
    def __init__(self, message: str = "The selected slot is already booked or unavailable.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details=details)


class DoubleBookingError(ConflictError):
    def __init__(self, message: str = "A booking with this reference or slot already exists.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details=details)


class ProviderUnavailableError(NexusException):
    def __init__(self, message: str = "Configured LLM or embedding provider is currently unreachable.", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=503, details=details)
