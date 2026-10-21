<?php

declare(strict_types=1);

namespace DashboardBuilder\Domain;

enum ElementType: string
{
    case Text = 'text';
    case Image = 'image';
    case Chart = 'chart';
}
