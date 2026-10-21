<?php

declare(strict_types=1);

namespace DashboardBuilder\Infrastructure;

final class Config
{
    private const OVERRIDABLE_KEYS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_SSL_CA', 'UPLOAD_DIRECTORY'];

    /** @param array<string, string> $values */
    private function __construct(private readonly array $values)
    {
    }

    public static function fromEnvironmentFile(string $filePath): self
    {
        $values = is_file($filePath) ? self::parseEnvironmentFile($filePath) : [];

        foreach (self::OVERRIDABLE_KEYS as $key) {
            $environmentValue = getenv($key);
            if ($environmentValue !== false) {
                $values[$key] = $environmentValue;
            }
        }

        return new self($values);
    }

    public function databaseHost(): string
    {
        return $this->values['DB_HOST'] ?? '127.0.0.1';
    }

    public function databasePort(): int
    {
        return (int) ($this->values['DB_PORT'] ?? 3306);
    }

    public function databaseName(): string
    {
        return $this->values['DB_NAME'] ?? 'dashboard_builder';
    }

    public function databaseUser(): string
    {
        return $this->values['DB_USER'] ?? 'dashboard_app';
    }

    public function databasePassword(): string
    {
        return $this->values['DB_PASSWORD'] ?? '';
    }

    /** PEM-encoded certificate authority for TLS database connections (hosted MySQL), or null for plain connections. */
    public function databaseSslCertificateAuthority(): ?string
    {
        $certificateAuthority = trim($this->values['DB_SSL_CA'] ?? '');

        return $certificateAuthority === '' ? null : $certificateAuthority;
    }

    public function uploadDirectory(): string
    {
        return $this->values['UPLOAD_DIRECTORY'] ?? dirname(__DIR__, 2) . '/public/uploads';
    }

    /** @return array<string, string> */
    private static function parseEnvironmentFile(string $filePath): array
    {
        $values = [];

        foreach (file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if (str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $values[trim($key)] = trim($value);
        }

        return $values;
    }
}
