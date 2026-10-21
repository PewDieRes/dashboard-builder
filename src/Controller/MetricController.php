<?php

declare(strict_types=1);

namespace DashboardBuilder\Controller;

use DashboardBuilder\Http\JsonResponse;
use DashboardBuilder\Http\NotFoundException;
use DashboardBuilder\Http\Request;
use DashboardBuilder\Metrics\MetricGenerator;
use DashboardBuilder\Metrics\MetricRegistry;

final class MetricController
{
    public function __construct(private readonly MetricRegistry $metricRegistry)
    {
    }

    public function list(Request $request, array $routeParameters): JsonResponse
    {
        $metrics = array_map(
            fn (MetricGenerator $generator): array => $this->describe($generator),
            $this->metricRegistry->all(),
        );

        return new JsonResponse(['metrics' => $metrics]);
    }

    public function show(Request $request, array $routeParameters): JsonResponse
    {
        $generator = $this->metricRegistry->find($routeParameters['metricKey'])
            ?? throw new NotFoundException('Metric not found');

        return new JsonResponse($this->describe($generator) + $generator->generate()->toArray());
    }

    private function describe(MetricGenerator $generator): array
    {
        return [
            'key' => $generator->key(),
            'title' => $generator->title(),
            'chartType' => $generator->chartType(),
        ];
    }
}
