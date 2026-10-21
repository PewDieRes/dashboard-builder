<?php

declare(strict_types=1);

namespace DashboardBuilder\Domain;

final readonly class Element
{
    public function __construct(
        public ?int $id,
        public ElementType $elementType,
        public float $offsetXPercent,
        public float $offsetYPercent,
        public float $widthPercent,
        public float $heightPercent,
        public int $zIndex,
        public array $content,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            isset($data['id']) ? (int) $data['id'] : null,
            ElementType::from($data['elementType']),
            (float) $data['offsetXPercent'],
            (float) $data['offsetYPercent'],
            (float) $data['widthPercent'],
            (float) $data['heightPercent'],
            (int) $data['zIndex'],
            $data['content'],
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'elementType' => $this->elementType->value,
            'offsetXPercent' => $this->offsetXPercent,
            'offsetYPercent' => $this->offsetYPercent,
            'widthPercent' => $this->widthPercent,
            'heightPercent' => $this->heightPercent,
            'zIndex' => $this->zIndex,
            'content' => $this->content,
        ];
    }

    public function withContent(array $content): self
    {
        return new self(
            $this->id,
            $this->elementType,
            $this->offsetXPercent,
            $this->offsetYPercent,
            $this->widthPercent,
            $this->heightPercent,
            $this->zIndex,
            $content,
        );
    }
}
