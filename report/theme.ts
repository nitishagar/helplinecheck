/**
 * Shared pi.dev-inspired theme: warm paper, graph grid, serif display type,
 * one teal accent. Inline CSS only — zero external requests (see report
 * tests). Used by the landing page and the HTML report.
 */
export const THEME = [
  "html{background:#f4f1ea}",
  "body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2a2825;line-height:1.55}",
  "body{background-image:linear-gradient(rgba(70,63,50,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(70,63,50,.08) 1px,transparent 1px);background-size:28px 28px}",
  "main{max-width:880px;margin:0 auto;padding:2.5rem 1.25rem 4rem}",
  ".narrow main{max-width:680px}",
  "h1{font-family:Georgia,'Iowan Old Style','Times New Roman',serif;font-style:italic;font-weight:500;font-size:2rem;line-height:1.2;margin:.6rem 0 1rem}",
  "h2{font-family:Georgia,'Iowan Old Style','Times New Roman',serif;font-weight:600;font-size:1.25rem;margin:2.2rem 0 .8rem}",
  ".mark{display:inline-block;width:11px;height:11px;background:#0d8aa0;box-shadow:13px 0 0 #0d8aa0,26px 0 0 #0d8aa0,39px 0 0 #0d8aa0;opacity:.85}",
  "p.lede{font-size:1.08rem}",
  "a{color:#0b6e80;text-decoration:underline;text-underline-offset:2px}",
  "code{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:.86em;background:#e9e3d6;padding:.05rem .3rem;border-radius:3px}",
  "pre{font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:.82rem;background:#2a2825;color:#f4f1ea;padding:1rem 1.2rem;border-radius:6px;overflow-x:auto;white-space:pre-wrap;word-break:break-word}",
  "pre code{background:none;padding:0}",
  "table{border-collapse:collapse;width:100%;font-size:.9rem}",
  "thead th{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#6b655a;font-weight:600;text-align:left;padding:.4rem .6rem;border-bottom:2px solid #2a2825}",
  "tbody td{padding:.55rem .6rem;border-bottom:1px solid #d8d2c2;vertical-align:top}",
  ".badge{font-size:.72rem;font-weight:700;letter-spacing:.04em;padding:.12rem .55rem;border-radius:999px;white-space:nowrap}",
  ".pass{background:#e0ebda;color:#1e5631}.fail{background:#f3dcd6;color:#8c1d18}.contested{background:#f4e8c8;color:#7a5410}",
  "blockquote{background:#eae4d4;margin:.5rem 0;padding:.4rem .8rem;border-top:1px solid #cfc7b0;border-bottom:1px solid #cfc7b0;font-size:.86rem}",
  ".banner{background:#f6ecd2;border:1px solid #b49b5e;padding:.8rem 1rem;border-radius:6px}",
  "footer{margin-top:2.5rem;font-size:.8rem;color:#6b655a;border-top:1px solid #cfc7b0;padding-top:1rem}",
  ".kv{display:grid;grid-template-columns:180px 1fr;gap:.25rem .8rem;font-size:.9rem}",
  "ul.tight li{margin:.3rem 0}",
].join("");
