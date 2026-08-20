export const config = {
  matches: ['http://localhost:5173/*', 'https://scout.app/*'],
}

// Let the web app know the Scout extension is installed so it can hide the
// "Extension not installed" sidebar card. Content scripts run in an isolated
// world, so we publish through both a DOM attribute (checked on load) and a
// window message (notifies already-open SPA tabs the moment it loads).
document.documentElement.setAttribute('data-scout-extension', 'installed')
window.postMessage({ source: 'scout-extension', type: 'INSTALLED' }, '*')
