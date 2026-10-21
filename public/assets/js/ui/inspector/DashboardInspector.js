import { createNode } from '../../dom/createNode.js';
import { createHint, createInspectorSection, createTextField } from '../formControls.js';

export class DashboardInspector {
    #layoutStore;

    constructor(layoutStore) {
        this.#layoutStore = layoutStore;
    }

    render() {
        const sections = this.#layoutStore.getSections();
        const elementCount = sections.reduce((total, section) => total + section.elements.length, 0);
        return [
            createInspectorSection('General', [
                createTextField({
                    label: 'Name',
                    readValue: () => this.#layoutStore.getDashboardName(),
                    applyValue: name => this.#layoutStore.renameDashboard(name),
                }),
            ]),
            createInspectorSection('Overview', [
                this.#createStatistic('Sections', sections.length),
                this.#createStatistic('Elements', elementCount),
                createHint('Select a section or an element on the canvas or in Layers to edit its properties.'),
            ]),
        ];
    }

    #createStatistic(label, count) {
        return createNode('div', { className: 'statistic-row' }, [
            createNode('span', { className: 'field-label', text: label }),
            createNode('span', { className: 'statistic-value', text: String(count) }),
        ]);
    }
}
