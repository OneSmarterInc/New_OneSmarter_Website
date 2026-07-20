# Mira Static Visual Production Spec v1

Date: 2026-07-20

This specification defines Mira Vale's static visual-presence direction for the `/ai-agents` prototype. It is for approved artwork planning and review only. It does not authorize live avatar processing, camera access, facial tracking, lip-sync, generated video, runtime image generation, microphone input, speech recognition, realtime voice, or dynamic animation.

Status update: the Welcoming portrait has been approved and wired for playback-adjacent visual presence under identity profile `mira-visual-v1`. It is the visual identity baseline for future Mira expression artwork.

## Approved Visual States

Mira has six approved static visual states:

| State | Expression Direction |
| --- | --- |
| Welcoming | Soft smile, open posture, attentive eyes. |
| Helpful | Engaged, confident, slight smile. |
| Thoughtful | Reflective, composed, subtle concentration. |
| Careful | Precise, serious but calm, measured expression. |
| Concerned | Protective, empathetic, not alarmed. |
| Confident | Steady, assured, professional. |

Each state should map to one static artwork file under:

- `public/images/agents/mira/mira-welcoming.webp`
- `public/images/agents/mira/mira-helpful.webp`
- `public/images/agents/mira/mira-thoughtful.webp`
- `public/images/agents/mira/mira-careful.webp`
- `public/images/agents/mira/mira-concerned.webp`
- `public/images/agents/mira/mira-confident.webp`

The approved Welcoming artwork is available at `public/images/agents/mira/mira-welcoming.webp`. Until the other approved artwork exists, the website uses a branded local placeholder with `MV` initials and visible posture text.

Future Helpful, Thoughtful, Careful, Concerned, and Confident portraits must use the same person, natural square framing, lighting direction, wardrobe family, and background style as the Welcoming baseline.

## Identity

- Adult professional woman.
- Warm, intelligent, and composed.
- Enterprise-appropriate.
- Visually consistent with the approved `mira-v1` voice identity.
- Approachable but not overly casual.
- Contemporary business presentation.
- Same identity across all posture states.
- Identity profile: `mira-visual-v1`.

## Expression Guidance

### Welcoming

- Soft smile.
- Open posture.
- Attentive eyes.

### Helpful

- Engaged.
- Confident.
- Slight smile.

### Thoughtful

- Reflective.
- Composed.
- Subtle concentration.

### Careful

- Precise.
- Serious but calm.
- Measured expression.

### Concerned

- Protective.
- Empathetic.
- Not alarmed.

### Confident

- Steady.
- Assured.
- Professional.

## Avoid

- Caricature.
- Exaggerated emotion.
- Glamour styling.
- Overly casual appearance.
- Dramatic lighting.
- Uncanny photorealism.
- Cartoon mascot treatment.
- Different identity across states.
- Talking-mouth simulation.
- Lip-sync.
- Live video/avatar effects.

## Accessibility Requirements

- Posture text must remain visible without artwork.
- Every state needs an accessible description.
- No information should be conveyed by the image alone.
- Placeholders must remain legible at mobile sizes.
- Motion should be absent or limited to simple reduced-motion-safe fades.
- No flashing, looping, or live media should be used.

## Future Review Gate

Future animated avatar work, generated scenes, lip-sync, voice-reactive visuals, camera input, or realtime avatar services require a separate work package and explicit privacy, accessibility, performance, safety, vendor, and production review.
