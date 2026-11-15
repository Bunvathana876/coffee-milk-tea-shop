export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ detail: 'Malformed JSON body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ detail: 'Request body is too large.' });
  }
  const requestedStatus = err.status || err.statusCode;
  const status = Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus < 600 ? requestedStatus : 500;
  if (status >= 500) console.error('[API Error]:', err.code || err.name || 'UnknownError');
  const message = status >= 500 ? 'Internal server error.' : err.message || 'Invalid request.';
  res.status(status).json({ detail: message });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ detail: `Route not found: ${req.method} ${req.path}` });
}
