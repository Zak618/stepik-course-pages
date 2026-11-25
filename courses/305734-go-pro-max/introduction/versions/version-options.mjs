export function normalizeVersion(value) {
  if (typeof value !== 'string' || value.length > 20) return null;
  return value.trim().match(/^v?(\d{1,3}\.\d{1,3}(?:\.\d{1,3})?)$/i)?.[1] || null;
}

export function versionOptions(search, fallback = {current:'1.0',history:[]}) {
  const parameters = new URLSearchParams(search);
  const current = normalizeVersion(parameters.get('version')) || normalizeVersion(fallback.current) || '1.0';
  const historyText = parameters.has('history') ? parameters.get('history') : (fallback.history || []).join(',');
  const history = [...new Set(historyText.slice(0,2000).split(',').map(normalizeVersion))]
    .filter(version => version && version !== current).slice(0,30);
  return {current,history};
}
