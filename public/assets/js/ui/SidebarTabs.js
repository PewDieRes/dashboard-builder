export class SidebarTabs {
    #tabNodes;
    #panelNodes;

    constructor(rootNode) {
        this.#tabNodes = [...rootNode.querySelectorAll('[data-tab]')];
        this.#panelNodes = [...rootNode.querySelectorAll('[data-tab-panel]')];
        for (const tabNode of this.#tabNodes) {
            tabNode.addEventListener('click', () => this.select(tabNode.dataset.tab));
        }
        this.select(this.#tabNodes[0].dataset.tab);
    }

    select(tabName) {
        for (const tabNode of this.#tabNodes) {
            tabNode.setAttribute('aria-selected', String(tabNode.dataset.tab === tabName));
        }
        for (const panelNode of this.#panelNodes) {
            panelNode.hidden = panelNode.dataset.tabPanel !== tabName;
        }
    }
}
