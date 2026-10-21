<?php

declare(strict_types=1);

use DashboardBuilder\Http\ApiErrorHandler;
use DashboardBuilder\Http\Request;

require_once dirname(__DIR__) . '/vendor/autoload.php';

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . $requestPath)) {
    return false;
}

if (str_starts_with($requestPath, '/api/')) {
    try {
        $createRouter = require dirname(__DIR__) . '/bootstrap.php';
        $response = $createRouter()->dispatch(Request::fromGlobals());
    } catch (Throwable $throwable) {
        $response = (new ApiErrorHandler())->handle($throwable);
    }
    $response->send();

    return;
}

header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
