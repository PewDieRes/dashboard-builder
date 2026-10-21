<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Integration;

use DashboardBuilder\Domain\Dashboard;
use DashboardBuilder\Infrastructure\Config;
use DashboardBuilder\Infrastructure\DatabaseConnectionFactory;
use DashboardBuilder\Repository\PdoDashboardRepository;
use DashboardBuilder\Tests\Unit\Service\LayoutValidatorTest;
use PHPUnit\Framework\TestCase;

final class PdoDashboardRepositoryTest extends TestCase
{
    private \PDO $connection;
    private PdoDashboardRepository $dashboardRepository;

    protected function setUp(): void
    {
        $projectRoot = dirname(__DIR__, 2);
        $this->connection = DatabaseConnectionFactory::create(Config::fromEnvironmentFile($projectRoot . '/.env'));
        $this->recreateSchema($projectRoot . '/database/schema.sql');
        $this->dashboardRepository = new PdoDashboardRepository($this->connection);
    }

    public function testCreateReturnsDashboardWithIdAndNoSections(): void
    {
        $dashboard = $this->dashboardRepository->create('Operations');

        self::assertGreaterThan(0, $dashboard->id);
        self::assertSame('Operations', $dashboard->name);
        self::assertSame([], $dashboard->sections);
        self::assertNotNull($dashboard->updatedAt);
    }

    public function testReplaceLayoutPersistsSectionsAndElementsWithGeometry(): void
    {
        $created = $this->dashboardRepository->create('Operations');
        $layout = Dashboard::fromArray(LayoutValidatorTest::validLayout())->withId($created->id);

        $stored = $this->dashboardRepository->replaceLayout($layout);

        self::assertSame('Sales Overview', $stored->name);
        self::assertCount(1, $stored->sections);
        $storedSection = $stored->sections[0];
        self::assertNotNull($storedSection->id);
        self::assertSame(8, $storedSection->columnSpan);
        self::assertCount(3, $storedSection->elements);
        $storedText = $storedSection->elements[1];
        self::assertSame(['html' => '<p>Hello</p>'], $storedText->content);
        self::assertEqualsWithDelta(10.0, $storedText->offsetXPercent, 0.001);
        self::assertEqualsWithDelta(50.0, $storedText->widthPercent, 0.001);
    }

    public function testElementsAreOrderedByZIndexAndContentRoundTrips(): void
    {
        $created = $this->dashboardRepository->create('Operations');
        $layout = Dashboard::fromArray(LayoutValidatorTest::validLayout())->withId($created->id);

        $stored = $this->dashboardRepository->replaceLayout($layout)->sections[0]->elements;

        self::assertSame([1, 2, 3], array_map(static fn ($element): int => $element->zIndex, $stored));
        self::assertSame(['Jan', 'Feb'], $stored[0]->content['labels']);
        self::assertEqualsWithDelta(20.5, $stored[0]->content['values'][1], 0.001);
    }

    public function testSecondReplaceWithNoSectionsRemovesElements(): void
    {
        $created = $this->dashboardRepository->create('Operations');
        $this->dashboardRepository->replaceLayout(
            Dashboard::fromArray(LayoutValidatorTest::validLayout())->withId($created->id),
        );

        $this->dashboardRepository->replaceLayout($created->withSections([]));

        self::assertSame(0, (int) $this->connection->query('SELECT COUNT(*) FROM elements')->fetchColumn());
        self::assertSame(0, (int) $this->connection->query('SELECT COUNT(*) FROM sections')->fetchColumn());
    }

    public function testFindAllSummariesContainsCreatedDashboard(): void
    {
        $created = $this->dashboardRepository->create('Operations');

        $summaryIds = array_map(static fn ($summary): int => $summary->id, $this->dashboardRepository->findAllSummaries());

        self::assertContains($created->id, $summaryIds);
    }

    public function testFindByIdReturnsNullForUnknownDashboard(): void
    {
        self::assertNull($this->dashboardRepository->findById(999999));
        self::assertFalse($this->dashboardRepository->exists(999999));
    }

    private function recreateSchema(string $schemaFilePath): void
    {
        $statements = preg_split('/;\s*$/m', (string) file_get_contents($schemaFilePath));

        foreach ($statements as $statement) {
            if (trim($statement) !== '') {
                $this->connection->exec($statement);
            }
        }
    }
}
