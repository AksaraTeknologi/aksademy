<?php

namespace App\Services;

use DOMDocument;
use DOMElement;
use DOMNode;

class HtmlContentSanitizer
{
    /**
     * Tags that must be removed completely along with their inner contents.
     *
     * @var array<int, string>
     */
    private const DROP_WITH_CONTENT_TAGS = [
        'script',
        'style',
        'iframe',
        'frame',
        'frameset',
        'object',
        'embed',
        'applet',
        'form',
        'input',
        'button',
        'textarea',
        'select',
        'option',
        'svg',
        'math',
        'link',
        'meta',
        'base',
        'noscript',
        'template',
    ];

    /**
     * Allowed HTML tags for lesson rich-text content.
     *
     * @var array<int, string>
     */
    private const ALLOWED_TAGS = [
        'p',
        'br',
        'hr',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'del',
        'mark',
        'blockquote',
        'pre',
        'code',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',
        'span',
        'div',
        'figure',
        'figcaption',
        'sup',
        'sub',
    ];

    /**
     * Allowed attributes per tag (plus global safe attributes).
     *
     * @var array<string, array<int, string>>
     */
    private const ALLOWED_ATTRIBUTES = [
        '*' => ['class', 'title'],
        'a' => ['href', 'target', 'rel'],
        'img' => ['src', 'alt', 'width', 'height'],
        'ol' => ['start', 'type'],
        'th' => ['colspan', 'rowspan', 'scope'],
        'td' => ['colspan', 'rowspan'],
    ];

    public function sanitize(?string $html): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $previousErrorSetting = libxml_use_internal_errors(true);

        $dom = new DOMDocument('1.0', 'UTF-8');
        $wrapped = '<?xml encoding="utf-8" ?><!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><div id="__sanitizer_root__">'
            . $html
            . '</div></body></html>';

        $dom->loadHTML(
            $wrapped,
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
        );

        libxml_clear_errors();
        libxml_use_internal_errors($previousErrorSetting);

        $root = $dom->getElementById('__sanitizer_root__');
        if (! $root) {
            return '';
        }

        $this->sanitizeNode($root);

        $output = '';
        foreach ($root->childNodes as $child) {
            $output .= $dom->saveHTML($child);
        }

        return trim($output);
    }

    private function sanitizeNode(DOMNode $node): void
    {
        $children = [];
        foreach ($node->childNodes as $child) {
            $children[] = $child;
        }

        foreach ($children as $child) {
            if ($child->nodeType === XML_COMMENT_NODE) {
                $node->removeChild($child);
                continue;
            }

            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);

            if (in_array($tag, self::DROP_WITH_CONTENT_TAGS, true)) {
                $node->removeChild($child);
                continue;
            }

            // Sanitize descendants first
            $this->sanitizeNode($child);

            if (! in_array($tag, self::ALLOWED_TAGS, true)) {
                // Unwrap disallowed non-dangerous container tags while preserving safe text/children
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);
                continue;
            }

            $this->sanitizeAttributes($child, $tag);
        }
    }

    private function sanitizeAttributes(DOMElement $element, string $tag): void
    {
        $allowedForTag = array_merge(
            self::ALLOWED_ATTRIBUTES['*'],
            self::ALLOWED_ATTRIBUTES[$tag] ?? []
        );

        $attributesToRemove = [];
        foreach ($element->attributes as $attribute) {
            $attrName = strtolower($attribute->nodeName);

            if (str_starts_with($attrName, 'on') || ! in_array($attrName, $allowedForTag, true)) {
                $attributesToRemove[] = $attribute->nodeName;
                continue;
            }

            if ($attrName === 'href' && ! $this->isSafeUrl($attribute->nodeValue, true)) {
                $attributesToRemove[] = $attribute->nodeName;
            }

            if ($attrName === 'src' && ! $this->isSafeUrl($attribute->nodeValue, false)) {
                $attributesToRemove[] = $attribute->nodeName;
            }
        }

        foreach ($attributesToRemove as $attrName) {
            $element->removeAttribute($attrName);
        }

        if ($tag === 'a') {
            $target = strtolower((string) $element->getAttribute('target'));
            if ($target === '_blank') {
                $element->setAttribute('rel', 'noopener noreferrer');
            } else {
                $element->removeAttribute('target');
            }
        }
    }

    private function isSafeUrl(string $url, bool $allowAnchorAndMailto): bool
    {
        $trimmed = trim($url);
        if ($trimmed === '') {
            return false;
        }

        // Remove control characters and whitespace tricks before checking scheme
        $normalized = preg_replace('/[\x00-\x20\x7F]+/', '', strtolower($trimmed)) ?? '';

        if (str_starts_with($normalized, 'javascript:') || str_starts_with($normalized, 'vbscript:') || str_starts_with($normalized, 'data:')) {
            return false;
        }

        if ($allowAnchorAndMailto && (str_starts_with($trimmed, '#') || str_starts_with($normalized, 'mailto:'))) {
            return true;
        }

        if (str_starts_with($trimmed, '/') && ! str_starts_with($trimmed, '//')) {
            return true;
        }

        $scheme = parse_url($trimmed, PHP_URL_SCHEME);
        if ($scheme === null || $scheme === false) {
            return false;
        }

        return in_array(strtolower($scheme), ['http', 'https'], true);
    }
}
