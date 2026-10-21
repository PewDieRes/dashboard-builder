const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class DummyDataGenerator {
    static generateSeries({ pointCount = 6, minimumValue = 50, maximumValue = 250 } = {}) {
        const labels = Array.from({ length: pointCount }, (unusedValue, pointIndex) => MONTH_NAMES[pointIndex % MONTH_NAMES.length]);
        const values = labels.map(() => DummyDataGenerator.#randomInteger(minimumValue, maximumValue));
        return { labels, values };
    }

    static #randomInteger(minimumValue, maximumValue) {
        return minimumValue + Math.floor(Math.random() * (maximumValue - minimumValue + 1));
    }
}
