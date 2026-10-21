const SAVE_STATUS_LABELS = {
    saved: 'Saved',
    saving: 'Saving...',
    unsaved: 'Unsaved changes',
    error: 'Save failed',
};
const DEFAULT_NEW_DASHBOARD_NAME = 'Untitled dashboard';

export class Toolbar {
    #layoutStore;
    #apiClient;
    #notifier;
    #onDashboardChange;
    #onSaveRequested;
    #dashboardSelectNode;
    #dashboardNameInputNode;
    #saveStatusNode;

    constructor(rootNode, { layoutStore, apiClient, notifier, onDashboardChange, onSaveRequested = async () => true }) {
        this.#layoutStore = layoutStore;
        this.#apiClient = apiClient;
        this.#notifier = notifier;
        this.#onDashboardChange = onDashboardChange;
        this.#onSaveRequested = onSaveRequested;
        this.#dashboardSelectNode = rootNode.querySelector('#dashboard-select');
        this.#dashboardNameInputNode = rootNode.querySelector('#dashboard-name-input');
        this.#saveStatusNode = rootNode.querySelector('#save-status');
        this.#bindEvents(rootNode);
        this.#refreshControlAvailability();
    }

    async refreshDashboardList() {
        try {
            const dashboards = await this.#apiClient.listDashboards();
            this.#renderDashboardOptions(dashboards);
            return dashboards;
        } catch (error) {
            this.#notifier.error(error.message);
            return [];
        }
    }

    /** Resolves to true when the dashboard was loaded into the store. */
    async openDashboard(dashboardId) {
        try {
            this.#layoutStore.load(await this.#apiClient.getDashboard(dashboardId));
            this.#onDashboardChange(dashboardId);
            return true;
        } catch (error) {
            this.#notifier.error(error.message);
            return false;
        }
    }

    showSaveStatus(status) {
        this.#saveStatusNode.textContent = SAVE_STATUS_LABELS[status];
        this.#saveStatusNode.dataset.status = status;
    }

    #bindEvents(rootNode) {
        this.#dashboardSelectNode.addEventListener('change', () => this.#switchToSelectedDashboard());
        rootNode.querySelector('#new-dashboard-button').addEventListener('click', () => this.#createDashboard());
        this.#dashboardNameInputNode.addEventListener('input', () => {
            this.#layoutStore.renameDashboard(this.#dashboardNameInputNode.value);
        });
        rootNode.querySelector('#save-button').addEventListener('click', () => this.#onSaveRequested());
        this.#layoutStore.addEventListener('change', event => this.#handleStoreChange(event.detail.reason));
    }

    #handleStoreChange(reason) {
        if (reason === 'load' || reason === 'rename') {
            this.#syncDashboardName();
        }
        this.#refreshControlAvailability();
    }

    #syncDashboardName() {
        const name = this.#layoutStore.getDashboardName();
        if (this.#dashboardNameInputNode.value !== name) {
            this.#dashboardNameInputNode.value = name;
        }
        this.#dashboardSelectNode.value = String(this.#layoutStore.getDashboardId());
        const selectedOption = this.#dashboardSelectNode.selectedOptions[0];
        if (selectedOption) {
            selectedOption.textContent = name;
        }
    }

    #refreshControlAvailability() {
        this.#dashboardNameInputNode.disabled = this.#layoutStore.getDashboardId() === null;
    }

    #renderDashboardOptions(dashboards) {
        const currentDashboardId = this.#layoutStore.getDashboardId();
        this.#dashboardSelectNode.replaceChildren(
            ...dashboards.map(dashboard => new Option(dashboard.name, String(dashboard.id))),
        );
        if (currentDashboardId !== null) {
            this.#dashboardSelectNode.value = String(currentDashboardId);
        }
    }

    async #switchToSelectedDashboard() {
        const targetDashboardId = Number(this.#dashboardSelectNode.value);
        const isCurrentWorkSaved = await this.#onSaveRequested();
        const isOpened = isCurrentWorkSaved && await this.openDashboard(targetDashboardId);
        if (!isOpened) {
            this.#dashboardSelectNode.value = String(this.#layoutStore.getDashboardId());
        }
    }

    async #createDashboard() {
        const name = window.prompt('Dashboard name', DEFAULT_NEW_DASHBOARD_NAME)?.trim();
        if (!name || !await this.#onSaveRequested()) {
            return;
        }
        try {
            const dashboard = await this.#apiClient.createDashboard(name);
            await this.refreshDashboardList();
            await this.openDashboard(dashboard.id);
        } catch (error) {
            this.#notifier.error(error.message);
        }
    }
}
