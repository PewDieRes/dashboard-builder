<?php

declare(strict_types=1);

namespace DashboardBuilder\Metrics;

use Random\Randomizer;

final class DailyVisitorsMetric implements MetricGenerator
{
    private const DAY_COUNT = 7;
    private const MINIMUM_VISITORS = 700;
    private const MAXIMUM_VISITORS = 1500;

    public function __construct(
        private readonly Randomizer $randomizer,
        private readonly \DateTimeImmutable $now,
    ) {
    }

    public function key(): string
    {
        return 'daily-visitors';
    }

    public function title(): string
    {
        return 'Daily Visitors';
    }

    public function chartType(): string
    {
        return 'line';
    }

    public function generate(): MetricSeries
    {
        $labels = [];
        $values = [];

        for ($daysAgo = self::DAY_COUNT - 1; $daysAgo >= 0; $daysAgo--) {
            $labels[] = $this->now->modify("-$daysAgo days")->format('D');
            $values[] = $this->randomizer->getInt(self::MINIMUM_VISITORS, self::MAXIMUM_VISITORS);
        }

        return new MetricSeries($labels, $values, $this->now);
    }
}
