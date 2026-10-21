<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Support;

use DashboardBuilder\Domain\Dashboard;
use DashboardBuilder\Domain\DashboardSummary;
use DashboardBuilder\Domain\Element;
use DashboardBuilder\Domain\Section;
use DashboardBuilder\Repository\DashboardRepositoryInterface;

final class InMemoryDashboardRepository implements DashboardRepositoryInterface
{
    /** @var array<int, Dashboard> */
    private array $dashboardsById = [];
    private int $lastDashboardId = 0;
    private int $lastChildId = 0;

    public function findAllSummaries(): array
    {
        return array_values(array_map(
            static fn (Dashboard $dashboard): DashboardSummary => new DashboardSummary(
                $dashboard->id,
                $dashboard->name,
                (string) $dashboard->updatedAt,
            ),
            array_reverse($this->dashboardsById, true),
        ));
    }

    public function findById(int $dashboardId): ?Dashboard
    {
        return $this->dashboardsById[$dashboardId] ?? null;
    }

    public function create(string $name): Dashboard
    {
        $dashboard = new Dashboard(++$this->lastDashboardId, $name, [], '2026-10-21 12:00:00');
        $this->dashboardsById[$dashboard->id] = $dashboard;

        return $dashboard;
    }

    public function replaceLayout(Dashboard $dashboard): Dashboard
    {
        $storedDashboard = $dashboard->withSections(array_map($this->assignSectionIds(...), $dashboard->sections));
        $this->dashboardsById[$dashboard->id] = $storedDashboard;

        return $storedDashboard;
    }

    public function exists(int $dashboardId): bool
    {
        return isset($this->dashboardsById[$dashboardId]);
    }

    private function assignSectionIds(Section $section): Section
    {
        $elementsWithIds = array_map(
            fn (Element $element): Element => new Element(
                ++$this->lastChildId,
                $element->elementType,
                $element->offsetXPercent,
                $element->offsetYPercent,
                $element->widthPercent,
                $element->heightPercent,
                $element->zIndex,
                $element->content,
            ),
            $section->elements,
        );

        return (new Section(
            ++$this->lastChildId,
            $section->title,
            $section->gridColumn,
            $section->gridRow,
            $section->columnSpan,
            $section->rowSpan,
            [],
        ))->withElements($elementsWithIds);
    }
}
