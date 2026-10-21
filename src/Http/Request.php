<?php

declare(strict_types=1);

namespace DashboardBuilder\Http;

final class Request
{
    private readonly string $path;

    public function __construct(
        private readonly string $method,
        string $path,
        private readonly ?string $rawBody = null,
        private readonly array $uploadedFiles = [],
    ) {
        $this->path = self::normalizePath($path);
    }

    public static function fromGlobals(): self
    {
        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $_SERVER['REQUEST_URI'] ?? '/',
            file_get_contents('php://input') ?: null,
            $_FILES,
        );
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function jsonBody(): array
    {
        if ($this->rawBody === null || trim($this->rawBody) === '') {
            return [];
        }

        try {
            $decodedBody = json_decode($this->rawBody, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw self::invalidJsonException();
        }

        if (!is_array($decodedBody) || self::isNonEmptyList($decodedBody)) {
            throw self::invalidJsonException();
        }

        return $decodedBody;
    }

    public function uploadedFile(string $fieldName): ?array
    {
        return $this->uploadedFiles[$fieldName] ?? null;
    }

    private static function normalizePath(string $requestTarget): string
    {
        $path = parse_url($requestTarget, PHP_URL_PATH);
        $path = is_string($path) ? $path : '/';

        return $path === '/' ? '/' : rtrim($path, '/');
    }

    private static function isNonEmptyList(array $decodedBody): bool
    {
        return $decodedBody !== [] && array_is_list($decodedBody);
    }

    private static function invalidJsonException(): HttpException
    {
        return new HttpException(400, 'invalid_json', 'Request body must be a valid JSON object');
    }
}
