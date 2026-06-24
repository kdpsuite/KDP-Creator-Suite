# Rate Limiting Implementation - Phase 4

## Overview

Rate limiting has been applied to all sensitive and resource-intensive API endpoints to protect against abuse and ensure fair resource usage across the KDP Creator Suite ecosystem.

## Configuration

### Rate Limits Applied

| Endpoint | Limit | Window | Purpose |
| :--- | :--- | :--- | :--- |
| `/pdf/convert-image-to-coloring` | 10 requests | 1 hour | File upload protection |
| `/pdf/validate-kdp-compliance` | 10 requests | 1 hour | File upload protection |
| `/pdf/convert-to-kdp-format` | 10 requests | 1 hour | File upload protection |
| `/pdf/batch-process` | 5 requests | 1 day | Batch processing protection |
| `/batch/submit` | 5 requests | 1 day | Batch job submission protection |
| `/request-password-reset` | 3 requests | 1 hour | Brute force protection |

### Rate Limit Headers

All rate-limited endpoints return the following headers in responses:

```
X-RateLimit-Limit: <max_requests>
X-RateLimit-Remaining: <remaining_requests>
X-RateLimit-Reset: <unix_timestamp_when_limit_resets>
```

### Error Response (429 Too Many Requests)

When a rate limit is exceeded, the API returns:

```json
{
  "ok": false,
  "error": {
    "message": "Rate limit exceeded. Try again in X seconds.",
    "code": "RATE_LIMIT_EXCEEDED",
    "details": {
      "retry_after": 120,
      "reset_time": 1719014400.5
    },
    "timestamp": "2026-06-21T12:00:00Z"
  }
}
```

## Implementation Details

### Rate Limiter Module

**Location**: `src/utils/rate_limit.py`

- **Type**: In-memory rate limiter (suitable for single-instance deployments)
- **Storage**: Dictionary with automatic cleanup every 5 minutes
- **Key Generation**: IP address for general limits, email for password resets, user ID for batch operations

### Decorators

#### `@rate_limit(max_requests, window_seconds, key_func=None)`

Generic rate limiting decorator. Use for custom endpoints.

```python
@app.route('/api/expensive-operation', methods=['POST'])
@rate_limit(max_requests=5, window_seconds=3600)
def expensive_operation():
    return {"status": "ok"}
```

#### `@rate_limit_file_upload`

Pre-configured for file upload endpoints: 10 requests per hour per user.

```python
@pdf_bp.route('/convert', methods=['POST'])
@rate_limit_file_upload
@jwt_required()
def convert_file():
    ...
```

#### `@rate_limit_batch_processing`

Pre-configured for batch operations: 5 requests per day per user.

```python
@batch_bp.route('/submit', methods=['POST'])
@rate_limit_batch_processing
@jwt_required()
def submit_batch():
    ...
```

#### `@rate_limit_password_reset`

Pre-configured for password resets: 3 requests per hour per email.

```python
@user_bp.route('/request-password-reset', methods=['POST'])
@rate_limit_password_reset
def request_reset():
    ...
```

## Migration to Redis (Multi-Instance)

For production deployments with multiple instances, replace the in-memory limiter with Redis:

```python
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def is_allowed_redis(key, max_requests, window_seconds):
    current_count = redis_client.incr(f"rate_limit:{key}")
    if current_count == 1:
        redis_client.expire(f"rate_limit:{key}", window_seconds)
    
    return current_count <= max_requests
```

## Monitoring

### Logging

Rate limit violations are logged with:
- Client IP address
- Endpoint path
- HTTP method
- Time until reset

**Log Example**:
```
Rate limit exceeded for 192.168.1.1
endpoint=/pdf/convert-image-to-coloring
method=POST
reset_in_seconds=120
```

### Metrics

Track rate limit violations via the structured logging system:

```python
from src.utils.logger import logger

# Logs are available in JSON format for analysis
# Check logs for patterns of abuse or legitimate high-volume users
```

## Frontend Handling

### Recommended Client Behavior

1. **Check Headers**: Read `X-RateLimit-Remaining` to show user feedback
2. **Handle 429**: Implement exponential backoff on rate limit errors
3. **Show Retry Time**: Display `retry_after` from error response to user

**Example**:
```javascript
const response = await fetch('/api/pdf/convert', { method: 'POST' });

if (response.status === 429) {
  const data = await response.json();
  const retryAfter = data.error.details.retry_after;
  console.log(`Rate limited. Retry in ${retryAfter} seconds.`);
  
  // Show user feedback
  showNotification(`Too many requests. Please wait ${retryAfter} seconds.`);
}
```

## Adjustment Guide

To modify rate limits, edit `src/utils/rate_limit.py`:

```python
# Adjust these constants
LOGIN_LIMIT = (5, 300)                    # 5 per 5 minutes
PASSWORD_RESET_LIMIT = (3, 3600)          # 3 per hour
FILE_UPLOAD_LIMIT = (10, 3600)            # 10 per hour
BATCH_PROCESSING_LIMIT = (5, 86400)       # 5 per day
API_GENERAL_LIMIT = (100, 3600)           # 100 per hour
```

Then redeploy to apply changes.

## Testing

### Manual Testing

```bash
# Test rate limit on file upload (10 per hour)
for i in {1..12}; do
  curl -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@test.png" \
    https://api.kdpsuite.com/pdf/convert-image-to-coloring
done

# 11th request should return 429
```

### Automated Testing

Use the Playwright test suite to verify rate limiting:

```bash
pnpm test:rate-limit
```

## Troubleshooting

### "Rate limit exceeded" but I haven't made many requests

**Possible Causes**:
1. Multiple users behind same IP (corporate network)
2. Retry logic sending duplicate requests
3. Browser pre-fetching requests

**Solution**: Implement user-based rate limiting instead of IP-based.

### Rate limits not working

**Check**:
1. Verify decorators are applied in correct order (rate limit before jwt_required)
2. Ensure `src/utils/rate_limit.py` is imported correctly
3. Check logs for rate limit violations

### Memory usage increasing

**Cause**: Rate limiter cleanup not running frequently enough.

**Solution**: Reduce `cleanup_interval` in `RateLimiter` class:

```python
self.cleanup_interval = 60  # Clean up every 1 minute instead of 5
```

## Next Steps

1. **Deploy Phase 4**: Push changes to GitHub and trigger Vercel build
2. **Monitor**: Watch logs for rate limit violations
3. **Adjust**: Fine-tune limits based on actual usage patterns
4. **Upgrade**: Migrate to Redis when scaling to multiple instances
