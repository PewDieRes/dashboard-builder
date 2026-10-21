<?php

declare(strict_types=1);

use DashboardBuilder\Http\Router;

require_once __DIR__ . '/vendor/autoload.php';

return function (): Router {
    $router = new Router();

    return $router;
};
