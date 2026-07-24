const splitParagraphs = (text) =>
  String(text || "")
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

export const formatMiraAnswerBlocks = (text) => {
  const lines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+-\s+(?=[A-Z0-9])/g, "\n- ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let bullets = [];
  let section = null;
  let note = null;

  const flushBullets = () => {
    if (bullets.length) blocks.push({ type: "list", items: bullets });
    bullets = [];
  };
  const flushSection = () => {
    if (section) blocks.push(section);
    section = null;
  };

  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      flushBullets();
      flushSection();
      section = {
        type: "entity-section",
        number: Number(numbered[1]),
        heading: numbered[2].trim(),
        items: [],
      };
      note = null;
      continue;
    }

    const importantNote = line.match(/^Important note:\s*(.*)$/i);
    if (importantNote) {
      flushBullets();
      flushSection();
      note = {
        type: "important-note",
        heading: "Important note",
        text: importantNote[1].trim(),
        items: [],
      };
      blocks.push(note);
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      const item = bullet[1].trim();
      if (section) section.items.push(item);
      else if (note) note.items.push(item);
      else bullets.push(item);
      continue;
    }

    if (note && !note.text) {
      note.text = line;
      continue;
    }

    const detail = line.match(/^(.+?):\s+(.+)$/);
    if (detail) {
      const detailHeading = detail[1].trim().toLowerCase();
      const matchingSection = [...blocks]
        .reverse()
        .find(
          (block) =>
            block.type === "entity-section" &&
            block.heading
              .replace(/\s+\([^)]+\)$/, "")
              .trim()
              .toLowerCase() === detailHeading,
        );
      if (matchingSection) {
        matchingSection.items.push(...splitParagraphs(detail[2]));
        continue;
      }
    }

    flushBullets();
    flushSection();
    note = null;
    if (/^[A-Z][A-Za-z0-9 &/,-]{2,48}:$/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      continue;
    }
    const paragraphs = splitParagraphs(line);
    if (paragraphs.length > 1 && line.length > 220) {
      blocks.push(
        ...paragraphs.map((paragraph) => ({
          type: "paragraph",
          text: paragraph,
        })),
      );
    } else {
      blocks.push({ type: "paragraph", text: line });
    }
  }

  flushBullets();
  flushSection();
  return blocks.length ? blocks : [{ type: "paragraph", text }];
};

export default formatMiraAnswerBlocks;
