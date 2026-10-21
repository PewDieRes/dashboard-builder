<?php

declare(strict_types=1);

namespace DashboardBuilder\Metrics;

final class MetricRegistry
{
    /** @var array<string, MetricGenerator> */
    private array $generatorsByKey = [];

    /** @param list<MetricGenerator> $generators */
    public function __construct(array $generators)
    {
        foreach ($generators as $generator) {
            $this->generatorsByKey[$generator->key()] = $generator;
        }
    }

    /** @return list<MetricGenerator> */
    public function all(): array
    {
        return array_values($this->generatorsByKey);
    }

    public function find(string $key): ?MetricGenerator
    {
        return $this->generatorsByKey[$key] ?? null;
    }
}
