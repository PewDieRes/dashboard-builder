<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Metrics;

use DashboardBuilder\Metrics\DailyVisitorsMetric;
use DashboardBuilder\Metrics\MetricRegistry;
use DashboardBuilder\Metrics\MonthlyRevenueMetric;
use PHPUnit\Framework\TestCase;
use Random\Engine\Mt19937;
use Random\Randomizer;

final class MetricRegistryTest extends TestCase
{
    private MonthlyRevenueMetric $monthlyRevenueMetric;
    private DailyVisitorsMetric $dailyVisitorsMetric;
    private MetricRegistry $metricRegistry;

    protected function setUp(): void
    {
        $randomizer = new Randomizer(new Mt19937(42));
        $now = new \DateTimeImmutable('2026-05-20 08:00:00');
        $this->monthlyRevenueMetric = new MonthlyRevenueMetric($randomizer, $now);
        $this->dailyVisitorsMetric = new DailyVisitorsMetric($randomizer, $now);
        $this->metricRegistry = new MetricRegistry([$this->monthlyRevenueMetric, $this->dailyVisitorsMetric]);
    }

    public function testAllReturnsGeneratorsInRegistrationOrder(): void
    {
        self::assertSame([$this->monthlyRevenueMetric, $this->dailyVisitorsMetric], $this->metricRegistry->all());
    }

    public function testFindReturnsGeneratorByKey(): void
    {
        self::assertSame($this->dailyVisitorsMetric, $this->metricRegistry->find('daily-visitors'));
    }

    public function testFindReturnsNullForUnknownKey(): void
    {
        self::assertNull($this->metricRegistry->find('unknown'));
    }
}
