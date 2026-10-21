<?php

declare(strict_types=1);

namespace DashboardBuilder\Metrics;

use Random\Randomizer;

final class SignupsByChannelMetric implements MetricGenerator
{
    private const CHANNELS = ['Organic', 'Paid', 'Referral', 'Social', 'Email'];
    private const MINIMUM_SIGNUPS = 20;
    private const MAXIMUM_SIGNUPS = 200;

    public function __construct(
        private readonly Randomizer $randomizer,
        private readonly \DateTimeImmutable $now,
    ) {
    }

    public function key(): string
    {
        return 'signups-by-channel';
    }

    public function title(): string
    {
        return 'Signups by Channel';
    }

    public function chartType(): string
    {
        return 'bar';
    }

    public function generate(): MetricSeries
    {
        $values = array_map(
            fn (string $channel): int => $this->randomizer->getInt(self::MINIMUM_SIGNUPS, self::MAXIMUM_SIGNUPS),
            self::CHANNELS,
        );

        return new MetricSeries(self::CHANNELS, $values, $this->now);
    }
}
