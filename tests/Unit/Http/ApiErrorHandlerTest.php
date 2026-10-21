<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Http;

use DashboardBuilder\Http\ApiErrorHandler;
use DashboardBuilder\Http\HttpException;
use DashboardBuilder\Http\ValidationException;
use PHPUnit\Framework\TestCase;

final class ApiErrorHandlerTest extends TestCase
{
    private ApiErrorHandler $apiErrorHandler;

    protected function setUp(): void
    {
        $this->apiErrorHandler = new ApiErrorHandler();
    }

    public function testHttpExceptionMapsToStatusCodeAndDetails(): void
    {
        $response = $this->apiErrorHandler->handle(new ValidationException(['name' => 'Required']));

        self::assertSame(422, $response->statusCode());
        self::assertSame(
            ['error' => ['code' => 'validation_failed', 'message' => 'The submitted data is invalid', 'details' => ['name' => 'Required']]],
            $response->payload(),
        );
    }

    public function testEmptyDetailsBecomeJsonObject(): void
    {
        $response = $this->apiErrorHandler->handle(new HttpException(400, 'invalid_json', 'Bad body'));

        self::assertEquals((object) [], $response->payload()['error']['details']);
    }

    public function testUnexpectedThrowableMapsToGenericInternalError(): void
    {
        $previousErrorLog = ini_set('error_log', sys_get_temp_dir() . '/dashboard-builder-test-error.log');
        $response = $this->apiErrorHandler->handle(new \RuntimeException('db down'));
        ini_set('error_log', (string) $previousErrorLog);

        self::assertSame(500, $response->statusCode());
        self::assertSame('internal_error', $response->payload()['error']['code']);
        self::assertStringNotContainsString('db down', $response->payload()['error']['message']);
    }
}
