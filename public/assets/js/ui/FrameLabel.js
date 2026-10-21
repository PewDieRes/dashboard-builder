const UNTITLED_DASHBOARD_LABEL = 'Untitled dashboard';

export class FrameLabel {
    #labelNode;
    #layoutStore;

    constructor(labelNode, layoutStore) {
        this.#labelNode = labelNode;
        this.#layoutStore = layoutStore;
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail.reason));
    }

    #handleChange(reason) {
        if (reason === 'load' || reason === 'rename') {
            this.#labelNode.textContent = this.#layoutStore.getDashboardName() || UNTITLED_DASHBOARD_LABEL;
        }
    }
}
