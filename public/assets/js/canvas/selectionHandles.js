import { createNode } from '../dom/createNode.js';

const CORNER_NAMES = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export function createSelectionHandleNodes() {
    return CORNER_NAMES.map(cornerName => createNode('span', {
        className: `selection-handle selection-handle-${cornerName}`,
        attributes: { 'aria-hidden': 'true' },
    }));
}
