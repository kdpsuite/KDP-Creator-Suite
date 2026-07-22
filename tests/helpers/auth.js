const { getDashboardUrl } = require('./env');

const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'unlovedproducts@gmail.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'Appl3p1376!';

async function loginToDashboard(page) {
  const dashboardUrl = getDashboardUrl();

  await page.goto(`${dashboardUrl}/login`, { waitUntil: 'networkidle' });

  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Login"), button:has-text("Sign In")'
  );
  await submitButton.click();

  await page.waitForURL(
    (url) => !url.pathname.includes('/login'),
    { timeout: 15000 }
  );
  await page.waitForLoadState('networkidle');
  await expectLoggedIn(page);
}

async function expectLoggedIn(page) {
  await page.waitForFunction(
    () => Object.keys(localStorage).some((key) => key.includes('auth-token')),
    { timeout: 15000 }
  );
}

function createApiResponse(result) {
  return {
    ok: () => result.status >= 200 && result.status < 300,
    status: () => result.status,
    json: async () => JSON.parse(result.body),
    text: async () => result.body,
  };
}

function serializeMultipart(multipart = {}) {
  const serialized = {};

  for (const [key, value] of Object.entries(multipart)) {
    if (value?.buffer) {
      serialized[key] = {
        kind: 'file',
        name: value.name,
        mimeType: value.mimeType,
        buffer: Array.from(value.buffer),
      };
      continue;
    }

    serialized[key] = {
      kind: 'field',
      value: String(value),
    };
  }

  return serialized;
}

async function authApiRequest(page, method, path, options = {}) {
  const dashboardUrl = getDashboardUrl();
  const multipart = options.multipart ? serializeMultipart(options.multipart) : null;

  const result = await page.evaluate(
    async ({ dashboardUrl, method, path, data, multipart }) => {
      const readTokenFromStorage = (storage) => {
        const authKeys = Object.keys(storage)
          .filter((key) => key.includes('auth-token') && !/\.\d+$/.test(key))
          .sort();

        for (const key of authKeys) {
          try {
            let raw = storage.getItem(key);
            if (!raw) continue;

            if (!raw.startsWith('{')) {
              const chunks = [];
              let index = 0;
              while (storage.getItem(`${key}.${index}`)) {
                chunks.push(storage.getItem(`${key}.${index}`));
                index += 1;
              }
              if (chunks.length > 0) {
                raw = chunks.join('');
              }
            }

            const parsed = JSON.parse(raw);
            if (parsed?.access_token) return parsed.access_token;
            if (parsed?.currentSession?.access_token) {
              return parsed.currentSession.access_token;
            }
          } catch {
            // try next storage key
          }
        }

        return null;
      };

      const token =
        readTokenFromStorage(localStorage) ||
        readTokenFromStorage(sessionStorage);

      if (!token) {
        return { status: 401, body: JSON.stringify({ error: 'missing_token' }) };
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      let body;

      if (multipart) {
        const formData = new FormData();
        for (const [key, entry] of Object.entries(multipart)) {
          if (entry.kind === 'file') {
            formData.append(
              key,
              new Blob([new Uint8Array(entry.buffer)], { type: entry.mimeType }),
              entry.name
            );
          } else {
            formData.append(key, entry.value);
          }
        }
        body = formData;
      } else if (data !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
      }

      const response = await fetch(`/api${path}`, {
        method,
        headers,
        body,
      });

      return {
        status: response.status,
        body: await response.text(),
      };
    },
    {
      dashboardUrl,
      method,
      path,
      data: options.data,
      multipart,
    }
  );

  return createApiResponse(result);
}

async function getAccessToken(page) {
  return page.evaluate(() => {
    const readTokenFromStorage = (storage) => {
      const authKeys = Object.keys(storage)
        .filter((key) => key.includes('auth-token') && !/\.\d+$/.test(key))
        .sort();

      for (const key of authKeys) {
        try {
          let raw = storage.getItem(key);
          if (!raw) continue;

          if (!raw.startsWith('{')) {
            const chunks = [];
            let index = 0;
            while (storage.getItem(`${key}.${index}`)) {
              chunks.push(storage.getItem(`${key}.${index}`));
              index += 1;
            }
            if (chunks.length > 0) {
              raw = chunks.join('');
            }
          }

          const parsed = JSON.parse(raw);
          if (parsed?.access_token) return parsed.access_token;
          if (parsed?.currentSession?.access_token) {
            return parsed.currentSession.access_token;
          }
        } catch {
          // try next storage key
        }
      }

      return null;
    };

    return (
      readTokenFromStorage(localStorage) ||
      readTokenFromStorage(sessionStorage)
    );
  });
}

module.exports = {
  TEST_EMAIL,
  TEST_PASSWORD,
  loginToDashboard,
  getAccessToken,
  authApiRequest,
};
