<?php

declare(strict_types=1);

namespace DashboardBuilder\Infrastructure;

/** Creates the schema and sample data on an empty database; leaves an installed database untouched. */
final class DatabaseInstaller
{
    public function __construct(
        private readonly \PDO $connection,
        private readonly SqlScriptRunner $sqlScriptRunner,
        private readonly string $schemaFilePath,
        private readonly string $seedFilePath,
    ) {
    }

    /** @return bool true when the database was installed by this call */
    public function installIfMissing(): bool
    {
        if ($this->isInstalled()) {
            return false;
        }

        $this->sqlScriptRunner->runFile($this->schemaFilePath);
        $this->sqlScriptRunner->runFile($this->seedFilePath);

        return true;
    }

    private function isInstalled(): bool
    {
        return $this->connection->query("SHOW TABLES LIKE 'dashboards'")->fetchColumn() !== false;
    }
}
