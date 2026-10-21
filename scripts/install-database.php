<?php

declare(strict_types=1);

use DashboardBuilder\Infrastructure\Config;
use DashboardBuilder\Infrastructure\DatabaseConnectionFactory;
use DashboardBuilder\Infrastructure\DatabaseInstaller;
use DashboardBuilder\Infrastructure\SqlScriptRunner;

require dirname(__DIR__) . '/vendor/autoload.php';

const MAXIMUM_CONNECTION_ATTEMPTS = 10;
const SECONDS_BETWEEN_ATTEMPTS = 3;

$projectRoot = dirname(__DIR__);
$config = Config::fromEnvironmentFile($projectRoot . '/.env');

for ($attempt = 1; $attempt <= MAXIMUM_CONNECTION_ATTEMPTS; $attempt++) {
    try {
        $connection = DatabaseConnectionFactory::create($config);
        break;
    } catch (\PDOException $exception) {
        fwrite(STDERR, sprintf("Database not reachable (attempt %d): %s\n", $attempt, $exception->getMessage()));
        if ($attempt === MAXIMUM_CONNECTION_ATTEMPTS) {
            exit(1);
        }
        sleep(SECONDS_BETWEEN_ATTEMPTS);
    }
}

$databaseInstaller = new DatabaseInstaller(
    $connection,
    new SqlScriptRunner($connection),
    $projectRoot . '/database/schema.sql',
    $projectRoot . '/database/seed.sql',
);

echo $databaseInstaller->installIfMissing()
    ? "Database installed with schema and sample data.\n"
    : "Database already installed; nothing to do.\n";
