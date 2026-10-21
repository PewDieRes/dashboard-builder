<?php

declare(strict_types=1);

namespace DashboardBuilder\Service;

use DashboardBuilder\Domain\Dashboard;
use DashboardBuilder\Domain\DashboardSummary;
use DashboardBuilder\Domain\Element;
use DashboardBuilder\Domain\ElementType;
use DashboardBuilder\Domain\Section;
use DashboardBuilder\Http\NotFoundException;
use DashboardBuilder\Http\ValidationException;
use DashboardBuilder\Repository\DashboardRepositoryInterface;

final class DashboardService
{
    public function __construct(
        private readonly DashboardRepositoryInterface $dashboardRepository,
        private readonly LayoutValidator $layoutValidator,
        private readonly HtmlSanitizer $htmlSanitizer,
    ) {
    }

    /** @return list<DashboardSummary> */
    public function listDashboards(): array
    {
        return $this->dashboardRepository->findAllSummaries();
    }

    public function getDashboard(int $dashboardId): Dashboard
    {
        return $this->dashboardRepository->findById($dashboardId) ?? throw self::dashboardNotFound();
    }

    public function createDashboard(array $payload): Dashboard
    {
        $this->throwIfInvalid($this->layoutValidator->validateDashboardName($payload));

        return $this->dashboardRepository->create(trim($payload['name']));
    }

    public function saveLayout(int $dashboardId, array $layoutPayload): Dashboard
    {
        if (!$this->dashboardRepository->exists($dashboardId)) {
            throw self::dashboardNotFound();
        }
        $this->throwIfInvalid($this->layoutValidator->validate($layoutPayload));

        $dashboard = Dashboard::fromArray($layoutPayload)->withId($dashboardId);

        return $this->dashboardRepository->replaceLayout($this->sanitizeTextElements($dashboard));
    }

    private function sanitizeTextElements(Dashboard $dashboard): Dashboard
    {
        return $dashboard->withSections(array_map(
            fn (Section $section): Section => $section->withElements(array_map($this->sanitizeElement(...), $section->elements)),
            $dashboard->sections,
        ));
    }

    private function sanitizeElement(Element $element): Element
    {
        if ($element->elementType !== ElementType::Text) {
            return $element;
        }

        return $element->withContent([
            ...$element->content,
            'html' => $this->htmlSanitizer->sanitize($element->content['html']),
        ]);
    }

    /** @param array<string, string> $fieldErrors */
    private function throwIfInvalid(array $fieldErrors): void
    {
        if ($fieldErrors !== []) {
            throw new ValidationException($fieldErrors);
        }
    }

    private static function dashboardNotFound(): NotFoundException
    {
        return new NotFoundException('Dashboard not found');
    }
}
