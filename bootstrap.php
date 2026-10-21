<?php

declare(strict_types=1);

use DashboardBuilder\Controller\DashboardController;
use DashboardBuilder\Controller\ImageUploadController;
use DashboardBuilder\Controller\MetricController;
use DashboardBuilder\Http\Router;
use DashboardBuilder\Infrastructure\Config;
use DashboardBuilder\Infrastructure\DatabaseConnectionFactory;
use DashboardBuilder\Metrics\DailyVisitorsMetric;
use DashboardBuilder\Metrics\MetricRegistry;
use DashboardBuilder\Metrics\MonthlyRevenueMetric;
use DashboardBuilder\Metrics\SignupsByChannelMetric;
use DashboardBuilder\Repository\PdoDashboardRepository;
use DashboardBuilder\Service\DashboardService;
use DashboardBuilder\Service\HtmlSanitizer;
use DashboardBuilder\Service\ImageUploadService;
use DashboardBuilder\Service\LayoutValidator;
use Random\Randomizer;

require_once __DIR__ . '/vendor/autoload.php';

return function (): Router {
    $config = Config::fromEnvironmentFile(__DIR__ . '/.env');

    $dashboardController = new DashboardController(new DashboardService(
        new PdoDashboardRepository(DatabaseConnectionFactory::create($config)),
        new LayoutValidator(),
        new HtmlSanitizer(),
    ));
    $imageUploadController = new ImageUploadController(new ImageUploadService($config->uploadDirectory()));
    $randomizer = new Randomizer();
    $now = new DateTimeImmutable();
    $metricController = new MetricController(new MetricRegistry([
        new MonthlyRevenueMetric($randomizer, $now),
        new DailyVisitorsMetric($randomizer, $now),
        new SignupsByChannelMetric($randomizer, $now),
    ]));

    $router = new Router();
    $router->addRoute('GET', '/api/dashboards', $dashboardController->list(...));
    $router->addRoute('POST', '/api/dashboards', $dashboardController->create(...));
    $router->addRoute('GET', '/api/dashboards/{id}', $dashboardController->show(...));
    $router->addRoute('PUT', '/api/dashboards/{id}/layout', $dashboardController->saveLayout(...));
    $router->addRoute('GET', '/api/metrics', $metricController->list(...));
    $router->addRoute('GET', '/api/metrics/{metricKey}', $metricController->show(...));
    $router->addRoute('POST', '/api/images', $imageUploadController->upload(...));

    return $router;
};
