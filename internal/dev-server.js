
const { watch, read } = require('fs');
const { join } = require('path');
const { program } = require('commander');
const { readFileSync } = require('fs');
const { parse } = require('yaml');
const c = require('chalk');
const Manager = require('@shapelessed/simple-dev-manager').default;
const prompt = require('./prompt');

process.name = 'ESB Dev Server';

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
    console.log(c.redBright('Enabled live reload for backend files.'));
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
    processSpawning:        'Starting "%s".',
    processSpawned:         'Process "%s" started.',
    processRespawning:      'Reviving process "%s".',
    processClosed:          'Process "%s" closed unexpectedly.',
    processForceClosed:     'Killed process "%s".',
    processRestarting:      'Restarting process "%s".',
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
    if (status === 'success') console.log(c.greenBright(`Successfully restarted process "${argv[0]}".`));
    if (status === 'failed') console.log(c.redBright(`Failed to restart process.`));
    if (status === 'unknown_name') console.log(c.redBright(`Unknown process. Type "list" for a list of running processes.`));
});

// Kill <name>
prompt.on('kill', async (argv) => {
    let status = await manager.terminate(argv[0]);
    if (status === 'success') console.log(c.greenBright(`Successfully terminated process "${argv[0]}".`));
    if (status === 'failed') console.log(c.redBright(`Failed to terminate the process.`));
    if (status === 'unknown_name') console.log(c.redBright(`Unknown process. Type "list" for a list of running child processes.`));
});

// Revive <name>
prompt.on('revive', async (argv) => {
    let status = await manager.revive(argv[0]);
    if (status === 'not_terminated') console.log(c.redBright(`Could not revive "${argv[0]}" - Process is already running.`));
    if (status === 'unknown_name') console.log(c.redBright(`Unknown process. Type "list" for a list of running child processes.`));
});

// Watch
prompt.on('watch', () => {
    if (!_watchingBackend) watchBackend();
    else console.log(c.redBright('Already watching backend files.'))
});

// List
prompt.on('list', () => {
    let processes = [];

    // status colors
    const sc = { 'alive': c.greenBright, 'dead': c.redBright, 'terminated': c.yellowBright}
    const fs = (string) => fixedSpace(15, string);
    const s = (entry) => sc[entry.status](fs(entry.status));

    processes.push(c.grey`${(fs('name'))} ${fs('status')} ${fs('command')}`);
    processes.push(c.grey`${(fs('-'))} ${fs('-')} ${fs('-')}`);

    for (const key in manager.process) {
        if (Object.hasOwnProperty.call(manager.process, key)) {
            const entry = manager.process[key];
            processes.push(`${c.blueBright(fs(entry.$spawnOptions.name))} ${s(entry)} ${entry.$spawnCommand} ${c.grey(entry.$spawnArgv.join(' '))}`);
        }
    }

    console.log('');
    console.log(processes.join('\n'));
    console.log('');
    console.log(c.grey('TIP: Go to internal/props.yaml to manage running processes and reload the CLI'));
    console.log(c.grey('or use "kill <name>" to kill a specific process temporarily.'));
    console.log('');

});

prompt.on('help', () => {
    console.log(
c.grey`
{blueBright list}             · Lists all running child processes.
{blueBright reload <name>}    · Reloads a given process.
{blueBright kill   <name>}    · Terminate a process without closing the CLI.
{blueBright revive <name>}    · Revives a process previously killed with {underline kill <name>}.
{blueBright watch  <file?>}   · Watches a file|dir for changes and reloads Electron automatically. 
                 If no file is specified{underline internal/props.yaml}
                 for changes and reloads electron automatically.

{redBright Ctrl-C}           · Shuts down all the child processes and exits the application.

{whiteBright Arrows 🠕🠗}      · Look up and down quickly in the history of commands used
                 since the CLI app had started.

`
    );
})

// Spawn all the child processes
manager.start();
