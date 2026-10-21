<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Controller;

use DashboardBuilder\Controller\MetricController;
use DashboardBuilder\Http\NotFoundException;
use DashboardBuilder\Http\Request;
use DashboardBuilder\Metrics\DailyVisitorsMetric;
use DashboardBuilder\Metrics\MetricRegistry;
use DashboardBuilder\Metrics\MonthlyRevenueMetric;
use PHPUnit\Framework\TestCase;
use Random\Engine\Mt19937;
use Random\Randomizer;

final class MetricControllerTest extends TestCase
{
    private MetricController $metricController;

    protected function setUp(): void
    {
        $randomizer = new Randomizer(new Mt19937(42));
        $now = new \DateTimeImmutable('2026-05-20 08:00:00');
        $this->metricController = new MetricController(new MetricRegistry([
            new MonthlyRevenueMetric($randomizer, $now),
            new DailyVisitorsMetric($randomizer, $now),
        ]));
    }

    public function testListDescribesEveryMetric(): void
    {
        $response = $this->metricController->list(new Request('GET', '/api/metrics'), []);

        self::assertSame(200, $response->statusCode());
        self::assertSame([
            'metrics' => [
                ['key' => 'monthly-revenue', 'title' => 'Monthly Revenue (k)', 'chartType' => 'bar'],
                ['key' => 'daily-visitors', 'title' => 'Daily Visitors', 'chartType' => 'line'],
            ],
        ], $response->payload());
    }

    public function testShowReturnsGeneratedSeries(): void
    {
        $response = $this->metricController->show(
            new Request('GET', '/api/metrics/daily-visitors'),
            ['metricKey' => 'daily-visitors'],
        );

        $payload = $response->payload();
        self::assertSame(['key', 'title', 'chartType', 'labels', 'values', 'generatedAt'], array_keys($payload));
        self::assertSame('daily-visitors', $payload['key']);
        self::assertCount(7, $payload['labels']);
        self::assertSame('2026-05-20T08:00:00+00:00', $payload['generatedAt']);
    }

    public function testShowThrowsNotFoundForUnknownMetric(): void
    {
        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Metric not found');
        $this->metricController->show(new Request('GET', '/api/metrics/unknown'), ['metricKey' => 'unknown']);
    }
}
