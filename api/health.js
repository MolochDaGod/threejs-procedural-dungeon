import { routeDungeonApi } from '../server/router.mjs';

export default async function handler(req, res) {
  req.url = '/api/health';
  await routeDungeonApi(req, res);
}
