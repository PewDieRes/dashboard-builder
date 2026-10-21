<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Integration;

use DashboardBuilder\Infrastructure\Config;
use DashboardBuilder\Infrastructure\DatabaseConnectionFactory;
use DashboardBuilder\Infrastructure\DatabaseInstaller;
use DashboardBuilder\Infrastructure\SqlScriptRunner;
use PHPUnit\Framework\TestCase;

final class DatabaseInstallerTest extends TestCase
{
    private \PDO $connection;
    private DatabaseInstaller $databaseInstaller;

    protected function setUp(): void
    {
        $projectRoot = dirname(__DIR__, 2);
        $this->connection = DatabaseConnectionFactory::create(Config::fromEnvironmentFile($projectRoot . '/.env'));
        $this->connection->exec('DROP TABLE IF EXISTS elements, sections, dashboards');
        $this->databaseInstaller = new DatabaseInstaller(
            $this->connection,
            new SqlScriptRunner($this->connection),
            $projectRoot . '/database/schema.sql',
            $projectRoot . '/database/seed.sql',
        );
    }

    public function testInstallsSchemaAndSampleDataOnEmptyDatabase(): void
    {
        self::assertTrue($this->databaseInstaller->installIfMissing());
        self::assertSame(1, (int) $this->connection->query('SELECT COUNT(*) FROM dashboards')->fetchColumn());
        self::assertSame(4, (int) $this->connection->query('SELECT COUNT(*) FROM elements')->fetchColumn());
    }

    public function testLeavesInstalledDatabaseUntouched(): void
    {
        $this->databaseInstaller->installIfMissing();
        $this->connection->exec("INSERT INTO dashboards (name) VALUES ('Kept')");

        self::assertFalse($this->databaseInstaller->installIfMissing());
        self::assertSame(2, (int) $this->connection->query('SELECT COUNT(*) FROM dashboards')->fetchColumn());
    }
}
