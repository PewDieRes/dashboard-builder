export class ElementRendererRegistry {
    #renderers = new Map();

    register(elementType, renderer) {
        this.#renderers.set(elementType, renderer);
    }

    render(containerNode, element, context) {
        const renderer = this.#renderers.get(element.elementType);
        if (!renderer) {
            containerNode.textContent = 'Unsupported element';
            return () => {};
        }
        return renderer.render(containerNode, element, context);
    }
}
