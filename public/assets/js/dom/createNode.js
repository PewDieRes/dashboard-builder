export function createNode(tagName, { className = '', text = '', attributes = {} } = {}, childNodes = []) {
    const node = document.createElement(tagName);
    if (className) {
        node.className = className;
    }
    if (text) {
        node.textContent = text;
    }
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
        node.setAttribute(attributeName, attributeValue);
    }
    node.append(...childNodes);
    return node;
}
