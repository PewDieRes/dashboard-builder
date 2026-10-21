<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Metrics;

use DashboardBuilder\Metrics\DailyVisitorsMetric;
use PHPUnit\Framework\TestCase;
use Random\Engine\Mt19937;
use Random\Randomizer;

final class DailyVisitorsMetricTest extends TestCase
{
    private static function createMetric(string $now = '2026-05-20 08:00:00', int $seed = 42): DailyVisitorsMetric
    {
        return new DailyVisitorsMetric(new Randomizer(new Mt19937($seed)), new \DateTimeImmutable($now));
    }

    public function testDescribesItself(): void
    {
        $metric = self::createMetric();
        self::assertSame('daily-visitors', $metric->key());
        self::assertSame('Daily Visitors', $metric->title());
        self::assertSame('line', $metric->chartType());
    }

    public function testLabelsAreTheLastSevenWeekdaysEndingToday(): void
    {
        $series = self::createMetric('2026-05-20 08:00:00')->generate();
        self::assertSame(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'], $series->labels);
    }

    public function testValuesAreIntegersWithinRange(): void
    {
        foreach ([1, 2, 3, 4, 5] as $seed) {
            $series = self::createMetric(seed: $seed)->generate();
            self::assertCount(7, $series->values);
            foreach ($series->values as $value) {
                self::assertIsInt($value);
                self::assertGreaterThanOrEqual(700, $value);
                self::assertLessThanOrEqual(1500, $value);
            }
        }
    }

    public function testSameSeedProducesSameSeries(): void
    {
        self::assertEquals(self::createMetric()->generate(), self::createMetric()->generate());
    }

    public function testDifferentSeedsProduceDifferentValues(): void
    {
        self::assertNotSame(self::createMetric(seed: 1)->generate()->values, self::createMetric(seed: 2)->generate()->values);
    }
}
