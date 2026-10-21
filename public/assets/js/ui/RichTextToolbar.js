import { createNode } from '../dom/createNode.js';

const FONT_SIZES_PIXELS = [12, 14, 16, 20, 24, 32, 48];
const IDLE_DETACH_DELAY_MILLISECONDS = 150;

export class RichTextToolbar {
    #rootNode;
    #boldButtonNode;
    #italicButtonNode;
    #fontSizeSelectNode;
    #attachedNode = null;
    #savedRange = null;
    #selectionListener = () => {
        this.#rememberSelection();
        this.#refreshPressedState();
    };

    constructor(rootNode) {
        this.#rootNode = rootNode;
        this.#boldButtonNode = this.#createToggleButton('B', 'Bold', 'bold');
        this.#italicButtonNode = this.#createToggleButton('I', 'Italic', 'italic');
        this.#fontSizeSelectNode = this.#createFontSizeSelect();
        this.#rootNode.append(this.#boldButtonNode, this.#italicButtonNode, this.#fontSizeSelectNode);
        this.#rootNode.addEventListener('focusout', () => {
            setTimeout(() => this.detachIfIdle(), IDLE_DETACH_DELAY_MILLISECONDS);
        });
    }

    mountInto(hostNode) {
        hostNode.prepend(this.#rootNode);
    }

    attachTo(editableNode) {
        this.#attachedNode = editableNode;
        this.#rootNode.hidden = false;
        document.addEventListener('selectionchange', this.#selectionListener);
        this.#refreshPressedState();
    }

    detach() {
        this.#attachedNode = null;
        this.#savedRange = null;
        this.#rootNode.hidden = true;
        document.removeEventListener('selectionchange', this.#selectionListener);
    }

    /** Detaches unless focus is still inside the toolbar or the attached editable. */
    detachIfIdle() {
        const focusedNode = document.activeElement;
        const isFocusInside = this.#rootNode.contains(focusedNode) || this.#attachedNode?.contains(focusedNode);
        if (!isFocusInside) {
            this.detach();
        }
    }

    #createToggleButton(label, title, command) {
        const buttonNode = createNode('button', {
            className: 'rich-text-button',
            text: label,
            attributes: { type: 'button', title, 'aria-label': title, 'aria-pressed': 'false' },
        });
        buttonNode.addEventListener('mousedown', event => {
            event.preventDefault();
            document.execCommand(command);
            this.#refreshPressedState();
        });
        return buttonNode;
    }

    #createFontSizeSelect() {
        const optionNodes = FONT_SIZES_PIXELS.map(size => new Option(`${size}px`, String(size)));
        const selectNode = createNode('select', {
            className: 'rich-text-size-select',
            attributes: { 'aria-label': 'Font size' },
        }, [new Option('Size', ''), ...optionNodes]);
        selectNode.addEventListener('change', () => {
            if (selectNode.value) {
                this.#applyFontSize(Number(selectNode.value));
            }
            selectNode.value = '';
        });
        return selectNode;
    }

    #rememberSelection() {
        const selection = window.getSelection();
        const hasSelectionInside = selection.rangeCount > 0
            && this.#attachedNode?.contains(selection.getRangeAt(0).commonAncestorContainer);
        // Keep the last range inside the editor: focusing the font-size select moves the selection elsewhere.
        if (hasSelectionInside) {
            this.#savedRange = selection.getRangeAt(0).cloneRange();
        }
    }

    #refreshPressedState() {
        this.#boldButtonNode.setAttribute('aria-pressed', String(document.queryCommandState('bold')));
        this.#italicButtonNode.setAttribute('aria-pressed', String(document.queryCommandState('italic')));
    }

    #applyFontSize(sizePixels) {
        const range = this.#savedRange;
        if (!range || range.collapsed || !this.#attachedNode) {
            return;
        }
        const spanNode = createNode('span');
        spanNode.style.fontSize = `${sizePixels}px`;
        this.#wrapRange(range, spanNode);

        const selection = window.getSelection();
        selection.removeAllRanges();
        range.selectNodeContents(spanNode);
        selection.addRange(range);
        this.#savedRange = null;
        this.#attachedNode.dispatchEvent(new Event('input', { bubbles: true }));
    }

    #wrapRange(range, wrapperNode) {
        try {
            range.surroundContents(wrapperNode);
        } catch {
            wrapperNode.append(range.extractContents());
            range.insertNode(wrapperNode);
        }
    }
}
