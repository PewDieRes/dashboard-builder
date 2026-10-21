import { applyBoxStyle } from '../canvas/elementBoxStyle.js';
import { clampElementBox, clampResizedElementBox, clampSectionPlacement, pixelsToPercent } from './geometry.js';

const SECTION_RESIZE_MARGIN_PIXELS = 10;
const ELEMENT_RESIZE_MARGIN_PIXELS = 6;
const INTERACTIVE_CONTROL_SELECTOR = 'button, input, select, textarea';

export class DragResizeController {
    #layoutStore;
    #columnCount;
    #rowHeightPixels;
    #isEnabled = true;
    #interactables = new Map();

    constructor(layoutStore, { columnCount = 12, rowHeightPixels = 10 } = {}) {
        this.#layoutStore = layoutStore;
        this.#columnCount = columnCount;
        this.#rowHeightPixels = rowHeightPixels;
    }

    attachSection(sectionNode, sectionClientId, gridNode) {
        const gesture = { startPlacement: null, deltaX: 0, deltaY: 0, metrics: null, placement: null };
        const begin = () => this.#beginSectionGesture(gesture, sectionClientId, gridNode);
        const commit = () => this.#commitSectionGesture(gesture, sectionClientId);
        const interactable = window.interact(sectionNode)
            .draggable({
                allowFrom: '.section-header',
                ignoreFrom: INTERACTIVE_CONTROL_SELECTOR,
                listeners: {
                    start: begin,
                    move: event => {
                        gesture.deltaX += event.dx;
                        gesture.deltaY += event.dy;
                        this.#previewSectionMove(sectionNode, gesture);
                    },
                    end: commit,
                },
            })
            .resizable({
                edges: { right: true, bottom: true },
                margin: SECTION_RESIZE_MARGIN_PIXELS,
                listeners: {
                    start: begin,
                    move: event => this.#previewSectionResize(sectionNode, gesture, event.rect),
                    end: commit,
                },
            });
        this.#register(sectionNode, interactable);
    }

