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

const LINKED_CSS_REGEX = /<link\b[^>]*\bhref\s*=\s*["'](?:\.\/|\/)?style\.css(?:\?[^"']*)?["'][^>]*\/?>/gi;
const LINKED_JS_REGEX = /<script\b([^>]*)\bsrc\s*=\s*["'](?:\.\/|\/)?script\.js(?:\?[^"']*)?["']([^>]*)>\s*<\/script>/gi;

function escapeClosingTag(source: string, tagName: string): string {
    const regex = new RegExp(`</(${tagName})`, 'gi');
    return source.replace(regex, '<\\/$1');
}

function resolveVirtualLinks(
    rawHtml: string,
    safeCss: string,
    safeJs: string,
): { html: string; cssLinkedInHtml: boolean; jsLinkedInHtml: boolean } {
    let cssLinkedInHtml = false;
    let jsLinkedInHtml = false;

    let resolvedHtml = rawHtml.replace(LINKED_CSS_REGEX, () => {
        cssLinkedInHtml = true;
        return safeCss.trim() ? `<style>\n${safeCss}\n</style>` : '';
    });

    resolvedHtml = resolvedHtml.replace(LINKED_JS_REGEX, (_match, beforeAttr: string, afterAttr: string) => {
        jsLinkedInHtml = true;
        if (!safeJs.trim()) {
            return '';
        }
        const combinedAttrs = `${beforeAttr || ''} ${afterAttr || ''}`;
        const hasDefer = /\bdefer\b/i.test(combinedAttrs);
        if (hasDefer) {
            return `<script>\ndocument.addEventListener('DOMContentLoaded', function () {\n${safeJs}\n});\n</script>`;
        }
        return `<script>\n${safeJs}\n</script>`;
    });

    return {
        html: resolvedHtml,
        cssLinkedInHtml,
        jsLinkedInHtml,
    };
}

/**
 * Build an isolated HTML document string for the Coding Playground preview iframe.
 * Designed strictly for srcDoc + sandbox="allow-scripts" (without allow-same-origin).
 * Supports virtual file linking (`style.css`, `script.js`) and in-iframe console output.
 */
