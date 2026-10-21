<?php

declare(strict_types=1);

namespace DashboardBuilder\Http;

final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Resource not found')
    {
        parent::__construct(404, 'not_found', $message);
    }
}