    attachElement(frameNode, sectionClientId, elementClientId, sectionBodyNode) {
        const gesture = { rawBox: null, bodyRect: null, box: null };
        const begin = () => this.#beginElementGesture(gesture, sectionClientId, elementClientId, sectionBodyNode);
        const commit = () => this.#commitElementGesture(gesture, sectionClientId, elementClientId);
        const interactable = window.interact(frameNode)
            .draggable({
                listeners: {
                    start: event => {
                        if (this.#isDragSuppressed(event.event.target)) {
                            event.interaction.stop();
                            return;
                        }
                        begin();
                    },
                    move: event => this.#previewElementMove(
                        frameNode,
                        gesture,
                        { left: event.dx, top: event.dy, width: 0, height: 0 },
                    ),
                    end: commit,
                },
            })
            .resizable({
                edges: { left: true, right: true, top: true, bottom: true },
                margin: ELEMENT_RESIZE_MARGIN_PIXELS,
                listeners: {
                    start: begin,
                    move: event => this.#previewElementResize(frameNode, gesture, event.deltaRect, event.edges),
                    end: commit,
                },
            });
        this.#register(frameNode, interactable);
    }

    setEnabled(isEnabled) {
        this.#isEnabled = isEnabled;
        for (const interactable of this.#interactables.values()) {
            this.#applyEnabledState(interactable);
        }
    }

    detach(node) {
        this.#interactables.get(node)?.unset();
        this.#interactables.delete(node);
    }

    #register(node, interactable) {
        this.#interactables.set(node, interactable);
        this.#applyEnabledState(interactable);
    }

    #applyEnabledState(interactable) {
        interactable.draggable(this.#isEnabled);
        interactable.resizable(this.#isEnabled);
    }

    #isDragSuppressed(originalTarget) {
        if (originalTarget.closest('.element-drag-handle')) {
            return false;
        }
        if (originalTarget.closest(INTERACTIVE_CONTROL_SELECTOR)) {
            return true;
        }
        const editableNode = originalTarget.closest('[contenteditable="true"]');
        return editableNode !== null && editableNode === document.activeElement;
    }

    #beginSectionGesture(gesture, sectionClientId, gridNode) {
        const { gridColumn, columnSpan, gridRow, rowSpan } = this.#layoutStore.findSection(sectionClientId);
        gesture.startPlacement = { gridColumn, columnSpan, gridRow, rowSpan };
        gesture.deltaX = 0;
        gesture.deltaY = 0;
        gesture.metrics = this.#measureGrid(gridNode);
        gesture.placement = null;
    }

    #measureGrid(gridNode) {
        const gridWidth = gridNode.getBoundingClientRect().width;
        const columnGap = Number.parseFloat(getComputedStyle(gridNode).columnGap) || 0;
        const columnWidth = (gridWidth - columnGap * (this.#columnCount - 1)) / this.#columnCount;
        return { columnGap, columnPitch: columnWidth + columnGap, rowPitch: this.#rowHeightPixels };
    }

    #previewSectionMove(sectionNode, gesture) {
        const { startPlacement, metrics } = gesture;
        this.#applySectionPlacement(sectionNode, gesture, {
            ...startPlacement,
            gridColumn: startPlacement.gridColumn + Math.round(gesture.deltaX / metrics.columnPitch),
            gridRow: startPlacement.gridRow + Math.round(gesture.deltaY / metrics.rowPitch),
        });
    }

    #previewSectionResize(sectionNode, gesture, resizedRect) {
        const { startPlacement, metrics } = gesture;
        const requestedColumnSpan = Math.round((resizedRect.width + metrics.columnGap) / metrics.columnPitch);
        const maximumColumnSpan = this.#columnCount - startPlacement.gridColumn + 1;
        this.#applySectionPlacement(sectionNode, gesture, {
            ...startPlacement,
            columnSpan: Math.min(requestedColumnSpan, maximumColumnSpan),
            rowSpan: Math.round(resizedRect.height / metrics.rowPitch),
        });
    }

    #applySectionPlacement(sectionNode, gesture, requestedPlacement) {
        const placement = clampSectionPlacement(requestedPlacement);
        sectionNode.style.gridColumn = `${placement.gridColumn} / span ${placement.columnSpan}`;
        sectionNode.style.gridRow = `${placement.gridRow} / span ${placement.rowSpan}`;
        gesture.placement = placement;
    }

    #commitSectionGesture(gesture, sectionClientId) {
        if (gesture.placement) {
            this.#layoutStore.updateSection(sectionClientId, gesture.placement, 'geometry');
        }
    }

    #beginElementGesture(gesture, sectionClientId, elementClientId, sectionBodyNode) {
        const { offsetXPercent, offsetYPercent, widthPercent, heightPercent } =
            this.#layoutStore.findElement(sectionClientId, elementClientId);
        gesture.rawBox = { offsetXPercent, offsetYPercent, widthPercent, heightPercent };
        gesture.bodyRect = sectionBodyNode.getBoundingClientRect();
        gesture.box = null;
    }

    #accumulateRawBox(gesture, pixelDelta) {
        const { rawBox, bodyRect } = gesture;
        rawBox.offsetXPercent += pixelsToPercent(pixelDelta.left, bodyRect.width);
        rawBox.offsetYPercent += pixelsToPercent(pixelDelta.top, bodyRect.height);
        rawBox.widthPercent += pixelsToPercent(pixelDelta.width, bodyRect.width);
        rawBox.heightPercent += pixelsToPercent(pixelDelta.height, bodyRect.height);
    }

    #previewElementMove(frameNode, gesture, pixelDelta) {
        this.#accumulateRawBox(gesture, pixelDelta);
        gesture.box = clampElementBox(gesture.rawBox);
        applyBoxStyle(frameNode, gesture.box);
    }

    #previewElementResize(frameNode, gesture, pixelDelta, movingEdges) {
        this.#accumulateRawBox(gesture, pixelDelta);
        gesture.box = clampResizedElementBox(gesture.rawBox, movingEdges);
        applyBoxStyle(frameNode, gesture.box);
    }

    #commitElementGesture(gesture, sectionClientId, elementClientId) {
        if (gesture.box) {
            this.#layoutStore.updateElement(sectionClientId, elementClientId, gesture.box, 'geometry');
        }
    }
}
