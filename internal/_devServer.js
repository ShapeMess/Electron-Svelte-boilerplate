
const { watch, read } = require('fs');
const { join } = require('path');
const { program } = require('commander');
const { readFileSync } = require('fs');
const { parse } = require('yaml');
const prompt = require('./_prompt');
const Process = require('./_subProcess');
const treeKill = require('tree-kill');

program
    .option('-w, --watch', 'Watches crucial backend files for changes and restards Electron automatically.');

program.parse();

const options = program.opts();

prompt.on('reload', () => {
    if (!electron._restarting) electron.restart();
    else console.log(`\x1b[31mElectron is already reloading.\x1b[0m`)
})
prompt.on('watch', () => {
    if (!_watchingBackend) watchBackend();
    else console.log(`\x1b[31mAlready watching backend files.\x1b[0m`)
})
prompt.on('help', () => {
    console.log(
`\x1b[34mreload  -   \x1b[0mForces the Electron app to reload entirely (does not affect Svelte/TS compilers).
\x1b[34mwatch   -   \x1b[0mWatches specified directories and files for changes and reloads Electron automatically (list in internal/watchlist.yaml).
`
    );
})

prompt.onExit = () => killAll();

const root = join(__dirname, '..');

// Directories where to watch for changes after which
// Electron should be restarted.
const watched = parse(readFileSync(join(root, 'internal/watchlist.yaml'), { encoding: 'utf-8'}));
 
let _closing = false;
let _ensDelayReady = true;
let _watchingBackend = false;
/** 
 * Ensures a function is only called at most once per second.
 * @param {Function} callback 
 */
const ensureDelay = (callback) => {
    if (_ensDelayReady) {
        _ensDelayReady = false;
        callback();
        setTimeout(() => _ensDelayReady = true, 1000);
    }
};


/**
 * Kills all child processes (Electron, Svelte and TS compiler)
 * @param {number} excludedPID 
 */
function killAll(excludedPID) {
    if (!_closing) {

        _closing = true;
        let threads = [electron, svelteServer, tsCompiler];
        let counter = 0;

        const kill = () => {
            if (counter === threads.length) {
                process.exit()
            }
            else {
                if (threads[counter].process.pid !== excludedPID) {
                    treeKill(threads[counter].process.pid, (err) => {
                        if (err) console.error(err);
                        kill(counter++);
                    });
                }
                else kill(counter++);
            }
        }

        kill();
    }
}

// Watch directories and restart Electron if set with --watch or -w
function watchBackend() {
    console.log('\x1b[31mEnabled live reload for backend files.\x1b[0m');
    _watchingBackend = true;

    watched.directories.forEach(dir => {
        watch(join(root, dir), { recursive: true }, (e, filename) => {
            ensureDelay(() => {

                console.log(`\x1b[31mBackend file change detected - Restarting Electron\n\x1b[0m`);
                electron.restart();

            });
        });
    })
}
if (options.watch) watchBackend();

// Electron
const electron = new Process('npm', ['run', 'electron']);

electron.onClosed(() => {
    console.log(`\n\x1b[31mKilled Electron.\x1b[0m`);
    killAll(electron.process.pid);
});

// Svelte dev server
const svelteServer = new Process('npm', ['run', 'svelte-dev']);

svelteServer.onClosed(() => {
    console.log(`\n\x1b[31mKilled Svelte.\x1b[0m`);
    killAll(svelteServer.process.pid);
});

// TypeScript compiler
const tsCompiler = new Process('tsc', ['-w'], { cwd: join(root, 'src') });

tsCompiler.onClosed(() => {
    console.log(`\n\x1b[31mKilled TS.\x1b[0m`);
    killAll(tsCompiler.process.pid);
});




