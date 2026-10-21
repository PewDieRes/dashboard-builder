const SAVED_REASONS = new Set(['structure', 'geometry', 'content', 'rename']);

export class AutosaveScheduler {
    #layoutStore;
    #apiClient;
    #delayMilliseconds;
    #onStatusChange;
    #notifier;
    #timerHandle = null;
    #inFlightSave = null;
    #hasUnsavedChanges = false;

    constructor(layoutStore, apiClient, { delayMilliseconds = 1500, onStatusChange = () => {}, notifier = null } = {}) {
        this.#layoutStore = layoutStore;
        this.#apiClient = apiClient;
        this.#delayMilliseconds = delayMilliseconds;
        this.#onStatusChange = onStatusChange;
        this.#notifier = notifier;
        layoutStore.addEventListener('change', event => this.#handleChange(event.detail.reason));
        window.addEventListener('beforeunload', event => this.#warnAboutUnsavedChanges(event));
    }

    /** Resolves to true when everything is persisted, false when the save failed. */
    async saveNow() {
        this.#cancelTimer();
        if (this.#layoutStore.getDashboardId() === null) {
            return true;
        }
        if (this.#inFlightSave) {
            return this.#inFlightSave;
        }
        if (!this.#hasUnsavedChanges) {
            return true;
        }
        this.#inFlightSave = this.#saveUntilSettled();
        try {
            return await this.#inFlightSave;
        } finally {
            this.#inFlightSave = null;
        }
    }

    #handleChange(reason) {
        if (reason === 'load') {
            this.#cancelTimer();
            this.#hasUnsavedChanges = false;
            this.#onStatusChange('saved');
            return;
        }
        if (!SAVED_REASONS.has(reason) || this.#layoutStore.getDashboardId() === null) {
            return;
        }
        this.#hasUnsavedChanges = true;
        if (this.#inFlightSave) {
            return;
        }
        this.#onStatusChange('unsaved');
        this.#scheduleSave();
    }

    #scheduleSave() {
        this.#cancelTimer();
        this.#timerHandle = setTimeout(() => this.saveNow(), this.#delayMilliseconds);
    }

    #cancelTimer() {
        clearTimeout(this.#timerHandle);
        this.#timerHandle = null;
    }

    async #saveUntilSettled() {
        do {
            this.#hasUnsavedChanges = false;
            this.#onStatusChange('saving');
            const isSaved = await this.#saveCurrentLayout();
            if (!isSaved) {
                this.#hasUnsavedChanges = true;
                this.#onStatusChange('error');
                return false;
            }
        } while (this.#hasUnsavedChanges);
        this.#onStatusChange('saved');
        return true;
    }

    async #saveCurrentLayout() {
        try {
            await this.#apiClient.saveLayout(this.#layoutStore.getDashboardId(), this.#layoutStore.getLayout());
            return true;
        } catch (error) {
            this.#notifier?.error(this.#describeError(error));
            return false;
        }
    }

    #describeError(error) {
        const firstDetailMessage = Object.values(error.details ?? {})[0];
        return firstDetailMessage ?? error.message;
    }

    #warnAboutUnsavedChanges(event) {
        if (this.#hasUnsavedChanges || this.#inFlightSave) {
            event.preventDefault();
            event.returnValue = '';
        }
    }
}
