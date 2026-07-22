function getBaseUrl() {
  return (process.env.BASE_URL || 'https://kdpsuite.com').replace(/\/+$/, '');
}

function getDashboardUrl() {
  return (process.env.DASHBOARD_URL || 'https://dashboard.kdpsuite.com').replace(/\/+$/, '');
}

module.exports = { getBaseUrl, getDashboardUrl };
