import { ELEMENT_TYPE_LABELS } from './elementTypeLabels.js';

const MAXIMUM_LABEL_LENGTH = 28;

function extractPlainText(html) {
    return new DOMParser().parseFromString(html, 'text/html').body.textContent.trim();
}

function truncate(text) {
    return text.length > MAXIMUM_LABEL_LENGTH ? `${text.slice(0, MAXIMUM_LABEL_LENGTH - 1)}…` : text;
}

/** Short human label for an element: its text snippet, image alt text or chart title. */
export function describeElement({ elementType, content }) {
    const fallbackLabel = ELEMENT_TYPE_LABELS[elementType];
    const descriptiveText = {
        text: () => extractPlainText(content.html),
        image: () => content.altText?.trim(),
        chart: () => content.title?.trim(),
    }[elementType]?.();
    return descriptiveText ? truncate(descriptiveText) : fallbackLabel;
}
