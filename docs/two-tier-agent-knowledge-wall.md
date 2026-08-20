# Two-Tier Agent Knowledge Wall

## Purpose

This design separates factual visitor answering from character shaping. It is an architectural contract for future agent work, not an implementation of a second knowledge tier or a second agent runtime.

## Canonical tier

The canonical tier contains approved public OneSmarter content only. It is the sole factual source for visitor-facing answers and must retain retrieval-exact grounding, source identifiers, existing claim rules, and output validation.

Canonical records may be used to:

- answer visitor questions directly;
- support comparisons, recommendations, and clarifications;
- provide citations or source routes where the current API permits them; and
- establish whether a claim is supported, unsupported, or prohibited.

The canonical tier remains the source of truth even when character knowledge influences what the agent notices first.

## Character tier

The character tier contains absorbed, personal, biographical, stylistic, and character knowledge. It may shape Café conversation, personality, tone, interests, indifferences, and salience. It may include constructed material that is not approved as public OneSmarter evidence.

Character records must be explicitly marked with a non-canonical tier and must never be:

- quoted as factual evidence in a visitor-facing answer;
- returned as a matched source or citation;
- inserted into the canonical retrieval context;
- used to establish a product, service, compliance, customer, integration, or company claim; or
- accepted by the output validator as grounding for a public answer.

## Code-enforced boundary

The wall must be enforced by typed data flow rather than naming conventions or prompt instructions alone.

1. Knowledge records carry an immutable tier marker such as `canonical` or `character`.
2. Visitor-answer retrieval accepts only canonical record identifiers and rejects character records at its input boundary.
3. The prompt/context builder receives canonical evidence separately from optional character-derived salience signals. Character text is never placed in the factual evidence block.
4. Matched-source serialization and citations accept canonical source IDs only.
5. Output validation requires every factual claim to trace to canonical evidence and rejects character-tier IDs in grounding metadata.
6. Tests inject character-only facts and prove that they cannot appear as supported visitor claims.

These checks must fail closed. A missing or unknown tier is not eligible as canonical evidence.

## Crossing rule

Character knowledge may cross the wall only as a non-factual direction signal. It may influence:

- prioritization among already eligible canonical records;
- salience of canonical topics;
- which canonical direction an agent explores first; or
- the order of safe clarification questions.

The crossing value must contain identifiers or bounded weights, not character-tier prose or claims. After crossing, the answer still requires independently retrieved canonical evidence. If canonical evidence does not support the direction, the agent must omit it, clarify, or state that approved information is unavailable.

## Existing salience machinery

No changes to these modules are part of this design task. A future implementation could integrate them as follows:

- `miraEvidenceSelection.js`: accept bounded salience boosts only after its canonical candidate set has been established; never add a character-only record to primary or supporting evidence.
- `miraAdaptiveDiscovery.js`: use character-derived salience to choose among already approved clarification dimensions, while keeping the preliminary guidance grounded canonically.
- `miraEntityResolver.js`: continue resolving against the canonical offering registry; character aliases may suggest a lookup direction but cannot become resolved evidence.
- `miraBusinessGoals.js`: allow bounded prioritization among canonically mapped business goals without changing the approved goal-to-offering evidence bridge.

The salience signal should be explainable, bounded, request-scoped, and discarded when the current visitor message supplies a stronger explicit direction.

## Safety and validation boundary

`miraClaimRules.js` remains the policy boundary for prohibited and replacement wording. `miraOutputValidator.js` remains the final deterministic check for supported claims, sensitive-data handling, compliance boundaries, and required handoff behavior.

Character influence must occur before canonical answer composition. It cannot bypass claim rules, lower validation requirements, turn an unknown claim into a supported claim, or suppress safety handling. Safety continues to have the highest precedence.

## Future second-agent contract

A future working agent must provide:

- its own identity and presentation configuration;
- canonical retrieval access through the same tier-filtered interface;
- optional character data stored and queried separately;
- bounded character-to-canonical salience output containing no factual prose;
- the existing claim/output validation boundary for visitor-facing answers; and
- tests proving that character-only facts cannot become public evidence.

This contract does not select the next agent, create a runtime, add storage, ingest feeds, or implement character memory.
