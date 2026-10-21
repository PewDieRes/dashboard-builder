import { findNextFreeRow } from '../interaction/geometry.js';
import { createDefaultElement } from './elementDefaults.js';

const NEW_SECTION_FIELDS = Object.freeze({ title: 'New section', gridColumn: 1, columnSpan: 6, rowSpan: 24 });

export class ElementInserter {
    #layoutStore;

    constructor(layoutStore) {
        this.#layoutStore = layoutStore;
    }

    addSection() {
        const sectionClientId = this.#layoutStore.addSection({
            ...NEW_SECTION_FIELDS,
            gridRow: findNextFreeRow(this.#layoutStore.getSections()),
            elements: [],
        });
        this.#layoutStore.select(sectionClientId);
        return sectionClientId;
    }

    /** Adds to the selected section, creating a section first when none is selected. */
    addElement(elementType, contentOverrides = {}) {
        const sectionClientId = this.#layoutStore.getSelection().sectionClientId ?? this.addSection();
        const elementClientId = this.#layoutStore.addElement(
            sectionClientId,
            createDefaultElement(elementType, contentOverrides),
        );
        this.#layoutStore.select(sectionClientId, elementClientId);
        return elementClientId;
    }
}
