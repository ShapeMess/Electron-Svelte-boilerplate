
const { watch, read } = require('fs');
const { join } = require('path');
const { program } = require('commander');
const { readFileSync } = require('fs');
const { parse } = require('yaml');
const c = require('chalk');
const Manager = require('@shapelessed/simple-dev-manager').default;
const prompt = require('./_prompt');

// Get spawn parameters
program.option('-w, --watch', 'Watches crucial backend files for changes and restards Electron automatically.');
program.parse();
const options = program.opts();

// Project root
const root = join(__dirname, '..');

// Directories where to watch for changes after which
// Electron should be restarted.
// Some files can not be reloaded seamlessly by electron-reload.
const props = parse(readFileSync(join(root, 'internal/props.yaml'), { encoding: 'utf-8' }));

// Ensures equal spaces in some of console logs
const fixedSpace = (spaces, string) => {
    const sl = string.length;
    const cap = x => x > 2 ? x : 2;
    return [string, Array(cap(spaces - sl)).join(' ')].join('');
}

// fs.watch can sometimes trigger more than once per file change
// so ensure electron reloads only once per second, ignoring all the duplicate calls.
let _ensDelayReady = true;
const ensureDelay = (callback) => {
    if (_ensDelayReady) {
        _ensDelayReady = false;
        callback();
        setTimeout(() => _ensDelayReady = true, 1000);
    }
};


// Determines whether the backend files are being watched and doesn't allow to re-watch them.
let _watchingBackend = false;

// Watch directories and restart Electron if set with --watch or -w
function watchBackend() {
    console.log(c.redBright('\nEnabled live reload for backend files.\n'));
    _watchingBackend = true;

    props.watch.forEach(dir => {
        watch(join(root, dir), { recursive: true }, (e, filename) => {
            ensureDelay(() => {

                console.log(c.redBright('Backend file change detected - Restarting Electron'));
                manager.process['electron'].restart();

            });
        });
    })
}
// Watch automatically if --watch parameter is present
if (options.watch) watchBackend();

// Create a manager for managing all the child processes
const manager = new Manager(props.scripts.map(script => {
    if (script.cwd) {
        script.options = {...script.options};
        script.options.cwd = join(root, script.cwd);
        delete script.cwd;
    }
    return script;
}));

manager.messages = {
    processSpawning:        'Starting %s.',
    processClosed:          'Process %s closed unexpectedly.',
    processForceClosed:     'Killed process %s.',
    processRestarting:      '\nRestarting process %s.',
    startSequenceError:     'An error had accured while spawning child processes.',
    startProcessSuccess:    'Successfully spawned all child processes.',
    managerExit:            'Closing the process manager.'
}

// Close all the child processes if user wants to exit the app.
prompt.onExit = () => manager.exit();

// Command handlers.
// Reload <name>
prompt.on('reload', async (argv) => {
    let status = await manager.restart(argv[0]);
    if (status === 'success') console.log(c.greenBright(`\nSuccessfully restarted process "${argv[0]}".\n`));
    if (status === 'failed') console.log(c.redBright(`\nFailed to restart process.\n`));
    if (status === 'unknown_name') console.log(c.redBright(`\nUnknown process. Type "list" for a list of running processes.\n`));
});

// Watch
prompt.on('watch', () => {
    if (!_watchingBackend) watchBackend();
    else console.log(c.redBright('\nAlready watching backend files.\n'))
});

// List
prompt.on('list', () => {
    let processes = [];

    const fs = (string) => fixedSpace(15, string);
    const s = (alive) => alive ? c.greenBright(fs('alive')) : c.redBright(fs('dead'));

    processes.push(c.redBright`${(fs('name'))} ${fs('status')} ${fs('command')}`);
    processes.push(`${(fs('-'))} ${fs('-')} ${fs('-')}`);

    for (const key in manager.process) {
        if (Object.hasOwnProperty.call(manager.process, key)) {
            const entry = manager.process[key];
            processes.push(`${c.blueBright(fs(entry.$spawnOptions.name))} ${s(entry.alive)} ${entry.$spawnCommand} ${c.grey(entry.$spawnArgv.join(' '))}`);
        }
    }

    console.log('');
    console.log(processes.join('\n'))
    console.log('');

});

prompt.on('help', () => {
    console.log(
c`
{blueBright list}            Lists all running child processes.
{blueBright reload <name>}   Reloads a given process.
{blueBright watch}           Watches files/directories specified in {underline internal/props.yaml} for changes and reloads Electron automatically.

{redBright Ctrl + C}        Shuts down all the child processes and exits the application.

`
    );
})

// Spawn all the child processes
manager.start();