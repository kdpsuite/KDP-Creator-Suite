# API Response Standardization

**Problem:** Inconsistent API response formats make frontend error handling unpredictable and increase debugging time.

**Solution:** Standardize all API responses to a consistent JSON structure with clear status indicators, error messages, and metadata.

---

## Standard Response Format

### Success Response

```json
{
  "ok": true,
  "status": 200,
  "message": "Operation completed successfully",
  "data": {
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com"
  },
  "meta": {
    "timestamp": "2026-06-19T12:34:56.789Z",
    "request_id": "req_abc123def456",
    "version": "1.0"
  }
}
```

### Error Response

```json
{
  "ok": false,
  "status": 400,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  },
  "meta": {
    "timestamp": "2026-06-19T12:34:56.789Z",
    "request_id": "req_abc123def456",
    "version": "1.0"
  }
}
```

### Paginated Response

```json
{
  "ok": true,
  "status": 200,
  "message": "Users retrieved successfully",
  "data": [
    { "id": "1", "email": "user1@example.com" },
    { "id": "2", "email": "user2@example.com" }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 42,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "meta": {
    "timestamp": "2026-06-19T12:34:56.789Z",
    "request_id": "req_abc123def456",
    "version": "1.0"
  }
}
```

---

## Response Field Definitions

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `ok` | boolean | Yes | `true` for success, `false` for error |
| `status` | integer | Yes | HTTP status code (200, 400, 401, 404, 500, etc.) |
| `message` | string | Yes | Human-readable message |
| `data` | object/array | Conditional | Response payload (omitted for errors) |
| `error` | object | Conditional | Error details (only for errors) |
| `error.code` | string | Conditional | Machine-readable error code |
| `error.details` | object | Conditional | Field-level error details |
| `pagination` | object | Conditional | Pagination info (only for list endpoints) |
| `meta` | object | Yes | Metadata about the response |
| `meta.timestamp` | string | Yes | ISO 8601 timestamp |
| `meta.request_id` | string | Yes | Unique request identifier for tracing |
| `meta.version` | string | Yes | API version |

---

## HTTP Status Codes

| Code | Meaning | Use Case |
| :--- | :--- | :--- |
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation error, malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists (duplicate) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Service temporarily unavailable |

---

## Error Codes

### Authentication Errors

| Code | Message | HTTP Status |
| :--- | :--- | :--- |
| `AUTH_MISSING` | Missing authentication token | 401 |
| `AUTH_INVALID` | Invalid or expired token | 401 |
| `AUTH_EXPIRED` | Token has expired | 401 |
| `AUTH_INSUFFICIENT_SCOPE` | Token lacks required scope | 403 |

### Validation Errors

| Code | Message | HTTP Status |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `INVALID_EMAIL` | Email format is invalid | 400 |
| `INVALID_PASSWORD` | Password does not meet requirements | 400 |
| `INVALID_JSON` | Request body is not valid JSON | 400 |

### Resource Errors

| Code | Message | HTTP Status |
| :--- | :--- | :--- |
| `NOT_FOUND` | Resource not found | 404 |
| `ALREADY_EXISTS` | Resource already exists | 409 |
| `DELETED` | Resource has been deleted | 410 |

### Rate Limiting

| Code | Message | HTTP Status |
| :--- | :--- | :--- |
| `RATE_LIMITED` | Too many requests | 429 |

### Server Errors

| Code | Message | HTTP Status |
| :--- | :--- | :--- |
| `INTERNAL_ERROR` | Internal server error | 500 |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable | 503 |
| `DATABASE_ERROR` | Database operation failed | 500 |

---

## Implementation in Backend

### Using the success_response Helper

```python
from src.utils.validation import success_response

# Simple success
return success_response(data={'user_id': '123'}, message='User created')

# With custom status code
return success_response(data={'user_id': '123'}, message='User created', status=201)

# List response with pagination
return success_response(
    data=users,
    message='Users retrieved',
    pagination={
        'page': 1,
        'per_page': 10,
        'total': 42,
        'total_pages': 5,
    }
)
```

### Using the error_response Helper

```python
from src.utils.validation import error_response

# Simple error
return error_response('Invalid email', code=400)

# With error code
return error_response(
    'Validation failed',
    code=400,
    error_code='VALIDATION_ERROR',
    details={'email': 'Invalid format'}
)

# Rate limit error
return error_response(
    'Too many requests',
    code=429,
    error_code='RATE_LIMITED',
    details={'retry_after': 60}
)
```

---

## Frontend Integration

### Axios Interceptor

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL,
});

// Response interceptor for standardized handling
api.interceptors.response.use(
  (response) => {
    const { ok, status, message, data, error } = response.data;
    
    if (!ok) {
      // Handle error response
      const errorMessage = error?.details 
        ? Object.values(error.details).join(', ')
        : message;
      
      throw new Error(errorMessage);
    }
    
    return data;
  },
  (error) => {
    // Handle network errors
    if (error.response?.data?.ok === false) {
      const { message, error: errorObj } = error.response.data;
      throw new Error(message);
    }
    
    throw error;
  }
);

