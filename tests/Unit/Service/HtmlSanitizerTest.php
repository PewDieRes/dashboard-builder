<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Service;

use DashboardBuilder\Service\HtmlSanitizer;
use PHPUnit\Framework\TestCase;

final class HtmlSanitizerTest extends TestCase
{
    private HtmlSanitizer $htmlSanitizer;

    protected function setUp(): void
    {
        $this->htmlSanitizer = new HtmlSanitizer();
    }

    public function testKeepsAllowedFormatting(): void
    {
        $html = '<p><b>Bold</b> <i>italic</i> <span style="font-size: 24px">big</span></p>';
        self::assertSame($html, $this->htmlSanitizer->sanitize($html));
    }

    public function testRemovesScriptsAndEventHandlers(): void
    {
        $sanitized = $this->htmlSanitizer->sanitize('<p onclick="steal()">Hi<script>alert(1)</script></p>');
        self::assertSame('<p>Hi</p>', $sanitized);
    }

    public function testStripsHtmlComments(): void
    {
        self::assertSame('<p>x</p>', $this->htmlSanitizer->sanitize('<!-- c --><p>x<!-- d --></p>'));
    }

    public function testStripsDangerousStylesButKeepsFontSize(): void
    {
        $sanitized = $this->htmlSanitizer->sanitize('<span style="position: fixed; font-size: 18px">x</span>');
        self::assertSame('<span style="font-size: 18px">x</span>', $sanitized);
    }

    public function testRemovesStyleWithoutValidFontSize(): void
    {
        self::assertSame('<span>x</span>', $this->htmlSanitizer->sanitize('<span style="position: fixed">x</span>'));
        self::assertSame('<span>x</span>', $this->htmlSanitizer->sanitize('<span style="font-size: 500px">x</span>'));
    }

    public function testUnwrapsDisallowedTagsKeepingText(): void
    {
        self::assertSame('<p>link text</p>', $this->htmlSanitizer->sanitize('<p><a href="https://evil">link text</a></p>'));
    }

    public function testRemovesIframeWithContents(): void
    {
        self::assertSame('<p>ok</p>', $this->htmlSanitizer->sanitize('<p>ok</p><iframe src="https://evil">inner</iframe>'));
    }

    public function testKeepsUnicodeText(): void
    {
        self::assertSame('<p>Café ✓</p>', $this->htmlSanitizer->sanitize('<p>Café ✓</p>'));
    }

    public function testEmptyInputStaysEmpty(): void
    {
        self::assertSame('', $this->htmlSanitizer->sanitize(''));
    }
}
