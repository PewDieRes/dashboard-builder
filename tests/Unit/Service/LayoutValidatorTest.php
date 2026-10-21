<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Service;

use DashboardBuilder\Service\LayoutValidator;
use PHPUnit\Framework\TestCase;

final class LayoutValidatorTest extends TestCase
{
    private LayoutValidator $layoutValidator;

    protected function setUp(): void
    {
        $this->layoutValidator = new LayoutValidator();
    }

    public static function validLayout(): array
    {
        return [
            'name' => 'Sales Overview',
            'sections' => [[
                'title' => 'Revenue', 'gridColumn' => 1, 'gridRow' => 1, 'columnSpan' => 8, 'rowSpan' => 30,
                'elements' => [
                    ['elementType' => 'chart', 'offsetXPercent' => 0, 'offsetYPercent' => 0, 'widthPercent' => 100, 'heightPercent' => 100, 'zIndex' => 1,
                     'content' => ['chartType' => 'bar', 'title' => 'Revenue', 'labels' => ['Jan', 'Feb'], 'values' => [10, 20.5]]],
                    ['elementType' => 'text', 'offsetXPercent' => 10, 'offsetYPercent' => 10, 'widthPercent' => 50, 'heightPercent' => 20, 'zIndex' => 2,
                     'content' => ['html' => '<p>Hello</p>']],
                    ['elementType' => 'image', 'offsetXPercent' => 0, 'offsetYPercent' => 50, 'widthPercent' => 40, 'heightPercent' => 50, 'zIndex' => 3,
                     'content' => ['imageUrl' => '/uploads/abc.png', 'altText' => 'Logo']],
                ],
            ]],
        ];
    }

    public function testValidLayoutHasNoErrors(): void
    {
        self::assertSame([], $this->layoutValidator->validate(self::validLayout()));
    }

    public function testMissingNameIsReported(): void
    {
        $layout = self::validLayout();
        $layout['name'] = '   ';
        self::assertArrayHasKey('name', $this->layoutValidator->validate($layout));
    }

    public function testSectionOverflowingGridIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['gridColumn'] = 6;
        $layout['sections'][0]['columnSpan'] = 8;
        self::assertArrayHasKey('sections.0.columnSpan', $this->layoutValidator->validate($layout));
    }

    public function testElementOutsideSectionIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][1]['offsetXPercent'] = 70;
        self::assertArrayHasKey('sections.0.elements.1.widthPercent', $this->layoutValidator->validate($layout));
    }

    public function testNegativeOffsetIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][1]['offsetYPercent'] = -5;
        self::assertArrayHasKey('sections.0.elements.1.offsetYPercent', $this->layoutValidator->validate($layout));
    }

    public function testChartLabelValueMismatchIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][0]['content']['values'] = [1];
        self::assertArrayHasKey('sections.0.elements.0.content.values', $this->layoutValidator->validate($layout));
    }

    public function testUnknownElementTypeIsReported(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][0]['elementType'] = 'video';
        self::assertArrayHasKey('sections.0.elements.0.elementType', $this->layoutValidator->validate($layout));
    }

    public function testExternalHttpImageUrlIsRejected(): void
    {
        $layout = self::validLayout();
        $layout['sections'][0]['elements'][2]['content']['imageUrl'] = 'javascript:alert(1)';
        self::assertArrayHasKey('sections.0.elements.2.content.imageUrl', $this->layoutValidator->validate($layout));
    }

    public function testWrongTypesProduceErrorsInsteadOfExceptions(): void
    {
        $errors = $this->layoutValidator->validate(['name' => 42, 'sections' => 'nope']);
        self::assertArrayHasKey('name', $errors);
        self::assertArrayHasKey('sections', $errors);
    }

    public function testMalformedNestedStructuresProduceErrorsInsteadOfExceptions(): void
    {
        $errors = $this->layoutValidator->validate(['name' => 'Ok', 'sections' => ['text', [
            'title' => 1, 'gridColumn' => '1', 'gridRow' => 1.5, 'columnSpan' => null, 'rowSpan' => 1, 'elements' => [7],
        ]]]);
        self::assertArrayHasKey('sections.0', $errors);
        self::assertArrayHasKey('sections.1.title', $errors);
        self::assertArrayHasKey('sections.1.gridColumn', $errors);
        self::assertArrayHasKey('sections.1.elements.0', $errors);
    }

    public function testDashboardNameValidationOnly(): void
    {
        self::assertSame([], $this->layoutValidator->validateDashboardName(['name' => 'Ops']));
        self::assertArrayHasKey('name', $this->layoutValidator->validateDashboardName([]));
    }
}
