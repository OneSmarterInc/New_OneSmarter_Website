import { handleMiraChatRequest } from "./chatCore.js";

export default function handler(req, res) {
  const result = handleMiraChatRequest({
    method: req.method,
    body: req.body,
    headers: req.headers,
  });

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(result.status).json(result.body);
}
