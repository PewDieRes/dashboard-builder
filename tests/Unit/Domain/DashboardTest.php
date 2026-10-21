<?php

declare(strict_types=1);

namespace DashboardBuilder\Tests\Unit\Domain;

use DashboardBuilder\Domain\Dashboard;
use DashboardBuilder\Domain\ElementType;
use DashboardBuilder\Tests\Unit\Service\LayoutValidatorTest;
use PHPUnit\Framework\TestCase;

final class DashboardTest extends TestCase
{
    public function testFromArrayHydratesTypedElements(): void
    {
        $dashboard = Dashboard::fromArray(LayoutValidatorTest::validLayout());

        $firstElement = $dashboard->sections[0]->elements[0];
        self::assertSame(ElementType::Chart, $firstElement->elementType);
        self::assertSame(100.0, $firstElement->widthPercent);
        self::assertNull($firstElement->id);
    }

    public function testToArrayRoundTripsNamesNumbersAndContent(): void
    {
        $layout = LayoutValidatorTest::validLayout();

        $serialized = Dashboard::fromArray($layout)->toArray();

        self::assertSame('Sales Overview', $serialized['name']);
        self::assertNull($serialized['id']);
        self::assertNull($serialized['updatedAt']);
        $serializedElements = $serialized['sections'][0]['elements'];
        self::assertSame('chart', $serializedElements[0]['elementType']);
        self::assertSame(['Jan', 'Feb'], $serializedElements[0]['content']['labels']);
        self::assertSame([10, 20.5], $serializedElements[0]['content']['values']);
        self::assertSame(10.0, $serializedElements[1]['offsetXPercent']);
        self::assertSame(8, $serialized['sections'][0]['columnSpan']);
    }

    public function testWithMethodsReturnModifiedCopies(): void
    {
        $dashboard = Dashboard::fromArray(LayoutValidatorTest::validLayout());

        $identified = $dashboard->withId(7)->withSections([]);

        self::assertSame(7, $identified->id);
        self::assertSame([], $identified->sections);
        self::assertNull($dashboard->id);
        self::assertCount(1, $dashboard->sections);
    }

    public function testElementWithContentKeepsGeometry(): void
    {
        $element = Dashboard::fromArray(LayoutValidatorTest::validLayout())->sections[0]->elements[1];

        $changed = $element->withContent(['html' => '<p>Changed</p>']);

        self::assertSame(['html' => '<p>Changed</p>'], $changed->content);
        self::assertSame($element->offsetXPercent, $changed->offsetXPercent);
    }
}
