<?php

declare(strict_types=1);

use DashboardBuilder\Controller\DashboardController;
use DashboardBuilder\Controller\ImageUploadController;
use DashboardBuilder\Http\Router;
use DashboardBuilder\Infrastructure\Config;
use DashboardBuilder\Infrastructure\DatabaseConnectionFactory;
use DashboardBuilder\Repository\PdoDashboardRepository;
use DashboardBuilder\Service\DashboardService;
use DashboardBuilder\Service\HtmlSanitizer;
use DashboardBuilder\Service\ImageUploadService;
use DashboardBuilder\Service\LayoutValidator;

require_once __DIR__ . '/vendor/autoload.php';

return function (): Router {
    $config = Config::fromEnvironmentFile(__DIR__ . '/.env');

    $dashboardController = new DashboardController(new DashboardService(
        new PdoDashboardRepository(DatabaseConnectionFactory::create($config)),
        new LayoutValidator(),
        new HtmlSanitizer(),
    ));
    $imageUploadController = new ImageUploadController(new ImageUploadService($config->uploadDirectory()));

    $router = new Router();
    $router->addRoute('GET', '/api/dashboards', $dashboardController->list(...));
    $router->addRoute('POST', '/api/dashboards', $dashboardController->create(...));
    $router->addRoute('GET', '/api/dashboards/{id}', $dashboardController->show(...));
    $router->addRoute('PUT', '/api/dashboards/{id}/layout', $dashboardController->saveLayout(...));
    $router->addRoute('POST', '/api/images', $imageUploadController->upload(...));

    return $router;
};
