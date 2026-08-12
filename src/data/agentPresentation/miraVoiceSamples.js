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

export const MIRA_VOICE_PROFILE_ID = "mira-v1";

export const MIRA_VOICE_PRONUNCIATION_NOTES = [
  "OneSmarter -> One Smarter",
  "Mira -> MEER-ah",
  "HIPAA -> HIP-uh",
  "SOC 2 -> sock two",
  "IBM i -> I-B-M eye",
  "AS400 -> A-S four hundred",
  "AI -> A-I",
  "TPA -> T-P-A",
  "PHI -> P-H-I",
];

export const miraVoiceSamples = [
  {
    id: "welcome",
    label: "Welcome",
    voiceProfileId: MIRA_VOICE_PROFILE_ID,
    pace: "145-150 wpm",
    posture: "Warm Guide",
    pronunciationNotes: MIRA_VOICE_PRONUNCIATION_NOTES,
    productionDirection:
      "Warm, slight smile, gentle opening lift. Keep the first sentence friendly and composed.",
    status: "available",
    approvalStatus: "approved",
    assetPath: "/audio/mira/mira-welcome.mp3",
    transcript:
      "Hi, I'm Mira, OneSmarter's AI guide. I can help you understand our platforms, technology services, business services, compliance readiness, and Trust Center.",
  },
  {
    id: "helpful",
    label: "Helpful",
    voiceProfileId: MIRA_VOICE_PROFILE_ID,
    pace: "150-155 wpm",
    posture: "Warm Guide",
    pronunciationNotes: MIRA_VOICE_PRONUNCIATION_NOTES,
    productionDirection:
      "Confident, conversational, and modestly quicker than Welcome. Keep the line useful rather than promotional.",
    status: "available",
    approvalStatus: "approved",
    assetPath: "/audio/mira/mira-helpful.mp3",
    transcript:
      "OneSmarter builds secure platforms, practical AI workflows, technology solutions, business services, and compliance readiness support.",
  },
  {
    id: "careful",
    label: "Careful",
    voiceProfileId: MIRA_VOICE_PROFILE_ID,
    pace: "145-150 wpm",
    posture: "Careful Reviewer",
    pronunciationNotes: MIRA_VOICE_PRONUNCIATION_NOTES,
    productionDirection:
      "Slower and deliberate. Emphasize approved compliance language without sounding defensive.",
    status: "available",
    approvalStatus: "approved",
    assetPath: "/audio/mira/mira-careful.mp3",
    transcript:
      "I should keep this wording precise. OneSmarter uses evidence-based language such as SOC 2 Type II Attested, HIPAA Security Rule Compliance Assessment Completed, and ISO/IEC 27001 Certified.",
  },
  {
    id: "concerned",
    label: "Concerned",
    voiceProfileId: MIRA_VOICE_PROFILE_ID,
    pace: "145-150 wpm",
    posture: "Careful Reviewer",
    pronunciationNotes: MIRA_VOICE_PRONUNCIATION_NOTES,
    productionDirection:
      "Calm and protective. Never alarmist. The warning should sound respectful and clear.",
    status: "available",
    approvalStatus: "approved",
    assetPath: "/audio/mira/mira-concerned.mp3",
    transcript:
      "Please do not submit PHI, confidential documents, or private operational details through this public agent.",
  },
  {
    id: "handoff",
    label: "Handoff",
    voiceProfileId: MIRA_VOICE_PROFILE_ID,
    pace: "145-150 wpm",
    posture: "Thoughtful Strategist",
    pronunciationNotes: MIRA_VOICE_PRONUNCIATION_NOTES,
    productionDirection:
      "Reassuring. Speak care@onesmarter.com slowly and distinctly.",
    status: "available",
    approvalStatus: "approved",
    assetPath: "/audio/mira/mira-handoff.mp3",
    transcript:
      "For pricing, procurement, partnerships, project scoping, or client-specific questions, please contact care@onesmarter.com.",
  },
];

export const isAvailableMiraVoiceSample = (sample) => sample?.status === "available";

export const isAllowedMiraVoiceStyle = (style) =>
  MIRA_ALLOWED_VOICE_STYLES.includes(style);
