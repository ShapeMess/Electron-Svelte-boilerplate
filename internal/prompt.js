
const readline = require('readline');
const c = require('chalk');

function clearLine() {
    readline.cursorTo(process.stdout, 0, process.stdout.rows, () => {
        readline.clearLine(process.stdout, 0, () => {
            process.stdout.write(``);
        })
    });
}

// Limit the frequency with which the user can type in characters
// Ctrl-V does not always paste in contents but quickly paste in each character
// causing glitches
let _ensDelayReady = true;
const ensureDelay = (callback) => {
    if (_ensDelayReady) {
        _ensDelayReady = false;
        callback();
        setTimeout(() => _ensDelayReady = true, 20);
    }
};

// TODO: Add command history

module.exports = new class {

    _handlers = {}
    /** @type {string[]} */
    _chars = []
    _wantsExit = false;
    _closing = false;
    /** @type {string[][]} */
    _history = [];
    _historyIndex = 0;
    /** @type {string[][]} */
    _historyCache = [];

    onExit = () => {}

    constructor() {

        /** @type {readline.Interface} */
        this.rl = readline.createInterface({
            input: process.stdin
        });
        
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        process.stdin.on('keypress', (string, key) => {

            ensureDelay(() => {
                    // backslash - remove character
                switch (key.name) {

                    // enter
                    case 'return': {
                        this.historyAdd(this._chars);
                        this._historyIndex = this._history.length;
                        let input = this._chars.join('').split(' ');
                        let command = input[0];
                        input.shift();
            
                        if (this._wantsExit) {
                            this._wantsExit = false;
                            clearLine()
                        }
                        else if (this._chars.length > 0) {
                            if (!this._handlers[command]) {
                                console.log(c.redBright('\nUnrecognised command. Type "help" for a list of commands.'));
                            }
                            else {
                                process.stdout.write('\n');
                                this._handlers[command](input);
                            }
                        }

                        this._chars = [];
                        
                        break;
                    }

                    // backspace
                    case 'backspace': {
                        this._chars.pop();
                        this.displayText();
                        break;
                    }
                    
                    // backspace
                    case 'up': {
                        this.historyUp();
                        break;
                    }

                    // backspace
                    case 'down': {
                        this.historyDown();
                        break;
                    }

                    // Other chars
                    default: {

                        if (key.name === 'c' && key.ctrl) {
                            if (this._wantsExit === true && !this._closing) {
                                this._closing = true;
                                this.onExit();
                            }
                            this._wantsExit = true;
                        }
                        
                        // Make sure its a single character and not a special sequence
                        else if (key.sequence.length === 1) this._chars.push(key.sequence);
                        this.displayText();
                        break;
                    }
                }
            })
            
        });
    }

    /** @param {string[]} chars */
    historyAdd(chars) {
        let h = this._history;
        if (h[h.length-1] !== chars && chars.length > 0) {
            h.push(chars);
            this._historyIndex = h.length;
        }
    }

    historyUp() {
        if (this._historyIndex === this._history.length) {
            this._historyCache = this._chars;
        }
        if (this._historyIndex > 0) {
            this._historyIndex--;
            this._chars = this._history[this._historyIndex];
            this.displayText();
        }
    }
    historyDown() {
        if (this._historyIndex < this._history.length) {
            this._historyIndex++;

            if (this._historyIndex === this._history.length) this._chars = this._historyCache;
            else this._chars = this._history[this._historyIndex];

            this.displayText();
        }
    }

    displayText() {
        if (this._wantsExit) {
            if (!this._closing) {
                readline.cursorTo(process.stdout, 0, process.stdout.rows, () => {
                    readline.clearLine(process.stdout, 0, () => {
                        process.stdout.write(c.redBright('Are you sure you want to exit? (yes: Ctrl-C no: Enter) '));
                    })
                })
            }
        }
        else {
            readline.cursorTo(process.stdout, 0, process.stdout.rows, () => {
                readline.clearLine(process.stdout, 0, () => {
                    process.stdout.write(`${c.yellowBright('>')} ${this._chars.join('')}`);
                })
            });
        }
        
    }

    /**
     * @param {string} command 
     * @param {(args: string[]) => any} callback 
     */
    on(command, callback) {
        this._handlers[command] = callback;
    }


}