export const MIRA_ALLOWED_VOICE_STYLES = [
  "Warm Guide",
  "Careful Reviewer",
  "Thoughtful Strategist",
];

export const MIRA_LANGUAGE_DEMOS = [
  { id: "english", label: "English", status: "available" },
  { id: "future-language-samples", label: "Future language samples", status: "planned" },
];

export const MIRA_VOICE_SAMPLE_STATUSES = ["available", "pending_asset"];

export const miraVoiceSamples = [
  {
    id: "welcome",
    label: "Welcome",
    posture: "Warm Guide",
    status: "pending_asset",
    assetPath: "/audio/mira/mira-welcome.mp3",
    transcript:
      "Hi, I'm Mira, OneSmarter's AI guide. I can help you understand our platforms, technology services, business services, compliance readiness, and Trust Center.",
  },
  {
    id: "helpful",
    label: "Helpful",
    posture: "Warm Guide",
    status: "pending_asset",
    assetPath: "/audio/mira/mira-helpful.mp3",
    transcript:
      "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
  },
  {
    id: "careful",
    label: "Careful",
    posture: "Careful Reviewer",
    status: "pending_asset",
    assetPath: "/audio/mira/mira-careful.mp3",
    transcript:
      "I should keep this wording precise. OneSmarter uses evidence-based language such as SOC 2 Type II Attested and HIPAA Security Rule Compliance Assessment Completed.",
  },
  {
    id: "concerned",
    label: "Concerned",
    posture: "Careful Reviewer",
    status: "pending_asset",
    assetPath: "/audio/mira/mira-concerned.mp3",
    transcript:
      "Please do not submit PHI, confidential documents, or private operational details through this public agent.",
  },
  {
    id: "handoff",
    label: "Handoff",
    posture: "Thoughtful Strategist",
    status: "pending_asset",
    assetPath: "/audio/mira/mira-handoff.mp3",
    transcript:
      "For pricing, procurement, partnerships, project scoping, or client-specific questions, please contact care@onesmarter.com.",
  },
];

export const isAvailableMiraVoiceSample = (sample) => sample?.status === "available";

export const isAllowedMiraVoiceStyle = (style) =>
  MIRA_ALLOWED_VOICE_STYLES.includes(style);

