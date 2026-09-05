import { handleRaviChatRequest } from "../../../src/server/ravi/raviResponseAdapter.js";

export default async function handler(req, res) {
  const result = await handleRaviChatRequest({
    method: req.method,
    body: req.body,
    headers: req.headers,
    isRequestAborted: () => Boolean(req.aborted || req.destroyed),
  });
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(result.status).json(result.body);
}
