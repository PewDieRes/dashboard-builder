<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Infrastructure;

use DashboardBuilder\Infrastructure\SqlScriptRunner;
use PHPUnit\Framework\TestCase;

final class SqlScriptRunnerTest extends TestCase
{
    public function testSplitsStatementsOnLineEndingSemicolons(): void
    {
        $script = "DROP TABLE IF EXISTS widgets;\n\nCREATE TABLE widgets (\n    id INT PRIMARY KEY\n);\n";

        self::assertSame(
            ['DROP TABLE IF EXISTS widgets', "CREATE TABLE widgets (\n    id INT PRIMARY KEY\n)"],
            SqlScriptRunner::splitStatements($script),
        );
    }

    public function testKeepsSemicolonsInsideValues(): void
    {
        $script = "INSERT INTO notes (body) VALUES ('first; second');\n";

        self::assertSame(["INSERT INTO notes (body) VALUES ('first; second')"], SqlScriptRunner::splitStatements($script));
    }

    public function testEmptyScriptHasNoStatements(): void
    {
        self::assertSame([], SqlScriptRunner::splitStatements("\n  \n"));
    }
}
