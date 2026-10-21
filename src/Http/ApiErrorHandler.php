<?php

declare(strict_types=1);

namespace DashboardBuilder\Http;

final class ApiErrorHandler
{
    public function handle(\Throwable $throwable): JsonResponse
    {
        if ($throwable instanceof HttpException) {
            return self::errorResponse(
                $throwable->statusCode(),
                $throwable->errorCode(),
                $throwable->getMessage(),
                $throwable->details(),
            );
        }

        error_log((string) $throwable);

        return self::errorResponse(500, 'internal_error', 'An unexpected error occurred', []);
    }

    private static function errorResponse(int $statusCode, string $errorCode, string $message, array $details): JsonResponse
    {
        return new JsonResponse([
            'error' => [
                'code' => $errorCode,
                'message' => $message,
                'details' => $details === [] ? (object) [] : $details,
            ],
        ], $statusCode);
    }
}
