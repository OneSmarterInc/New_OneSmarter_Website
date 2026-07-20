export const MIRA_VISUAL_STATE_IDS = [
  "welcoming",
  "helpful",
  "thoughtful",
  "careful",
  "concerned",
  "confident",
];

export const miraVisualStates = [
  {
    id: "welcoming",
    label: "Welcoming",
    expression: "Soft smile",
    accessibilityDescription:
      "Mira appears warm and attentive, with an open professional posture.",
    assetStatus: "available",
    assetPath: "/images/agents/mira/mira-welcoming.webp",
    approvalStatus: "approved",
    identityProfileId: "mira-visual-v1",
    fallbackInitials: "MV",
    designDirection:
      "Soft smile, open posture, attentive eyes, and a composed business presence.",
  },
  {
    id: "helpful",
    label: "Helpful",
    expression: "Engaged",
    accessibilityDescription:
      "Mira appears engaged and ready to explain approved OneSmarter information.",
    assetStatus: "pending_asset",
    assetPath: "/images/agents/mira/mira-helpful.webp",
    fallbackInitials: "MV",
    designDirection:
      "Engaged, confident, and lightly smiling without a sales-like tone.",
  },
  {
    id: "thoughtful",
    label: "Thoughtful",
    expression: "Reflective",
    accessibilityDescription:
      "Mira appears reflective and composed while considering the question.",
    assetStatus: "pending_asset",
    assetPath: "/images/agents/mira/mira-thoughtful.webp",
    fallbackInitials: "MV",
    designDirection:
      "Reflective, composed, and subtly concentrated with restrained expression.",
  },
  {
    id: "careful",
    label: "Careful",
    expression: "Precise",
    accessibilityDescription:
      "Mira appears precise and calm for questions that need careful boundaries.",
    assetStatus: "pending_asset",
    assetPath: "/images/agents/mira/mira-careful.webp",
    fallbackInitials: "MV",
    designDirection:
      "Precise, serious but calm, and measured for trust or safety language.",
  },
  {
    id: "concerned",
    label: "Concerned",
    expression: "Protective",
    accessibilityDescription:
      "Mira appears protective and empathetic without sounding alarmed.",
    assetStatus: "pending_asset",
    assetPath: "/images/agents/mira/mira-concerned.webp",
    fallbackInitials: "MV",
    designDirection:
      "Protective and empathetic, with a calm safety-boundary posture.",
  },
  {
    id: "confident",
    label: "Confident",
    expression: "Assured",
    accessibilityDescription:
      "Mira appears steady and assured for a grounded approved response.",
    assetStatus: "pending_asset",
    assetPath: "/images/agents/mira/mira-confident.webp",
    fallbackInitials: "MV",
    designDirection:
      "Steady, assured, and professional, with calm confidence rather than bravado.",
  },
];

const visualStateById = new Map(miraVisualStates.map((state) => [state.id, state]));

export const MIRA_POSTURE_TO_VISUAL_STATE = {
  welcoming: "welcoming",
  helpful: "helpful",
  thoughtful: "thoughtful",
  careful: "careful",
  concerned: "concerned",
  confident: "confident",
};

export const getMiraVisualStateForPosture = (posture) => {
  const visualStateId = MIRA_POSTURE_TO_VISUAL_STATE[posture] || "welcoming";
  return visualStateById.get(visualStateId) || visualStateById.get("welcoming");
};
