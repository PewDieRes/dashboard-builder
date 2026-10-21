<?php

declare(strict_types=1);

namespace DashboardBuilder\Http;

final class ValidationException extends HttpException
{
    /** @param array<string, string> $fieldErrors */
    public function __construct(array $fieldErrors)
    {
        parent::__construct(422, 'validation_failed', 'The submitted data is invalid', $fieldErrors);
    }
}
