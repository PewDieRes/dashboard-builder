import { createNode } from '../../dom/createNode.js';
import { createHint, createInspectorSection } from '../formControls.js';

export class TextInspector {
    #richTextToolbar;

    constructor(richTextToolbar) {
        this.#richTextToolbar = richTextToolbar;
    }

    render() {
        const toolbarHostNode = createNode('div', { className: 'rich-text-host' });
        this.#richTextToolbar.mountInto(toolbarHostNode);
        const hintNode = createHint('Click into the text to format it');
        hintNode.classList.add('rich-text-hint');
        toolbarHostNode.append(hintNode);
        return [createInspectorSection('Properties', [toolbarHostNode])];
    }
}