export function buildPreviewDocument({ html, css, js }: PreviewCodeInput): string {
    const safeCss = escapeClosingTag(css || '', 'style');
    const safeJs = escapeClosingTag(js || '', 'script');
    const rawHtml = html || '';

    const { html: resolvedHtml, cssLinkedInHtml, jsLinkedInHtml } = resolveVirtualLinks(rawHtml, safeCss, safeJs);

    const autoCssBlock = !cssLinkedInHtml && safeCss.trim() ? `<style>${safeCss}</style>` : '';
    const autoJsBlock = !jsLinkedInHtml && safeJs.trim() ? `<script>\n${safeJs}\n</script>` : '';

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
#__playground_console__ {
    display: none;
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483647;
    background: #0f172a;
    color: #e2e8f0;
    border-top: 1px solid #334155;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.16);
}
#__playground_console_header__ {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    font-size: 11px;
    font-weight: 600;
    color: #cbd5e1;
}
#__playground_console_actions__ {
    display: flex;
    align-items: center;
    gap: 8px;
}
.pg-console-btn {
    background: transparent;
    color: #94a3b8;
    border: 1px solid #475569;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    cursor: pointer;
    font-family: inherit;
}
.pg-console-btn:hover {
    color: #f8fafc;
    border-color: #64748b;
}
#__playground_console_logs__ {
    max-height: 36vh;
    overflow-y: auto;
}
#__playground_console__.is-collapsed #__playground_console_logs__ {
    display: none;
}
.pg-log-row {
    padding: 5px 12px;
    border-bottom: 1px solid rgba(51, 65, 85, 0.6);
    white-space: pre-wrap;
    word-break: break-word;
    display: flex;
    gap: 8px;
}
.pg-log-prefix {
    opacity: 0.65;
    user-select: none;
    flex-shrink: 0;
}
.pg-log-log { color: #e2e8f0; }
.pg-log-info { color: #7dd3fc; background: rgba(14, 165, 233, 0.08); }
.pg-log-warn { color: #fcd34d; background: rgba(245, 158, 11, 0.12); }
.pg-log-error { color: #fca5a5; background: rgba(239, 68, 68, 0.15); }
</style>
<script>
(function () {
    var pendingLogs = [];
    var totalCount = 0;
    var rootEl = null;
    var listEl = null;
    var titleEl = null;
    var toggleBtnEl = null;

    function formatValue(val) {
        if (val === null) return 'null';
        if (val === undefined) return 'undefined';
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'bigint') return String(val);
        if (typeof val === 'symbol') return val.toString();
        if (typeof val === 'function') return '[Function: ' + (val.name || 'anonymous') + ']';
        if (val instanceof Error) return (val.name || 'Error') + ': ' + val.message;
        if (typeof HTMLElement !== 'undefined' && val instanceof HTMLElement) {
            return '<' + val.tagName.toLowerCase() + (val.id ? '#' + val.id : '') + '>';
        }
        try {
            var seen = [];
            return JSON.stringify(val, function (_k, v) {
                if (typeof v === 'object' && v !== null) {
                    if (seen.indexOf(v) !== -1) return '[Circular]';
                    seen.push(v);
                }
                return v;
            }, 2);
        } catch (_e) {
            return String(val);
        }
    }

    function ensureElements() {
        if (!rootEl) rootEl = document.getElementById('__playground_console__');
        if (!listEl) listEl = document.getElementById('__playground_console_logs__');
        if (!titleEl) titleEl = document.getElementById('__playground_console_title__');
        if (!toggleBtnEl) toggleBtnEl = document.getElementById('__playground_console_toggle__');
        return Boolean(rootEl && listEl);
    }

    function appendEntry(level, text) {
        if (!ensureElements()) {
            pendingLogs.push({ level: level, text: text });
            return;
        }
        totalCount += 1;
        rootEl.style.display = 'block';
        if (titleEl) {
            titleEl.textContent = 'Console (' + totalCount + ')';
        }
        var row = document.createElement('div');
        row.className = 'pg-log-row pg-log-' + level;
        var prefix = document.createElement('span');
        prefix.className = 'pg-log-prefix';
        prefix.textContent = level === 'error' ? '✕' : level === 'warn' ? '!' : '›';
        var msg = document.createElement('span');
        msg.textContent = text;
        row.appendChild(prefix);
        row.appendChild(msg);
        listEl.appendChild(row);
        listEl.scrollTop = listEl.scrollHeight;
        document.body.style.paddingBottom = Math.min(260, rootEl.offsetHeight + 16) + 'px';
    }

    function clearLogs() {
        pendingLogs = [];
        totalCount = 0;
        if (listEl) listEl.textContent = '';
        if (titleEl) titleEl.textContent = 'Console (0)';
        if (rootEl) rootEl.style.display = 'none';
        if (document.body) document.body.style.paddingBottom = '16px';
    }

    function flushPending() {
        if (!ensureElements()) return;
        for (var i = 0; i < pendingLogs.length; i++) {
            appendEntry(pendingLogs[i].level, pendingLogs[i].text);
        }
        pendingLogs = [];
    }

    var origLog = console.log;
    var origInfo = console.info;
    var origWarn = console.warn;
    var origError = console.error;
    var origClear = console.clear;

    function wrapConsole(level, originalFn) {
        return function () {
            var parts = [];
            for (var i = 0; i < arguments.length; i++) {
                parts.push(formatValue(arguments[i]));
            }
            appendEntry(level, parts.join(' '));
            if (typeof originalFn === 'function') {
                originalFn.apply(console, arguments);
            }
        };
    }

    console.log = wrapConsole('log', origLog);
    console.info = wrapConsole('info', origInfo);
    console.warn = wrapConsole('warn', origWarn);
    console.error = wrapConsole('error', origError);
    console.clear = function () {
        clearLogs();
        if (typeof origClear === 'function') {
            origClear.apply(console, arguments);
        }
    };

    window.addEventListener('error', function (event) {
        var msg = event && event.message ? event.message : 'Terjadi kesalahan pada script';
        appendEntry('error', 'Runtime Error: ' + msg);
    });

    window.addEventListener('unhandledrejection', function (event) {
        var reason = event && event.reason && event.reason.message
            ? event.reason.message
            : String((event && event.reason) || 'Unhandled promise rejection');
        appendEntry('error', 'Runtime Error: ' + reason);
    });

    document.addEventListener('DOMContentLoaded', function () {
        flushPending();
        var clearBtn = document.getElementById('__playground_console_clear__');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearLogs);
        }
        if (toggleBtnEl && rootEl) {
            toggleBtnEl.addEventListener('click', function () {
                var collapsed = rootEl.classList.toggle('is-collapsed');
                toggleBtnEl.textContent = collapsed ? 'Tampilkan' : 'Sembunyikan';
                document.body.style.paddingBottom = Math.min(260, rootEl.offsetHeight + 16) + 'px';
            });
        }
    });
})();
</script>
${autoCssBlock}
</head>
<body>
${resolvedHtml}
<div id="__playground_console__" role="region" aria-label="JavaScript Console">
    <div id="__playground_console_header__">
        <span id="__playground_console_title__">Console (0)</span>
        <div id="__playground_console_actions__">
            <button type="button" id="__playground_console_clear__" class="pg-console-btn">Clear</button>
            <button type="button" id="__playground_console_toggle__" class="pg-console-btn">Sembunyikan</button>
        </div>
    </div>
    <div id="__playground_console_logs__" role="log" aria-live="polite"></div>
</div>
${autoJsBlock}
</body>
</html>`;
}
