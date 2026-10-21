<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Http;

use DashboardBuilder\Http\HttpException;
use DashboardBuilder\Http\Request;
use PHPUnit\Framework\TestCase;

final class RequestTest extends TestCase
{
    public function testParsesJsonObjectBody(): void
    {
        self::assertSame(['name' => 'Sales'], (new Request('POST', '/api/dashboards', '{"name":"Sales"}'))->jsonBody());
    }

    public function testEmptyBodyIsEmptyArray(): void
    {
        self::assertSame([], (new Request('POST', '/api/dashboards', ''))->jsonBody());
    }

    public function testMalformedJsonThrowsInvalidJson(): void
    {
        try {
            (new Request('PUT', '/api/dashboards/1/layout', '{"name":'))->jsonBody();
            self::fail('Expected HttpException');
        } catch (HttpException $exception) {
            self::assertSame(400, $exception->statusCode());
            self::assertSame('invalid_json', $exception->errorCode());
        }
    }

    public function testJsonScalarThrowsInvalidJson(): void
    {
        $this->expectException(HttpException::class);
        (new Request('PUT', '/api/dashboards/1/layout', '"text"'))->jsonBody();
    }

    public function testPathStripsQueryStringAndTrailingSlash(): void
    {
        self::assertSame('/api/dashboards', (new Request('GET', '/api/dashboards/?page=2'))->path());
        self::assertSame('/', (new Request('GET', '/'))->path());
    }
}
