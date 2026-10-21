<?php

declare(strict_types=1);

namespace DashboardBuilder\Service;

use DashboardBuilder\Domain\ElementType;

final class LayoutValidator
{
    private const MAXIMUM_NAME_LENGTH = 120;
    private const MAXIMUM_SECTIONS = 50;
    private const MAXIMUM_ELEMENTS_PER_SECTION = 50;
    private const GRID_COLUMN_COUNT = 12;
    private const MAXIMUM_ROW_SPAN = 200;
    private const MAXIMUM_Z_INDEX = 1000;
    private const PERCENT_TOLERANCE = 0.01;
    private const MAXIMUM_TEXT_HTML_LENGTH = 20000;
    private const MAXIMUM_ALT_TEXT_LENGTH = 200;
    private const MAXIMUM_CHART_POINTS = 24;
    private const CHART_TYPES = ['bar', 'line'];
    private const ALLOWED_IMAGE_URL_PREFIXES = ['/uploads/', '/assets/images/', 'https://'];

    /** @return array<string, string> field path => message; empty when valid */
    public function validate(array $layoutPayload): array
    {
        return $this->validateDashboardName($layoutPayload)
            + $this->validateSections($layoutPayload['sections'] ?? null);
    }

    /** @return array<string, string> */
    public function validateDashboardName(array $payload): array
    {
        $name = $payload['name'] ?? null;

        if (!is_string($name)) {
            return ['name' => 'Name must be text'];
        }

        $nameLength = mb_strlen(trim($name));
        if ($nameLength < 1 || $nameLength > self::MAXIMUM_NAME_LENGTH) {
            return ['name' => 'Name must be between 1 and 120 characters'];
        }

        return [];
    }

    /** @return array<string, string> */
    private function validateSections(mixed $sections): array
    {
        if (!is_array($sections) || !array_is_list($sections)) {
            return ['sections' => 'Sections must be a list'];
        }
        if (count($sections) > self::MAXIMUM_SECTIONS) {
            return ['sections' => 'A dashboard can have at most 50 sections'];
        }

        $errors = [];
        foreach ($sections as $sectionIndex => $section) {
            $errors += $this->validateSection($section, "sections.$sectionIndex");
        }

        return $errors;
    }

    /** @return array<string, string> */
    private function validateSection(mixed $section, string $path): array
    {
        if (!is_array($section)) {
            return [$path => 'Section must be an object'];
        }

        return $this->validateSectionTitle($section['title'] ?? null, $path)
            + $this->validateSectionGeometry($section, $path)
            + $this->validateElements($section['elements'] ?? null, $path);
    }

    /** @return array<string, string> */
    private function validateSectionTitle(mixed $title, string $path): array
    {
        if (!is_string($title) || mb_strlen($title) > self::MAXIMUM_NAME_LENGTH) {
            return ["$path.title" => 'Title must be text of at most 120 characters'];
        }

        return [];
    }

    /** @return array<string, string> */
    private function validateSectionGeometry(array $section, string $path): array
    {
        $errors = [];
        $gridColumn = $section['gridColumn'] ?? null;
        $columnSpan = $section['columnSpan'] ?? null;

        if (!$this->isIntegerWithin($gridColumn, 1, self::GRID_COLUMN_COUNT)) {
            $errors["$path.gridColumn"] = 'Grid column must be an integer from 1 to 12';
        }
        if (!$this->isIntegerWithin($columnSpan, 1, self::GRID_COLUMN_COUNT)) {
            $errors["$path.columnSpan"] = 'Column span must be an integer from 1 to 12';
        } elseif (!isset($errors["$path.gridColumn"]) && $gridColumn + $columnSpan - 1 > self::GRID_COLUMN_COUNT) {
            $errors["$path.columnSpan"] = 'Section extends beyond the 12 column grid';
        }
        if (!$this->isIntegerWithin($section['gridRow'] ?? null, 1, PHP_INT_MAX)) {
            $errors["$path.gridRow"] = 'Grid row must be an integer of at least 1';
        }
        if (!$this->isIntegerWithin($section['rowSpan'] ?? null, 1, self::MAXIMUM_ROW_SPAN)) {
            $errors["$path.rowSpan"] = 'Row span must be an integer from 1 to 200';
        }

        return $errors;
    }

    /** @return array<string, string> */
    private function validateElements(mixed $elements, string $path): array
    {
        if (!is_array($elements) || !array_is_list($elements)) {
            return ["$path.elements" => 'Elements must be a list'];
        }
        if (count($elements) > self::MAXIMUM_ELEMENTS_PER_SECTION) {
            return ["$path.elements" => 'A section can have at most 50 elements'];
        }

        $errors = [];
        foreach ($elements as $elementIndex => $element) {
            $errors += $this->validateElement($element, "$path.elements.$elementIndex");
        }

        return $errors;
    }

    /** @return array<string, string> */
    private function validateElement(mixed $element, string $path): array
    {
        if (!is_array($element)) {
            return [$path => 'Element must be an object'];
        }

        $elementType = is_string($element['elementType'] ?? null) ? ElementType::tryFrom($element['elementType']) : null;
        if ($elementType === null) {
            return ["$path.elementType" => 'Element type must be text, image or chart']
                + $this->validateElementGeometry($element, $path);
        }

        return $this->validateElementGeometry($element, $path)
            + $this->validateElementContent($elementType, $element['content'] ?? null, "$path.content");
    }

