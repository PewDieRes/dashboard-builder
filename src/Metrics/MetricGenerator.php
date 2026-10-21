<?php

declare(strict_types=1);

namespace DashboardBuilder\Metrics;

interface MetricGenerator
{
    public function key(): string;

    public function title(): string;

    public function chartType(): string;

    public function generate(): MetricSeries;
}
