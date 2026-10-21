<?php

declare(strict_types=1);

namespace DashboardBuilder\Infrastructure;

final class DatabaseConnectionFactory
{
    public static function create(Config $config): \PDO
    {
        $dataSourceName = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config->databaseHost(),
            $config->databasePort(),
            $config->databaseName(),
        );

        return new \PDO($dataSourceName, $config->databaseUser(), $config->databasePassword(), [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
