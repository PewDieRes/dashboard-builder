<?php

declare(strict_types=1);

namespace DashboardBuilder\Http;

final class Router
{
    /** @var list<array{method: string, regularExpression: string, handler: callable}> */
    private array $routes = [];

    public function addRoute(string $method, string $pathPattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'regularExpression' => self::compilePattern($pathPattern),
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): JsonResponse
    {
        $pathMatched = false;

        foreach ($this->routes as $route) {
            if (preg_match($route['regularExpression'], $request->path(), $matches) !== 1) {
                continue;
            }
            $pathMatched = true;
            if ($route['method'] === $request->method()) {
                return ($route['handler'])($request, self::extractNamedParameters($matches));
            }
        }

        throw $pathMatched
            ? new HttpException(405, 'method_not_allowed', 'Method not allowed')
            : new NotFoundException();
    }

    private static function compilePattern(string $pathPattern): string
    {
        $segments = preg_split('#(\{\w+\})#', $pathPattern, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        $regularExpression = '';

        foreach ($segments as $segment) {
            $regularExpression .= preg_match('#^\{(\w+)\}$#', $segment, $placeholder) === 1
                ? '(?P<' . $placeholder[1] . '>\d+)'
                : preg_quote($segment, '#');
        }

        return '#^' . $regularExpression . '$#';
    }

    /** @return array<string, string> */
    private static function extractNamedParameters(array $matches): array
    {
        return array_filter($matches, is_string(...), ARRAY_FILTER_USE_KEY);
    }
}
