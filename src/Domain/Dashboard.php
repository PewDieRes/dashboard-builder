<?php

declare(strict_types=1);

namespace DashboardBuilder\Domain;

final readonly class Dashboard
{
    /** @param list<Section> $sections */
    public function __construct(
        public ?int $id,
        public string $name,
        public array $sections,
        public ?string $updatedAt = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            isset($data['id']) ? (int) $data['id'] : null,
            trim($data['name']),
            array_map(Section::fromArray(...), $data['sections']),
            $data['updatedAt'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'updatedAt' => $this->updatedAt,
            'sections' => array_map(static fn (Section $section): array => $section->toArray(), $this->sections),
        ];
    }

    /** @param list<Section> $sections */
    public function withSections(array $sections): self
    {
        return new self($this->id, $this->name, $sections, $this->updatedAt);
    }

    public function withId(int $id): self
    {
        return new self($id, $this->name, $this->sections, $this->updatedAt);
    }
}
