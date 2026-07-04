export function createImagePlaceholderSrc(path: string | null): string {
  const fileName = (path || "").split(/[\\/]/).pop() || "image.png";
  const label = escapeSvgText(fileName.slice(0, 42));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0f172a"/><path d="M96 338l92-112 72 82 48-56 108 132H96z" fill="#38bdf8"/><circle cx="356" cy="148" r="42" fill="#facc15"/><text x="256" y="444" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="22" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
