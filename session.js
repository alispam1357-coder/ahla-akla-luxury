const crypto = require('crypto');

const name = 'ahla_session';
const secret = process.env.SESSION_SECRET || 'development-only-secret';
const sign = value => crypto.createHmac('sha256', secret).update(value).digest('base64url');
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');

function sessionMiddleware(req, res, next) {
  const raw = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
  if (raw) {
    const [payload, signature] = raw.split('.');
    const expected = payload && sign(payload);
    if (payload && signature && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
      try { req.session = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { req.session = {}; }
    }
  }
  req.session ||= {};
  res.saveSession = () => {
    const payload = encode(req.session);
    res.setHeader('Set-Cookie', `${name}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${process.env.VERCEL ? '; Secure' : ''}`);
  };
  next();
}

module.exports = { sessionMiddleware };