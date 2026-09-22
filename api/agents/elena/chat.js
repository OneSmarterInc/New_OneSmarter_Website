import { handleElenaChatRequest } from "../../../src/server/elena/elenaResponseAdapter.js";

export default async function handler(req, res) {
  const result = await handleElenaChatRequest({
    method: req.method,
    body: req.body,
    headers: req.headers,
    isRequestAborted: () => Boolean(req.aborted || req.destroyed),
  });

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(result.status).json(result.body);
}
