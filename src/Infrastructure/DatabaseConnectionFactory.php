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

        $options = [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ];

        $certificateAuthority = $config->databaseSslCertificateAuthority();
        if ($certificateAuthority !== null) {
            $options[\PDO::MYSQL_ATTR_SSL_CA] = self::writeCertificateAuthorityFile($certificateAuthority);
        }

        return new \PDO($dataSourceName, $config->databaseUser(), $config->databasePassword(), $options);
    }

    /** PDO needs the certificate authority as a file path, so the PEM from the environment is cached on disk. */
    private static function writeCertificateAuthorityFile(string $certificateAuthority): string
    {
        $certificateFilePath = sprintf(
            '%s/dashboard-builder-database-ca-%s.pem',
            sys_get_temp_dir(),
            hash('sha256', $certificateAuthority),
        );

        if (!is_file($certificateFilePath)) {
            file_put_contents($certificateFilePath, $certificateAuthority . PHP_EOL);
        }

        return $certificateFilePath;
    }
}
