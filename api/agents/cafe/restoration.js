import { restoreCurrentCafeParticipants } from "../../../src/server/agentState/cafeRestorationRuntime.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "method_not_allowed",
      message: "Use POST for Café restoration.",
    });
  }

  await restoreCurrentCafeParticipants();
  return res.status(204).end();
}