    /** @return array<string, string> */
    private function validateElementGeometry(array $element, string $path): array
    {
        $errors = [];

        $errors += $this->validateOffsetAndSize($element, $path, 'offsetXPercent', 'widthPercent');
        $errors += $this->validateOffsetAndSize($element, $path, 'offsetYPercent', 'heightPercent');
        if (!$this->isIntegerWithin($element['zIndex'] ?? null, 0, self::MAXIMUM_Z_INDEX)) {
            $errors["$path.zIndex"] = 'Layer must be an integer from 0 to 1000';
        }

        return $errors;
    }

    /** @return array<string, string> */
    private function validateOffsetAndSize(array $element, string $path, string $offsetKey, string $sizeKey): array
    {
        $errors = [];
        $offset = $element[$offsetKey] ?? null;
        $size = $element[$sizeKey] ?? null;

        if (!$this->isNumberWithin($offset, 0, 100)) {
            $errors["$path.$offsetKey"] = 'Offset must be a number from 0 to 100';
        }
        if (!$this->isNumber($size) || $size <= 0 || $size > 100) {
            $errors["$path.$sizeKey"] = 'Size must be a number greater than 0 and at most 100';
        } elseif (!isset($errors["$path.$offsetKey"]) && $offset + $size > 100 + self::PERCENT_TOLERANCE) {
            $errors["$path.$sizeKey"] = 'Element extends beyond the section edge';
        }

        return $errors;
    }

    /** @return array<string, string> */
    private function validateElementContent(ElementType $elementType, mixed $content, string $path): array
    {
        if (!is_array($content)) {
            return [$path => 'Content must be an object'];
        }

        return match ($elementType) {
            ElementType::Text => $this->validateTextContent($content, $path),
            ElementType::Image => $this->validateImageContent($content, $path),
            ElementType::Chart => $this->validateChartContent($content, $path),
        };
    }

    /** @return array<string, string> */
    private function validateTextContent(array $content, string $path): array
    {
        $html = $content['html'] ?? null;

        if (!is_string($html) || mb_strlen($html) > self::MAXIMUM_TEXT_HTML_LENGTH) {
            return ["$path.html" => 'Text must be at most 20000 characters'];
        }

        return [];
    }

    /** @return array<string, string> */
    private function validateImageContent(array $content, string $path): array
    {
        $errors = [];
        $imageUrl = $content['imageUrl'] ?? null;
        $altText = $content['altText'] ?? null;

        if (!is_string($imageUrl) || !$this->hasAllowedImageUrlPrefix($imageUrl)) {
            $errors["$path.imageUrl"] = 'Image URL must start with /uploads/, /assets/images/ or https://';
        }
        if (!is_string($altText) || mb_strlen($altText) > self::MAXIMUM_ALT_TEXT_LENGTH) {
            $errors["$path.altText"] = 'Alt text must be at most 200 characters';
        }

        return $errors;
    }

    /** @return array<string, string> */
    private function validateChartContent(array $content, string $path): array
    {
        $errors = [];
        $title = $content['title'] ?? null;

        if (!in_array($content['chartType'] ?? null, self::CHART_TYPES, true)) {
            $errors["$path.chartType"] = 'Chart type must be bar or line';
        }
        if (!is_string($title) || mb_strlen($title) > self::MAXIMUM_NAME_LENGTH) {
            $errors["$path.title"] = 'Chart title must be at most 120 characters';
        }

        return $errors + $this->validateChartSeries($content['labels'] ?? null, $content['values'] ?? null, $path);
    }

    /** @return array<string, string> */
    private function validateChartSeries(mixed $labels, mixed $values, string $path): array
    {
        $errors = [];

        if (!$this->isListOf($labels, is_string(...))) {
            $errors["$path.labels"] = 'Labels must be a list of text';
        }
        if (!$this->isListOf($values, $this->isNumber(...))) {
            $errors["$path.values"] = 'Values must be a list of numbers';
        }
        if ($errors !== []) {
            return $errors;
        }

        if (count($labels) < 1 || count($labels) > self::MAXIMUM_CHART_POINTS) {
            $errors["$path.labels"] = 'A chart needs between 1 and 24 data points';
        }
        if (count($labels) !== count($values)) {
            $errors["$path.values"] = 'Values must match the number of labels';
        }

        return $errors;
    }

    private function hasAllowedImageUrlPrefix(string $imageUrl): bool
    {
        foreach (self::ALLOWED_IMAGE_URL_PREFIXES as $allowedPrefix) {
            if (str_starts_with($imageUrl, $allowedPrefix)) {
                return true;
            }
        }

        return false;
    }

    private function isListOf(mixed $candidate, callable $itemCheck): bool
    {
        return is_array($candidate)
            && array_is_list($candidate)
            && count(array_filter($candidate, $itemCheck)) === count($candidate);
    }

    private function isNumber(mixed $candidate): bool
    {
        return is_int($candidate) || is_float($candidate);
    }

    private function isNumberWithin(mixed $candidate, int $minimum, int $maximum): bool
    {
        return $this->isNumber($candidate) && $candidate >= $minimum && $candidate <= $maximum;
    }

    private function isIntegerWithin(mixed $candidate, int $minimum, int $maximum): bool
    {
        return is_int($candidate) && $candidate >= $minimum && $candidate <= $maximum;
    }
}
