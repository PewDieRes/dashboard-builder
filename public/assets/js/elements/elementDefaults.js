import { DummyDataGenerator } from './DummyDataGenerator.js';

const CONTENT_FACTORIES = {
    text: () => ({ html: '<p>Double-click to edit text</p>' }),
    image: () => ({ imageUrl: '/assets/images/sample-banner.svg', altText: 'Placeholder image' }),
    chart: () => ({ chartType: 'bar', title: 'New chart', ...DummyDataGenerator.generateSeries() }),
};

export function createDefaultElement(elementType, contentOverrides = {}) {
    const createContent = CONTENT_FACTORIES[elementType];
    if (!createContent) {
        throw new Error(`Unsupported element type: ${elementType}`);
    }
    return {
        elementType,
        offsetXPercent: 5,
        offsetYPercent: 5,
        widthPercent: 60,
        heightPercent: 40,
        content: { ...createContent(), ...contentOverrides },
    };
}
