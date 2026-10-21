<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Http;

use DashboardBuilder\Http\HttpException;
use DashboardBuilder\Http\JsonResponse;
use DashboardBuilder\Http\NotFoundException;
use DashboardBuilder\Http\Request;
use DashboardBuilder\Http\Router;
use PHPUnit\Framework\TestCase;

final class RouterTest extends TestCase
{
    public function testDispatchesToMatchingRouteWithParameters(): void
    {
        $router = new Router();
        $router->addRoute('GET', '/api/dashboards/{id}', fn (Request $request, array $routeParameters) => new JsonResponse(['id' => (int) $routeParameters['id']]));
        $response = $router->dispatch(new Request('GET', '/api/dashboards/42'));
        self::assertSame(['id' => 42], $response->payload());
    }

    public function testUnknownPathThrowsNotFound(): void
    {
        $this->expectException(NotFoundException::class);
        (new Router())->dispatch(new Request('GET', '/api/missing'));
    }

    public function testWrongMethodThrowsMethodNotAllowed(): void
    {
        $router = new Router();
        $router->addRoute('GET', '/api/dashboards', fn () => new JsonResponse([]));
        try {
            $router->dispatch(new Request('DELETE', '/api/dashboards'));
            self::fail('Expected HttpException');
        } catch (HttpException $exception) {
            self::assertSame(405, $exception->statusCode());
            self::assertSame('method_not_allowed', $exception->errorCode());
        }
    }

    public function testNonNumericIdDoesNotMatch(): void
    {
        $router = new Router();
        $router->addRoute('GET', '/api/dashboards/{id}', fn () => new JsonResponse([]));
        $this->expectException(NotFoundException::class);
        $router->dispatch(new Request('GET', '/api/dashboards/abc'));
    }
}
