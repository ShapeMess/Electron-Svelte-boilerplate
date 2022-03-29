
const { spawn } = require('child_process');
const killProcess = require('tree-kill');

/** 
 * @param {string} command 
 * @param {string[]} argv 
 * @param {SpawnOptionsWithoutStdio?} options
 */
const subProcess = (command, argv, options) => spawn(command, argv, {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: true,
    ...options
});

module.exports = class {

    _onUxClose = [];
    _restarting = false;

    constructor(command, argv, options) {
        this._spawn = () => subProcess(command, argv, options);
        this._commandUsed = [command, ...argv].join(' ');
        this.process = this._spawn();
        this._addListeners();
    }

    restart() {
        if (!this._restarting) {
            this._restarting = true;
            killProcess(this.process.pid, (err) => {
                if (err) console.error('\x1b[31mCould not restart process:\x1b[0m', err);
                else {
                    this.process = this._spawn();
                    this._addListeners();
                    this._restarting = false;
                }
            });
        }
    }

    onClosed(callback) {
        this._onUxClose.push(callback);
    }

    _addListeners() {
        this.process.on('close', () => {
            if (!this._restarting) this._onUxClose.forEach(callback => callback());
        });
    }

}