<?php

declare(strict_types=1);

namespace DashboardBuilder\Infrastructure;

final class SqlScriptRunner
{
    public function __construct(private readonly \PDO $connection)
    {
    }

    public function runFile(string $scriptFilePath): void
    {
        foreach (self::splitStatements((string) file_get_contents($scriptFilePath)) as $statement) {
            $this->connection->exec($statement);
        }
    }

    /**
     * Splits on semicolons that end a line, which is how the bundled schema and seed files are written.
     *
     * @return list<string>
     */
    public static function splitStatements(string $script): array
    {
        $statements = array_map('trim', preg_split('/;\s*$/m', $script));

        return array_values(array_filter($statements, static fn (string $statement): bool => $statement !== ''));
    }
}
