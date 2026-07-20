# Mira Voice Production Spec v1

Date: 2026-07-20
Profile ID: `mira-v1`

This specification defines the approved production direction for Mira Vale's scripted voice samples. It is for asset production and review only. It does not authorize live text-to-speech, speech-to-text, microphone input, browser speech synthesis, realtime voice, or any additional AI/model call.

Status update: all five scripted Mira voice samples have been approved and wired for playback under profile `mira-v1`. The playback set is prerecorded and static. It does not add microphone input, user-audio processing, speech recognition, live text-to-speech, realtime voice, or dynamic response narration.

## Identity

- Adult female voice.
- Warm, composed, intelligent, and professional.
- Age impression: late 30s to mid-40s.
- Enterprise-appropriate presence: credible, calm, and attentive.

## Accent

- Neutral international English.
- Light Indian influence.
- Subtle and natural.
- Never exaggerated, caricatured, theatrical, or distracting.

## Pace

- Approximately 145-155 words per minute.
- Clear pauses between ideas.
- Slightly slower for compliance or safety wording.
- Slightly quicker for concise helpful summaries, while remaining clear.

## Pitch And Energy

- Natural, slightly lower and steadier than a highly animated consumer assistant.
- Welcoming and attentive.
- Never salesy, bubbly, overanimated, breathy, or intimate.
- Confident without sounding promotional.

## Delivery

- Clear phrasing.
- Confident sentence endings.
- Minimal filler.
- Consistent voice identity across all moods.
- Controlled emotional range: warm, careful, protective, and reassuring without dramatic swings.

## Pronunciation Guide

| Term | Pronunciation |
| --- | --- |
| OneSmarter | "One Smarter" |
| Mira | "MEER-ah" |
| HIPAA | "HIP-uh" |
| SOC 2 | "sock two" |
| IBM i | "I-B-M eye" |
| AS400 | "A-S four hundred" |
| AI | "A-I" |
| TPA | "T-P-A" |
| PHI | "P-H-I" |

## Sample-Specific Direction

| Sample | Direction |
| --- | --- |
| Welcome | Warm, slight smile, gentle opening lift. Keep the first sentence friendly and composed. |
| Helpful | Confident, conversational, and modestly quicker than Welcome. Keep the line useful rather than promotional. |
| Careful | Slower and deliberate. Emphasize approved compliance language without sounding defensive. |
| Concerned | Calm and protective. Never alarmist. The warning should sound respectful and clear. |
| Handoff | Reassuring. Speak `care@onesmarter.com` slowly and distinctly. |

## Avoid

- No caricatured regional accent.
- No sales voice.
- No robotic cadence.
- No breathy or intimate delivery.
- No dramatic emotional swings.
- No excessive upward inflection.
- No fast pacing.
- No different voice identities for different samples.

## Approval Checklist

Before any MP3 asset is marked approved and enabled in the UI, confirm:

- Trustworthy.
- Clear.
- Warm.
- Enterprise-appropriate.
- Internationally understandable.
- Consistent across moods.
- Correct pronunciation.
- No exaggerated accent.
- No sales tone.
- No clipping or background noise.
- No live synthesis or provider call was used by the website runtime.

## Expected Asset Location

Approved audio files should be placed at:

- `public/audio/mira/mira-welcome.mp3`
- `public/audio/mira/mira-helpful.mp3`
- `public/audio/mira/mira-careful.mp3`
- `public/audio/mira/mira-concerned.mp3`
- `public/audio/mira/mira-handoff.mp3`

The website should keep samples in `pending_asset` status until reviewed MP3 files are present and approved.

Current approved playback assets:

- `public/audio/mira/mira-welcome.mp3`
- `public/audio/mira/mira-helpful.mp3`
- `public/audio/mira/mira-careful.mp3`
- `public/audio/mira/mira-concerned.mp3`
- `public/audio/mira/mira-handoff.mp3`

Future dynamic turn-based text-to-speech remains a separate work package requiring privacy, safety, cost, accessibility, vendor, and production review.
