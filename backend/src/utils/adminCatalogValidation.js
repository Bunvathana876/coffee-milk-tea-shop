export function validId(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0 && /^\d+$/.test(String(value));
}

export function validName(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 120;
}

export function validOptionalText(value, max = 1000) {
  return value == null || (typeof value === 'string' && value.length <= max);
}

export function validOptionalImageUrl(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || value.length > 2048 || value !== value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validPrice(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 9999999.99 &&
    Math.abs(Math.round(value * 100) - value * 100) < 1e-6
  );
}

export function validBoolean(value) {
  return typeof value === 'boolean';
}
