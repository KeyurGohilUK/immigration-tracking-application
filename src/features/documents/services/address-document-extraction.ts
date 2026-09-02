export interface ExtractedUkAddress {
  fullAddress: string;
  postcode: string;
}

const UK_POSTCODE_PATTERN =
  /\b(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;

const ADDRESS_HINT_PATTERN =
  /\b(road|rd|street|st|avenue|ave|lane|ln|close|court|ct|drive|dr|way|place|pl|terrace|crescent|cres|gardens|grove|park|square|sq|house|flat|apartment)\b/i;

export async function extractLikelyUkAddressFromPdf(
  file: File,
): Promise<ExtractedUkAddress | null> {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  )
    return null;

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!startsWithPdfHeader(bytes)) return null;

  const textParts = [decodeLatin1(bytes), ...(await decodeFlateStreams(bytes))];
  const tokens = textParts.flatMap(extractPdfTextTokens);
  return findLikelyUkAddress(tokens);
}

export function findLikelyUkAddress(
  tokens: readonly string[],
): ExtractedUkAddress | null {
  const cleaned = tokens
    .map(normalizeToken)
    .filter((token) => token.length >= 2 && token.length <= 100);

  let best: { score: number; value: ExtractedUkAddress } | null = null;

  for (let index = 0; index < cleaned.length; index += 1) {
    const postcodeMatch = cleaned[index]?.match(UK_POSTCODE_PATTERN);
    if (!postcodeMatch) continue;

    const start = Math.max(0, index - 5);
    const candidateParts = cleaned.slice(start, index + 1).filter((part) => {
      const lower = part.toLowerCase();
      return !/^(page|date|statement|account|reference|invoice|bill)\b/.test(
        lower,
      );
    });

    const postcode = normalizePostcode(postcodeMatch[0]);
    const addressParts = candidateParts
      .map((part) => part.replace(UK_POSTCODE_PATTERN, "").trim())
      .filter(Boolean);

    const streetIndex = addressParts.findIndex((part) =>
      ADDRESS_HINT_PATTERN.test(part),
    );
    if (streetIndex < 0) continue;

    const selectedParts = addressParts.slice(Math.max(0, streetIndex - 1));
    const fullAddress = [...selectedParts, postcode]
      .map((part) => part.replace(/^[,\s]+|[,\s]+$/g, ""))
      .filter(Boolean)
      .join(", ");

    const score =
      5 +
      selectedParts.filter((part) => /\d/.test(part)).length +
      selectedParts.filter((part) => ADDRESS_HINT_PATTERN.test(part)).length;

    if (!best || score > best.score)
      best = { score, value: { fullAddress, postcode } };
  }

  return best?.value ?? null;
}

function startsWithPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  return decodeLatin1(bytes.slice(0, 5)) === "%PDF-";
}

async function decodeFlateStreams(bytes: Uint8Array): Promise<string[]> {
  if (typeof DecompressionStream === "undefined") return [];

  const raw = decodeLatin1(bytes);
  const results: string[] = [];
  const streamPattern = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = streamPattern.exec(raw))) {
    const streamStart = match.index + match[0].length;
    const streamEnd = raw.indexOf("endstream", streamStart);
    if (streamEnd < 0) break;

    const dictionaryStart = Math.max(0, raw.lastIndexOf("<<", match.index));
    const dictionary = raw.slice(dictionaryStart, match.index);
    if (!dictionary.includes("/FlateDecode")) {
      streamPattern.lastIndex = streamEnd + 9;
      continue;
    }

    let dataEnd = streamEnd;
    while (
      dataEnd > streamStart &&
      (bytes[dataEnd - 1] === 10 || bytes[dataEnd - 1] === 13)
    )
      dataEnd -= 1;

    try {
      const stream = new Blob([bytes.slice(streamStart, dataEnd)])
        .stream()
        .pipeThrough(new DecompressionStream("deflate"));
      const decoded = await new Response(stream).arrayBuffer();
      results.push(decodeLatin1(new Uint8Array(decoded)));
    } catch {
      // Best-effort extraction: unsupported/corrupt streams simply fall back to manual entry.
    }

    streamPattern.lastIndex = streamEnd + 9;
  }

  return results;
}

function extractPdfTextTokens(source: string): string[] {
  const tokens: string[] = [];
  const literalPattern = /\((?:\\.|[^\\)])*\)/g;
  for (const match of source.matchAll(literalPattern)) {
    const value = decodePdfLiteral(match[0].slice(1, -1));
    if (value.trim()) tokens.push(value);
  }
  return tokens;
}

function decodePdfLiteral(value: string): string {
  return value
    .replace(/\\([nrtbf()\\])/g, (_match, character: string) => {
      const escapes: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      return escapes[character] ?? character;
    })
    .replace(/\\\d{1,3}/g, "");
}

function normalizeToken(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizePostcode(value: string): string {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  return compact.length > 3
    ? `${compact.slice(0, -3)} ${compact.slice(-3)}`
    : compact;
}

function decodeLatin1(bytes: Uint8Array): string {
  return new TextDecoder("latin1").decode(bytes);
}
