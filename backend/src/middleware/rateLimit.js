// Per-process guard against bursts of authentication attempts. A shared limiter
// should replace this if the API is scaled across multiple instances.
export function authRateLimit({ max = 20, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map();
  return (req, res, next) => {
    const now = Date.now();
    if (attempts.size > 10000) {
      for (const [key, value] of attempts) {
        if (value.resetAt <= now) attempts.delete(key);
      }
      if (attempts.size > 10000) attempts.delete(attempts.keys().next().value);
    }
    const key = req.ip;
    const entry = attempts.get(key);
    const current = !entry || entry.resetAt <= now ? { count: 0, resetAt: now + windowMs } : entry;
    current.count += 1;
    attempts.set(key, current);
    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ detail: 'Too many authentication attempts. Please try again later.' });
    }
    next();
  };
}
