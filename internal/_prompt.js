
const readline = require('readline')

module.exports = new class {

    _handlers = {}
    /** @type {string[]} */
    _chars = []
    _wantsExit = false;
    _closing = false;

    onExit = () => {}

    constructor() {

        /** @type {readline.Interface} */
        this.rl = readline.createInterface({
            input: process.stdin
        });
        
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);

        process.stdin.on('keypress', (string, key) => {

            // backslash - remove character
            switch (key.sequence) {

                // enter
                case '\r': {
                    let input = this._chars.join('').split(' ');
                    let command = input[0];
                    input.shift();
        
                    console.log('\n');
                    if (this._wantsExit) this._wantsExit = false;
                    else {
                        if (!this._handlers[command]) console.log('\x1b[31mUnknown command. Type "help" for a list of commands.\x1b[0m')
                        else this._handlers[command](input);
                    }

                    process.stdout.write('\n');
                    this._chars = [];
                    break;
                }

                // backspace
                case '\b': {
                    this._chars.pop();
                    this.displayText();
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
            
        });
    }

    displayText() {
        this._wantsExit 
            ? !this._closing && readline.cursorTo(process.stdout, 0, process.stdout.rows, () => {
                readline.clearLine(process.stdout, 0, () => {
                    process.stdout.write(`\x1b[31mAre you sure you want to exit? (yes: Ctrl+C no: Enter)\x1b[0m ${this._chars.join('')}`);
                })
            })
            : readline.cursorTo(process.stdout, 0, process.stdout.rows, () => {
                readline.clearLine(process.stdout, 0, () => {
                    process.stdout.write(this._chars.join(''));
                })
            });
        
    }

    /**
     * @param {string} command 
     * @param {(args: string[]) => any} callback 
     */
    on(command, callback) {
        this._handlers[command] = callback;
    }


}