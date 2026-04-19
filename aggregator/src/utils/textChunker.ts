export function chunkText(
  text: string,
  opts?: {
    maxChars?: number;
    overlapChars?: number;
  },
): string[] {
  const maxChars = opts?.maxChars ?? 1800;
  const overlapChars = opts?.overlapChars ?? 150;

  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .trim();

  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    const trimmed = current.trim();
    if (!trimmed) return;
    chunks.push(trimmed);
  };

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      pushCurrent();
      const overlap =
        overlapChars > 0 ? current.slice(Math.max(0, current.length - overlapChars)) : "";
      current = overlap ? `${overlap}\n\n${para}` : para;
    } else {
      // Single giant paragraph: hard-split.
      let i = 0;
      while (i < para.length) {
        const slice = para.slice(i, i + maxChars);
        chunks.push(slice.trim());
        i += Math.max(1, maxChars - overlapChars);
      }
      current = "";
    }
  }

  pushCurrent();
  return chunks;
}

