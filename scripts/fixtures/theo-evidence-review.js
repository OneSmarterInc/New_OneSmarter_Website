// Provider double for the existing, explicitly supported Theo fixtures.
// Contradictory, partial, absent and malformed reviews are exercised separately.
export const supportedTheoFixtureReview = async ({ analysis, websiteContent }) => ({
  overallSupported: true,
  strengthsSupported: analysis.strengths.map(() => true),
  recommendationsSupported: analysis.recommendations.map(() => true),
  findings: analysis.findings.map(({ evidence }) => {
    const quote = evidence.endsWith("…") ? evidence.slice(0, -1) : evidence;
    return websiteContent.includes(quote)
      ? { kind: "observation", conceptStatus: "present", supported: true, quotes: [quote] }
      : { kind: "absence", conceptStatus: "absent", supported: true, quotes: [] };
  }),
});
