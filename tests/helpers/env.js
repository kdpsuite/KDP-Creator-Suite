const dns = require('dns').promises;

function getBaseUrl() {
  return (process.env.BASE_URL || 'https://kdpsuite.com').replace(/\/+$/, '');
}

function getDashboardUrl() {
  return (process.env.DASHBOARD_URL || 'https://dashboard.kdpsuite.com').replace(
    /\/+$/,
    ''
  );
}

/**
 * Marketing apex currently 308s to www.*, which often lacks DNS and/or TLS SAN.
 * Returns false when browser navigation to BASE_URL cannot succeed.
 */
async function isMarketingReachable() {
  const hostname = new URL(getBaseUrl()).hostname;
  const wwwHost = hostname.startsWith('www.') ? hostname : `www.${hostname}`;

  try {
    await dns.lookup(hostname);
  } catch {
    return false;
  }

  if (wwwHost !== hostname) {
    try {
      await dns.lookup(wwwHost);
    } catch {
      return false;
    }
  }

  return true;
}

module.exports = { getBaseUrl, getDashboardUrl, isMarketingReachable };
