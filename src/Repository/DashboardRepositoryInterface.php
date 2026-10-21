<?php

declare(strict_types=1);

namespace DashboardBuilder\Repository;

use DashboardBuilder\Domain\Dashboard;
use DashboardBuilder\Domain\DashboardSummary;

interface DashboardRepositoryInterface
{
    /** @return list<DashboardSummary> newest update first */
    public function findAllSummaries(): array;

    public function findById(int $dashboardId): ?Dashboard;

    public function create(string $name): Dashboard;

    /** Replaces name, sections and elements atomically; the dashboard must have an id. */
    public function replaceLayout(Dashboard $dashboard): Dashboard;

    public function exists(int $dashboardId): bool;
}
