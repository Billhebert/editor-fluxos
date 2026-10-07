import { normalizeKeyName } from './keyNames';

const KEYBOARD_LAYOUT = [
    ['Esc','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'],
    ['`','1','2','3','4','5','6','7','8','9','0','-','='],
    ['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
    ['CapsLock','A','S','D','F','G','H','J','K','L',';',"'",'Enter'],
    ['Shift','Z','X','C','V','B','N','M',',','.','/','Shift'],
    ['Ctrl','Alt','Win','Space','Win','Alt','Ctrl']
];

export class VirtualKeyboardView {
    render(container: HTMLElement, onKey: (key: string) => void): void {
        container.innerHTML = '';
        for (const row of KEYBOARD_LAYOUT) {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';
            for (const key of row) {
                const keyEl = document.createElement('button');
                keyEl.className = 'key-btn';
                keyEl.textContent = key;
                keyEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    onKey(normalizeKeyName(key));
                });
                rowEl.appendChild(keyEl);
            }
            container.appendChild(rowEl);
        }
    }
}
