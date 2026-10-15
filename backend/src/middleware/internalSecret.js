module.exports = function requireInternalSecret(req, res, next) {
  const expected = process.env.N8N_INTERNAL_SECRET;
  const provided = req.headers['x-internal-secret'];

  if (!expected) {
    return res.status(500).json({ error: 'internal_secret_not_configured' });
  }

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'unauthorized_internal_request' });
  }

  return next();
};
