<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Metrics;

use DashboardBuilder\Metrics\SignupsByChannelMetric;
use PHPUnit\Framework\TestCase;
use Random\Engine\Mt19937;
use Random\Randomizer;

final class SignupsByChannelMetricTest extends TestCase
{
    private static function createMetric(int $seed = 42): SignupsByChannelMetric
    {
        return new SignupsByChannelMetric(new Randomizer(new Mt19937($seed)), new \DateTimeImmutable('2026-05-20 08:00:00'));
    }

    public function testDescribesItself(): void
    {
        $metric = self::createMetric();
        self::assertSame('signups-by-channel', $metric->key());
        self::assertSame('Signups by Channel', $metric->title());
        self::assertSame('bar', $metric->chartType());
    }

    public function testLabelsAreTheFixedChannels(): void
    {
        self::assertSame(['Organic', 'Paid', 'Referral', 'Social', 'Email'], self::createMetric()->generate()->labels);
    }

    public function testValuesAreIntegersWithinRange(): void
    {
        foreach ([1, 2, 3, 4, 5] as $seed) {
            $series = self::createMetric($seed)->generate();
            self::assertCount(5, $series->values);
            foreach ($series->values as $value) {
                self::assertIsInt($value);
                self::assertGreaterThanOrEqual(20, $value);
                self::assertLessThanOrEqual(200, $value);
            }
        }
    }

    public function testSameSeedProducesSameSeries(): void
    {
        self::assertEquals(self::createMetric()->generate(), self::createMetric()->generate());
    }
}
