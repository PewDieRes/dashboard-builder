import { createNode } from '../dom/createNode.js';

const BLUR_DETACH_DELAY_MILLISECONDS = 150;

export class TextElementRenderer {
    #richTextToolbar;

    constructor(richTextToolbar) {
        this.#richTextToolbar = richTextToolbar;
    }

    render(containerNode, element, context) {
        const editableNode = createNode('div', {
            className: 'text-element',
            attributes: { contenteditable: 'true', spellcheck: 'false' },
        });
        editableNode.innerHTML = element.content.html;
        let blurTimerHandle = null;

        editableNode.addEventListener('input', () => {
            context.layoutStore.updateElement(
                context.sectionClientId,
                context.elementClientId,
                { content: { html: editableNode.innerHTML } },
                'content',
            );
        });
        editableNode.addEventListener('focus', () => {
            clearTimeout(blurTimerHandle);
            this.#richTextToolbar.attachTo(editableNode);
        });
        editableNode.addEventListener('blur', () => {
            blurTimerHandle = setTimeout(() => this.#richTextToolbar.detachIfIdle(), BLUR_DETACH_DELAY_MILLISECONDS);
        });
        editableNode.addEventListener('paste', event => this.#pastePlainText(event));

        containerNode.append(editableNode);
        return () => {
            clearTimeout(blurTimerHandle);
            this.#richTextToolbar.detach();
        };
    }

    #pastePlainText(event) {
        event.preventDefault();
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    }
}
