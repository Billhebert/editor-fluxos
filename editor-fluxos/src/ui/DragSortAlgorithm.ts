export function getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
    const elements = [...container.querySelectorAll('.action-item:not(.dragging)')] as HTMLElement[];
    return elements.reduce<{ offset: number; element: HTMLElement | null }>((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}
