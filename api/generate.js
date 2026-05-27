const { setCors, readJsonBody, sendJson, sendError } = require('./_helpers');
const { runSubmit } = require('../lib/generate');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return sendJson(res, 405, { message: '仅支持 POST' });
  }

  try {
    const body = await readJsonBody(req);
    const data = await runSubmit(body);
    return sendJson(res, 200, data);
  } catch (err) {
    console.error('submit error:', err);
    return sendError(res, err);
  }
};
