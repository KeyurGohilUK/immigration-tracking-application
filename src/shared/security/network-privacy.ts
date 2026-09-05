export interface ObservedNetworkRequest {
  url: string;
  headers: Record<string, string>;
  postData: string | null;
}

function decodeRepeatedly(value: string): string {
  let decoded = value;
  for (let index = 0; index < 2; index += 1) {
    try {
      const next = decodeURIComponent(decoded.replace(/\+/g, " "));
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
}

function requestHaystack(request: ObservedNetworkRequest): string {
  return [
    request.url,
    decodeRepeatedly(request.url),
    ...Object.entries(request.headers).flatMap(([name, value]) => [
      name,
      value,
      decodeRepeatedly(value),
    ]),
    request.postData ?? "",
    decodeRepeatedly(request.postData ?? ""),
  ]
    .join("\n")
    .toLowerCase();
}

export function findSensitiveNetworkLeak(
  request: ObservedNetworkRequest,
  sensitiveValues: readonly string[],
): string | null {
  const haystack = requestHaystack(request);
  for (const value of sensitiveValues) {
    const normalized = value.trim().toLowerCase();
    if (normalized.length > 0 && haystack.includes(normalized)) return value;
  }
  return null;
}
