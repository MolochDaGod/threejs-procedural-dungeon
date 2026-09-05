import { handleComplete } from '../../server/router.mjs';
import { CORS } from '../../server/http.mjs';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  await handleComplete(req, res);
}
