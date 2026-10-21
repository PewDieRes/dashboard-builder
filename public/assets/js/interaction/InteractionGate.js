/** Enables drag and resize only while nothing is blocking it; each blocker is tracked by its own reason. */
export class InteractionGate {
    #dragResizeController;
    #blockingReasons = new Set();

    constructor(dragResizeController) {
        this.#dragResizeController = dragResizeController;
    }

    setBlocked(reason, isBlocked) {
        if (isBlocked) {
            this.#blockingReasons.add(reason);
        } else {
            this.#blockingReasons.delete(reason);
        }
        this.#dragResizeController.setEnabled(this.#blockingReasons.size === 0);
    }
}
