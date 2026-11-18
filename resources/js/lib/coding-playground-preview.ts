export interface PreviewCodeInput {
    html: string;
    css: string;
    js: string;
}

export const PREVIEW_SANDBOX_ATTRIBUTES = 'allow-scripts';

export const PREVIEW_CONTENT_SECURITY_POLICY = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    'img-src data: blob: https:',
    'font-src data:',
    "connect-src 'none'",
    "frame-src 'none'",
    "child-src 'none'",
    "worker-src 'none'",
    "media-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
].join('; ');

function escapeClosingTag(source: string, tagName: string): string {
    const regex = new RegExp(`</(${tagName})`, 'gi');
    return source.replace(regex, '<\\/$1');
}

/**
 * Build an isolated HTML document string for the Coding Playground preview iframe.
 * Designed strictly for srcDoc + sandbox="allow-scripts" (without allow-same-origin).
 */
export function buildPreviewDocument({ html, css, js }: PreviewCodeInput): string {
    const safeCss = escapeClosingTag(css || '', 'style');
    const safeJs = escapeClosingTag(js || '', 'script');
    const userHtml = html || '';

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CONTENT_SECURITY_POLICY}" />
<style>
*, *::before, *::after { box-sizing: border-box; }
body {
    margin: 0;
    padding: 16px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    color: #111827;
    background-color: #ffffff;
}
#__playground_error_banner__ {
    display: none;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 12px;
    z-index: 2147483647;
    padding: 10px 14px;
    border-radius: 8px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
<style>${safeCss}</style>
</head>
<body>
${userHtml}
<div id="__playground_error_banner__" role="alert"></div>
<script>
(function () {
    var banner = document.getElementById('__playground_error_banner__');
    function showError(message) {
        if (!banner) return;
        banner.style.display = 'block';
        banner.textContent = 'Runtime Error: ' + message;
    }
    window.addEventListener('error', function (event) {
        var msg = event && event.message ? event.message : 'Terjadi kesalahan pada script';
        showError(msg);
    });
    window.addEventListener('unhandledrejection', function (event) {
        var reason = event && event.reason && event.reason.message
            ? event.reason.message
            : String((event && event.reason) || 'Unhandled promise rejection');
        showError(reason);
    });
})();
</script>
<script>
${safeJs}
</script>
</body>
</html>`;
}
