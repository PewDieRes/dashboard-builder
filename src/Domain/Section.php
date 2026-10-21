<?php

declare(strict_types=1);

namespace DashboardBuilder\Domain;

final readonly class Section
{
    /** @param list<Element> $elements */
    public function __construct(
        public ?int $id,
        public string $title,
        public int $gridColumn,
        public int $gridRow,
        public int $columnSpan,
        public int $rowSpan,
        public array $elements,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            isset($data['id']) ? (int) $data['id'] : null,
            $data['title'],
            (int) $data['gridColumn'],
            (int) $data['gridRow'],
            (int) $data['columnSpan'],
            (int) $data['rowSpan'],
            array_map(Element::fromArray(...), $data['elements']),
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'gridColumn' => $this->gridColumn,
            'gridRow' => $this->gridRow,
            'columnSpan' => $this->columnSpan,
            'rowSpan' => $this->rowSpan,
            'elements' => array_map(static fn (Element $element): array => $element->toArray(), $this->elements),
        ];
    }

    /** @param list<Element> $elements */
    public function withElements(array $elements): self
    {
        return new self(
            $this->id,
            $this->title,
            $this->gridColumn,
            $this->gridRow,
            $this->columnSpan,
            $this->rowSpan,
            $elements,
        );
    }
}
