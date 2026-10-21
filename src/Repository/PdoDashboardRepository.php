<?php

declare(strict_types=1);

namespace DashboardBuilder\Repository;

use DashboardBuilder\Domain\Dashboard;
use DashboardBuilder\Domain\DashboardSummary;
use DashboardBuilder\Domain\Element;
use DashboardBuilder\Domain\ElementType;
use DashboardBuilder\Domain\Section;

final class PdoDashboardRepository implements DashboardRepositoryInterface
{
    public function __construct(private readonly \PDO $connection)
    {
    }

    public function findAllSummaries(): array
    {
        $rows = $this->connection
            ->query('SELECT id, name, updated_at FROM dashboards ORDER BY updated_at DESC, id DESC')
            ->fetchAll();

        return array_map(
            static fn (array $row): DashboardSummary => new DashboardSummary((int) $row['id'], $row['name'], $row['updated_at']),
            $rows,
        );
    }

    public function findById(int $dashboardId): ?Dashboard
    {
        $dashboardRow = $this->fetchOne('SELECT id, name, updated_at FROM dashboards WHERE id = ?', [$dashboardId]);
        if ($dashboardRow === null) {
            return null;
        }

        return new Dashboard(
            (int) $dashboardRow['id'],
            $dashboardRow['name'],
            $this->loadSections($dashboardId),
            $dashboardRow['updated_at'],
        );
    }

    public function create(string $name): Dashboard
    {
        $this->execute('INSERT INTO dashboards (name) VALUES (?)', [$name]);

        return $this->requireDashboard((int) $this->connection->lastInsertId());
    }

    public function replaceLayout(Dashboard $dashboard): Dashboard
    {
        $this->connection->beginTransaction();

        try {
            $this->execute(
                'UPDATE dashboards SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [$dashboard->name, $dashboard->id],
            );
            $this->execute('DELETE FROM sections WHERE dashboard_id = ?', [$dashboard->id]);
            foreach ($dashboard->sections as $sortOrder => $section) {
                $this->insertSection($dashboard->id, $section, $sortOrder);
            }
            $this->connection->commit();
        } catch (\Throwable $throwable) {
            $this->connection->rollBack();
            throw $throwable;
        }

        return $this->requireDashboard($dashboard->id);
    }

    public function exists(int $dashboardId): bool
    {
        return $this->fetchOne('SELECT id FROM dashboards WHERE id = ?', [$dashboardId]) !== null;
    }

    private function requireDashboard(int $dashboardId): Dashboard
    {
        return $this->findById($dashboardId)
            ?? throw new \RuntimeException("Dashboard $dashboardId disappeared after being written");
    }

    private function insertSection(int $dashboardId, Section $section, int $sortOrder): void
    {
        $this->execute(
            'INSERT INTO sections (dashboard_id, title, grid_column, grid_row, column_span, row_span, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                $dashboardId,
                $section->title,
                $section->gridColumn,
                $section->gridRow,
                $section->columnSpan,
                $section->rowSpan,
                $sortOrder,
            ],
        );
        $sectionId = (int) $this->connection->lastInsertId();

        foreach ($section->elements as $element) {
            $this->insertElement($sectionId, $element);
        }
    }

    private function insertElement(int $sectionId, Element $element): void
    {
        $this->execute(
            'INSERT INTO elements
                (section_id, element_type, offset_x_percent, offset_y_percent, width_percent, height_percent, z_index, content)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $sectionId,
                $element->elementType->value,
                $element->offsetXPercent,
                $element->offsetYPercent,
                $element->widthPercent,
                $element->heightPercent,
                $element->zIndex,
                json_encode($element->content, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        );
    }

    /** @return list<Section> */
    private function loadSections(int $dashboardId): array
    {
        $sectionRows = $this->fetchAll(
            'SELECT id, title, grid_column, grid_row, column_span, row_span
             FROM sections WHERE dashboard_id = ? ORDER BY sort_order, id',
            [$dashboardId],
        );
        $elementsBySectionId = $this->loadElementsGroupedBySection(array_map(
            static fn (array $sectionRow): int => (int) $sectionRow['id'],
            $sectionRows,
        ));

        return array_map(
            fn (array $sectionRow): Section => $this->mapSectionRow($sectionRow, $elementsBySectionId[(int) $sectionRow['id']] ?? []),
            $sectionRows,
        );
    }

    /**
     * @param list<int> $sectionIds
     * @return array<int, list<Element>>
     */
    private function loadElementsGroupedBySection(array $sectionIds): array
    {
        if ($sectionIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($sectionIds), '?'));
        $elementRows = $this->fetchAll(
            "SELECT id, section_id, element_type, offset_x_percent, offset_y_percent, width_percent, height_percent, z_index, content
             FROM elements WHERE section_id IN ($placeholders) ORDER BY z_index, id",
            $sectionIds,
        );

        $elementsBySectionId = [];
        foreach ($elementRows as $elementRow) {
            $elementsBySectionId[(int) $elementRow['section_id']][] = $this->mapElementRow($elementRow);
        }

        return $elementsBySectionId;
    }

    /** @param list<Element> $elements */
    private function mapSectionRow(array $sectionRow, array $elements): Section
    {
        return new Section(
            (int) $sectionRow['id'],
            $sectionRow['title'],
            (int) $sectionRow['grid_column'],
            (int) $sectionRow['grid_row'],
            (int) $sectionRow['column_span'],
            (int) $sectionRow['row_span'],
            $elements,
        );
    }

    private function mapElementRow(array $elementRow): Element
    {
        return new Element(
            (int) $elementRow['id'],
            ElementType::from($elementRow['element_type']),
            (float) $elementRow['offset_x_percent'],
            (float) $elementRow['offset_y_percent'],
            (float) $elementRow['width_percent'],
            (float) $elementRow['height_percent'],
            (int) $elementRow['z_index'],
            json_decode($elementRow['content'], true, 512, JSON_THROW_ON_ERROR),
        );
    }

    private function execute(string $sql, array $parameters): void
    {
        $this->connection->prepare($sql)->execute($parameters);
    }

    /** @return list<array<string, mixed>> */
    private function fetchAll(string $sql, array $parameters): array
    {
        $statement = $this->connection->prepare($sql);
        $statement->execute($parameters);

        return $statement->fetchAll();
    }

    private function fetchOne(string $sql, array $parameters): ?array
    {
        return $this->fetchAll($sql, $parameters)[0] ?? null;
    }
}
