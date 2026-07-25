import { handleMiraChatRequest } from "../../../src/server/mira/chatCore.js";

export default async function handler(req, res) {
  const result = await handleMiraChatRequest({
    method: req.method,
    body: req.body,
    headers: req.headers,
  });

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(result.status).json(result.body);
}
