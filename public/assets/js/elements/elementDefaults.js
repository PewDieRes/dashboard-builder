const CONTENT_FACTORIES = {
    text: () => ({ html: '<p>Double-click to edit text</p>' }),
};

export function createDefaultElement(elementType) {
    const createContent = CONTENT_FACTORIES[elementType];
    if (!createContent) {
        throw new Error(`Unsupported element type: ${elementType}`);
    }
    return {
        elementType,
        offsetXPercent: 5,
        offsetYPercent: 5,
        widthPercent: 60,
        heightPercent: 40,
        content: createContent(),
    };
}
