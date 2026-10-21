<?php

declare(strict_types=1);

namespace DashboardBuilder\Metrics;

use Random\Randomizer;

final class MonthlyRevenueMetric implements MetricGenerator
{
    private const MONTH_COUNT = 6;
    private const MINIMUM_REVENUE = 100;
    private const MAXIMUM_REVENUE = 250;
    private const MAXIMUM_MONTHLY_CHANGE = 30;

    public function __construct(
        private readonly Randomizer $randomizer,
        private readonly \DateTimeImmutable $now,
    ) {
    }

    public function key(): string
    {
        return 'monthly-revenue';
    }

    public function title(): string
    {
        return 'Monthly Revenue (k)';
    }

    public function chartType(): string
    {
        return 'bar';
    }

    public function generate(): MetricSeries
    {
        return new MetricSeries($this->lastMonthNames(), $this->generateRandomWalk(), $this->now);
    }

    /** @return list<string> */
    private function lastMonthNames(): array
    {
        $currentMonthStart = $this->now->modify('first day of this month');
        $monthNames = [];

        for ($monthsAgo = self::MONTH_COUNT - 1; $monthsAgo >= 0; $monthsAgo--) {
            $monthNames[] = $currentMonthStart->modify("-$monthsAgo months")->format('M');
        }

        return $monthNames;
    }

    /** @return list<int> */
    private function generateRandomWalk(): array
    {
        $revenue = $this->randomizer->getInt(self::MINIMUM_REVENUE, self::MAXIMUM_REVENUE);
        $values = [$revenue];

        while (count($values) < self::MONTH_COUNT) {
            $change = $this->randomizer->getInt(-self::MAXIMUM_MONTHLY_CHANGE, self::MAXIMUM_MONTHLY_CHANGE);
            $revenue = max(self::MINIMUM_REVENUE, min(self::MAXIMUM_REVENUE, $revenue + $change));
            $values[] = $revenue;
        }

        return $values;
    }
}
