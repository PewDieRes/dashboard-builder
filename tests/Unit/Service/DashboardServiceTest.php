<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Service;

use DashboardBuilder\Http\NotFoundException;
use DashboardBuilder\Http\ValidationException;
use DashboardBuilder\Service\DashboardService;
use DashboardBuilder\Service\HtmlSanitizer;
use DashboardBuilder\Service\LayoutValidator;
use DashboardBuilder\Tests\Support\InMemoryDashboardRepository;
use PHPUnit\Framework\TestCase;

final class DashboardServiceTest extends TestCase
{
    private DashboardService $dashboardService;

    protected function setUp(): void
    {
        $this->dashboardService = new DashboardService(
            new InMemoryDashboardRepository(),
            new LayoutValidator(),
            new HtmlSanitizer(),
        );
    }

    public function testSaveLayoutSanitizesTextHtml(): void
    {
        $dashboard = $this->dashboardService->createDashboard(['name' => 'Sales']);
        $layout = LayoutValidatorTest::validLayout();
        $layout['sections'][0]['elements'][1]['content']['html'] = '<p>Hi<script>x</script></p>';

        $saved = $this->dashboardService->saveLayout($dashboard->id, $layout);

        self::assertSame('<p>Hi</p>', $saved->sections[0]->elements[1]->content['html']);
    }

    public function testSaveLayoutKeepsNonTextContentUntouched(): void
    {
        $dashboard = $this->dashboardService->createDashboard(['name' => 'Sales']);

        $saved = $this->dashboardService->saveLayout($dashboard->id, LayoutValidatorTest::validLayout());

        self::assertSame(['Jan', 'Feb'], $saved->sections[0]->elements[0]->content['labels']);
        self::assertSame($dashboard->id, $saved->id);
    }

    public function testSaveLayoutDropsUnknownContentKeys(): void
    {
        $dashboard = $this->dashboardService->createDashboard(['name' => 'Sales']);
        $layout = LayoutValidatorTest::validLayout();
        foreach ([0, 1, 2] as $elementIndex) {
            $layout['sections'][0]['elements'][$elementIndex]['content']['injected'] = str_repeat('x', 100);
        }

        $saved = $this->dashboardService->saveLayout($dashboard->id, $layout);

        $elements = $saved->sections[0]->elements;
        self::assertSame(['chartType', 'title', 'labels', 'values'], array_keys($elements[0]->content));
        self::assertSame(['html'], array_keys($elements[1]->content));
        self::assertSame(['imageUrl', 'altText'], array_keys($elements[2]->content));
    }

    public function testSaveLayoutKeepsChartDataSource(): void
    {
        $dashboard = $this->dashboardService->createDashboard(['name' => 'Sales']);
        $layout = LayoutValidatorTest::validLayout();
        $layout['sections'][0]['elements'][0]['content']['dataSource'] = 'monthly-revenue';

        $saved = $this->dashboardService->saveLayout($dashboard->id, $layout);

        self::assertSame('monthly-revenue', $saved->sections[0]->elements[0]->content['dataSource']);
    }

    public function testSaveLayoutRejectsInvalidPayload(): void
    {
        $dashboard = $this->dashboardService->createDashboard(['name' => 'Sales']);
        $layout = LayoutValidatorTest::validLayout();
        $layout['sections'][0]['gridColumn'] = 0;

        try {
            $this->dashboardService->saveLayout($dashboard->id, $layout);
            self::fail('Expected ValidationException');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('sections.0.gridColumn', $exception->details());
        }
    }

    public function testSaveLayoutForMissingDashboardThrowsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->dashboardService->saveLayout(999, LayoutValidatorTest::validLayout());
    }

    public function testGetDashboardForMissingIdThrowsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        $this->dashboardService->getDashboard(999);
    }

    public function testCreateDashboardTrimsName(): void
    {
        self::assertSame('Ops', $this->dashboardService->createDashboard(['name' => '  Ops  '])->name);
    }

    public function testCreateDashboardRejectsEmptyName(): void
    {
        try {
            $this->dashboardService->createDashboard(['name' => '   ']);
            self::fail('Expected ValidationException');
        } catch (ValidationException $exception) {
            self::assertArrayHasKey('name', $exception->details());
        }
    }

    public function testListDashboardsReturnsCreatedDashboards(): void
    {
        $this->dashboardService->createDashboard(['name' => 'First']);

        self::assertCount(1, $this->dashboardService->listDashboards());
    }
}
