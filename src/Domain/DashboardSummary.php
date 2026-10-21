<?php

declare(strict_types=1);

namespace DashboardBuilder\Domain;

final readonly class DashboardSummary
{
    public function __construct(
        public int $id,
        public string $name,
        public string $updatedAt,
    ) {
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'updatedAt' => $this->updatedAt,
        ];
    }
}
