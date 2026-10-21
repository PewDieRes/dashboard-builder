<?php

declare(strict_types=1);

namespace DashboardBuilder\Controller;

use DashboardBuilder\Domain\DashboardSummary;
use DashboardBuilder\Http\JsonResponse;
use DashboardBuilder\Http\Request;
use DashboardBuilder\Service\DashboardService;

final class DashboardController
{
    public function __construct(private readonly DashboardService $dashboardService)
    {
    }

    public function list(Request $request, array $routeParameters): JsonResponse
    {
        $summaries = array_map(
            static fn (DashboardSummary $summary): array => $summary->toArray(),
            $this->dashboardService->listDashboards(),
        );

        return new JsonResponse(['dashboards' => $summaries]);
    }

    public function show(Request $request, array $routeParameters): JsonResponse
    {
        $dashboard = $this->dashboardService->getDashboard((int) $routeParameters['id']);

        return new JsonResponse($dashboard->toArray());
    }

    public function create(Request $request, array $routeParameters): JsonResponse
    {
        $dashboard = $this->dashboardService->createDashboard($request->jsonBody());

        return new JsonResponse($dashboard->toArray(), 201);
    }

    public function saveLayout(Request $request, array $routeParameters): JsonResponse
    {
        $dashboard = $this->dashboardService->saveLayout((int) $routeParameters['id'], $request->jsonBody());

        return new JsonResponse($dashboard->toArray());
    }
}
