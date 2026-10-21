import { createNode } from '../dom/createNode.js';
import { createIcon } from './icons.js';

const CARD_GROUPS = [
    {
        title: 'Layout',
        cards: [
            { label: 'Section', iconName: 'section', insert: inserter => inserter.addSection() },
        ],
    },
    {
        title: 'Content',
        cards: [
            { label: 'Text', iconName: 'text', insert: inserter => inserter.addElement('text') },
            { label: 'Image', iconName: 'image', insert: inserter => inserter.addElement('image') },
        ],
    },
    {
        title: 'Charts',
        cards: [
            {
                label: 'Bar chart',
                iconName: 'bar-chart',
                insert: inserter => inserter.addElement('chart', { chartType: 'bar' }),
            },
            {
                label: 'Line chart',
                iconName: 'line-chart',
                insert: inserter => inserter.addElement('chart', { chartType: 'line' }),
            },
        ],
    },
];

export class AddPanel {
    #layoutStore;
    #cardButtonNodes = [];

    constructor(rootNode, { layoutStore, elementInserter }) {
        this.#layoutStore = layoutStore;
        rootNode.replaceChildren(...CARD_GROUPS.map(group => this.#createGroup(group, elementInserter)));
        layoutStore.addEventListener('change', () => this.#refreshAvailability());
        this.#refreshAvailability();
    }

    #createGroup({ title, cards }, elementInserter) {
        const cardNodes = cards.map(card => this.#createCard(card, elementInserter));
        return createNode('section', { className: 'add-group' }, [
            createNode('h2', { className: 'panel-heading', text: title }),
            createNode('div', { className: 'add-card-grid' }, cardNodes),
        ]);
    }

    #createCard({ label, iconName, insert }, elementInserter) {
        const buttonNode = createNode('button', {
            className: 'add-card',
            attributes: { type: 'button', 'aria-label': `Add ${label.toLowerCase()}` },
        }, [createIcon(iconName), createNode('span', { className: 'add-card-label', text: label })]);
        buttonNode.addEventListener('click', () => insert(elementInserter));
        this.#cardButtonNodes.push(buttonNode);
        return buttonNode;
    }

    #refreshAvailability() {
        const hasDashboard = this.#layoutStore.getDashboardId() !== null;
        for (const buttonNode of this.#cardButtonNodes) {
            buttonNode.disabled = !hasDashboard;
        }
    }
}
