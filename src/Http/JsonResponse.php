<?php

declare(strict_types=1);

namespace DashboardBuilder\Http;

final class JsonResponse
{
    private const ENCODING_FLAGS = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR;

    public function __construct(
        private readonly array $payload,
        private readonly int $statusCode = 200,
    ) {
    }

    public function payload(): array
    {
        return $this->payload;
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }

    public function send(): void
    {
        http_response_code($this->statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($this->payload, self::ENCODING_FLAGS);
    }
}
