<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Metrics;

use DashboardBuilder\Metrics\MonthlyRevenueMetric;
use PHPUnit\Framework\TestCase;
use Random\Engine\Mt19937;
use Random\Randomizer;

final class MonthlyRevenueMetricTest extends TestCase
{
    private static function createMetric(string $now = '2026-05-31 10:00:00', int $seed = 42): MonthlyRevenueMetric
    {
        return new MonthlyRevenueMetric(new Randomizer(new Mt19937($seed)), new \DateTimeImmutable($now));
    }

    public function testDescribesItself(): void
    {
        $metric = self::createMetric();
        self::assertSame('monthly-revenue', $metric->key());
        self::assertSame('Monthly Revenue (k)', $metric->title());
        self::assertSame('bar', $metric->chartType());
    }

    public function testLabelsAreTheLastSixMonthsEndingWithTheCurrentMonth(): void
    {
        $series = self::createMetric('2026-05-31 10:00:00')->generate();
        self::assertSame(['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'], $series->labels);
    }

    public function testValuesAreIntegersWithinRange(): void
    {
        foreach ([1, 2, 3, 4, 5] as $seed) {
            $series = self::createMetric(seed: $seed)->generate();
            self::assertCount(6, $series->values);
            foreach ($series->values as $value) {
                self::assertIsInt($value);
                self::assertGreaterThanOrEqual(100, $value);
                self::assertLessThanOrEqual(250, $value);
            }
        }
    }

    public function testValuesFormASmoothWalk(): void
    {
        $values = self::createMetric()->generate()->values;
        for ($valueIndex = 1; $valueIndex < count($values); $valueIndex++) {
            self::assertLessThanOrEqual(30, abs($values[$valueIndex] - $values[$valueIndex - 1]));
        }
    }

    public function testSameSeedProducesSameSeries(): void
    {
        self::assertEquals(self::createMetric()->generate(), self::createMetric()->generate());
    }

    public function testReportsGenerationTime(): void
    {
        self::assertSame('2026-05-31T10:00:00+00:00', self::createMetric()->generate()->toArray()['generatedAt']);
    }
}
