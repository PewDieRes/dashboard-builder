<?php

declare(strict_types=1);

namespace DashboardBuilder\Metrics;

final readonly class MetricSeries
{
    /**
     * @param list<string> $labels
     * @param list<int> $values
     */
    public function __construct(
        public array $labels,
        public array $values,
        public \DateTimeImmutable $generatedAt,
    ) {
    }

    public function toArray(): array
    {
        return [
            'labels' => $this->labels,
            'values' => $this->values,
            'generatedAt' => $this->generatedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
