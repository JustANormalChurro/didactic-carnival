export class Input {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false,
            kick: false,
            punch: false,
            toggleCamera: false,
            wave: false,
            dance: false
        };

        this.keyMap = {
            'w': 'forward',
            's': 'backward',
            'a': 'left',
            'd': 'right',
            ' ': 'jump',
            'shift': 'sprint',
            'f': 'kick',
            'g': 'punch',
            'c': 'toggleCamera',
            '1': 'wave',
            '2': 'dance'
        };

        // Track pressed keys to avoid repeat firing for toggles if needed
        this.pressed = new Set();

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);

        this.addEventListeners();
    }

    addEventListeners() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    removeEventListeners() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }

    _onKeyDown(event) {
        const key = event.key.toLowerCase();

        // Handle Shift specifically since toLowerCase might not catch it uniformly depending on browser quirks, though typically it does.
        // event.key for Shift is "Shift".
        const mappedAction = this.keyMap[key] || this.keyMap[event.key.toLowerCase()];

        if (mappedAction) {
            this.keys[mappedAction] = true;
            this.pressed.add(mappedAction);
        }
    }

    _onKeyUp(event) {
        const key = event.key.toLowerCase();
        const mappedAction = this.keyMap[key] || this.keyMap[event.key.toLowerCase()];

        if (mappedAction) {
            this.keys[mappedAction] = false;
            this.pressed.delete(mappedAction);
        }
    }

    isPressed(action) {
        return this.keys[action];
    }
}