export default api;
```

### React Hook for API Calls

```javascript
import { useState } from 'react';
import api from '@/lib/api';

export function useApi(url, method = 'GET') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  
  const execute = async (payload = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api({
        url,
        method,
        data: payload,
      });
      
      setData(response);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { loading, error, data, execute };
}
```

---

## Migration Checklist

- [x] Update all endpoints to use `success_response()` and `error_response()` from `src/utils/responses.py`
- [x] Ensure all error responses include machine-readable error codes (auth, validation, TOTP, auth_sync)
- [ ] Add validation error details for all form fields (partial — user update and TOTP routes covered)
- [ ] Test error handling in frontend (frontend still uses axios raw responses in places)
- [x] Update API documentation (this file)
- [x] Add tests for response format (`backend-api/kdp-creator-api/tests/test_api_responses.py`)
- [ ] Monitor logs for non-standard responses
- [ ] Update frontend error handling to rely on standard envelope everywhere

**Notes:** `src/utils/validation.py` retains legacy helpers used by rate-limit middleware; route handlers use `src/utils/responses.py`.

---

## Endpoints to Standardize

### User Routes (`/api/users`)
- [x] GET `/me` - Get current user
- [x] PUT `/users/<id>` - Update user
- [x] DELETE `/users/<id>` - Delete user
- [x] POST `/request-password-reset` - Deprecated (Supabase auth)
- [x] GET `/users` - List users (admin)
- [x] POST `/user/profile-sync` - Sync Supabase profile

### Auth Sync Routes (`/api`)
- [x] POST `/sync-session` - Cross-domain session sync
- [x] GET `/validate-session` - Validate current session
- [x] POST `/sync-supabase-user` - Legacy user sync
- [x] POST `/validate-supabase-token` - Legacy token validation

### Auth Routes (`/api/auth`) — N/A (Supabase-managed)
- [x] POST `/register` - Deprecated redirect message
- [x] POST `/login` - Deprecated redirect message
- [x] POST `/logout` - Standardized success response
- [ ] POST `/auth/refresh` - Not implemented (Supabase client handles refresh)

### PDF Routes (`/api/pdf`)
- [x] POST `/pdf/convert-coloring` - Convert image to PDF
- [x] POST `/pdf/format-kdp` - Format for KDP
- [x] POST `/pdf/batch-coloring` - Batch conversion
- [x] POST `/pdf/validate-kdp` - Validate compliance

### Batch Routes (`/api/batch`)
- [x] GET `/batch/jobs` - List batch jobs
- [x] POST `/batch/submit` - Submit batch job

### Subscription Routes (`/api`)
- [x] GET `/tiers` - List subscription tiers
- [x] GET `/status` - Subscription status
- [x] POST `/upgrade` - Upgrade tier

### Analytics Routes (`/api`)
- [x] GET `/user-metrics` - User analytics
- [x] GET `/business-metrics` - Business analytics

### TOTP Routes (`/api`)
- [x] POST `/2fa/setup` - Setup 2FA
- [x] POST `/2fa/verify` - Verify 2FA setup
- [x] POST `/2fa/disable` - Disable 2FA
- [x] POST `/2fa/validate` - Validate 2FA at login

### Health Routes (`/api/health`)
- [x] GET `/health` - Health check
- [x] GET `/health/ready` - Readiness check
- [x] GET `/health/live` - Liveness check

### Template Routes (`/api`)
- [x] GET `/templates` - List starter templates

---

## Testing Response Format

### Pytest Example

```python
import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    return app.test_client()

def test_success_response_format(client):
    response = client.get('/api/users/me', headers={
        'Authorization': 'Bearer valid_token'
    })
    
    assert response.status_code == 200
    data = response.get_json()
    
    # Check required fields
    assert 'ok' in data
    assert 'status' in data
    assert 'message' in data
    assert 'data' in data
    assert 'meta' in data
    
    # Check values
    assert data['ok'] is True
    assert data['status'] == 200
    assert isinstance(data['data'], dict)
    assert 'timestamp' in data['meta']
    assert 'request_id' in data['meta']

def test_error_response_format(client):
    response = client.get('/api/users/me')  # No auth header
    
    assert response.status_code == 401
    data = response.get_json()
    
    # Check required fields
    assert 'ok' in data
    assert 'status' in data
    assert 'message' in data
    assert 'error' in data
    assert 'meta' in data
    
    # Check values
    assert data['ok'] is False
    assert data['status'] == 401
    assert 'code' in data['error']
    assert data['error']['code'] == 'AUTH_MISSING'
```

---

## Monitoring and Debugging

### Log Queries

**Find all non-standard responses:**
```
level: ERROR AND message: "Non-standard response format"
```

**Find rate-limited requests:**
```
status_code: 429
```

**Find slow endpoints:**
```
elapsed_time_ms > 1000
```

---

## Version History

| Version | Date | Changes |
| :--- | :--- | :--- |
| 1.0 | 2026-06-19 | Initial standardization |

---

## References

- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)
- [JSON API Specification](https://jsonapi.org/)
