<?php

declare(strict_types=1);

namespace DashboardBuilder\Domain;

enum ElementType: string
{
    case Text = 'text';
    case Image = 'image';
    case Chart = 'chart';

    /** @return list<string> */
    public function contentKeys(): array
    {
        return match ($this) {
            self::Text => ['html'],
            self::Image => ['imageUrl', 'altText'],
            self::Chart => ['chartType', 'title', 'labels', 'values'],
        };
    }
}
