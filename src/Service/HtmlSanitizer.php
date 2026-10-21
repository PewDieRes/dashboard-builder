<?php

declare(strict_types=1);

namespace DashboardBuilder\Service;

final class HtmlSanitizer
{
    private const ALLOWED_TAGS = ['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'span'];
    private const REMOVED_WITH_CONTENTS_TAGS = ['script', 'style', 'iframe', 'object'];
    private const MINIMUM_FONT_SIZE_PIXELS = 8;
    private const MAXIMUM_FONT_SIZE_PIXELS = 72;
    private const FONT_SIZE_PATTERN = '/(?:^|;)\s*font-size\s*:\s*(\d{1,3})px\s*(?:;|$)/i';

    public function sanitize(string $html): string
    {
        if (trim($html) === '') {
            return '';
        }

        $document = new \DOMDocument();
        $previousErrorHandling = libxml_use_internal_errors(true);
        $document->loadHTML(
            '<?xml encoding="utf-8"><div>' . $html . '</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previousErrorHandling);

        $rootElement = $document->documentElement;
        $this->sanitizeChildren($rootElement);

        return $this->innerHtml($rootElement);
    }

    private function sanitizeChildren(\DOMElement $parentElement): void
    {
        foreach (iterator_to_array($parentElement->childNodes) as $childNode) {
            if (!$childNode instanceof \DOMElement) {
                continue;
            }
            $this->sanitizeElement($childNode);
        }
    }

    private function sanitizeElement(\DOMElement $element): void
    {
        $tagName = strtolower($element->tagName);

        if (in_array($tagName, self::REMOVED_WITH_CONTENTS_TAGS, true)) {
            $element->parentNode->removeChild($element);
            return;
        }

        $this->sanitizeChildren($element);

        if (!in_array($tagName, self::ALLOWED_TAGS, true)) {
            $this->unwrap($element);
            return;
        }

        $this->sanitizeAttributes($element, $tagName);
    }

    private function unwrap(\DOMElement $element): void
    {
        $parentNode = $element->parentNode;

        while ($element->firstChild !== null) {
            $parentNode->insertBefore($element->firstChild, $element);
        }
        $parentNode->removeChild($element);
    }

    private function sanitizeAttributes(\DOMElement $element, string $tagName): void
    {
        $fontSizeStyle = $tagName === 'span' ? $this->extractFontSizeStyle($element->getAttribute('style')) : null;

        foreach (iterator_to_array($element->attributes) as $attribute) {
            $element->removeAttributeNode($attribute);
        }

        if ($fontSizeStyle !== null) {
            $element->setAttribute('style', $fontSizeStyle);
        }
    }

    private function extractFontSizeStyle(string $style): ?string
    {
        if (preg_match(self::FONT_SIZE_PATTERN, $style, $matches) !== 1) {
            return null;
        }

        $fontSizePixels = (int) $matches[1];
        if ($fontSizePixels < self::MINIMUM_FONT_SIZE_PIXELS || $fontSizePixels > self::MAXIMUM_FONT_SIZE_PIXELS) {
            return null;
        }

        return "font-size: {$fontSizePixels}px";
    }

    private function innerHtml(\DOMElement $rootElement): string
    {
        $html = '';
        foreach ($rootElement->childNodes as $childNode) {
            $html .= $rootElement->ownerDocument->saveHTML($childNode);
        }

        return $html;
    }
}
