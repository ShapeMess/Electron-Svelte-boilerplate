
const { watch, read } = require('fs');
const { join } = require('path');
const { program } = require('commander');
const { readFileSync } = require('fs');
const { parse } = require('yaml');
const c = require('chalk');
const Manager = require('@shapelessed/simple-dev-manager').default;
const prompt = require('./_prompt');

program
    .option('-w, --watch', 'Watches crucial backend files for changes and restards Electron automatically.');

program.parse();
const options = program.opts();

const root = join(__dirname, '..');

// Directories where to watch for changes after which
// Electron should be restarted.
const watched = parse(readFileSync(join(root, 'internal/watchlist.yaml'), { encoding: 'utf-8'}));
 
let _ensDelayReady = true;
let _watchingBackend = false;


const fixedSpace = (spaces, string) => {
    const sl = string.length;
    const cap = x => x > 2 ? x : 2;
    return [string, Array(cap(spaces - sl)).join(' ')].join('');
}


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

// Watch directories and restart Electron if set with --watch or -w
function watchBackend() {
    console.log(c.redBright('Enabled live reload for backend files.'));
    _watchingBackend = true;

    watched.directories.forEach(dir => {
        watch(join(root, dir), { recursive: true }, (e, filename) => {
            ensureDelay(() => {

                console.log(c.redBright('Backend file change detected - Restarting Electron'));
                manager.process['electron'].restart();

            });
        });
    })
}
if (options.watch) watchBackend();



const manager = new Manager([
    {
        name: 'tsc',
        command: 'tsc -w'
    },
    {
        name: 'electron',
        command: 'npm run electron'
    },
    {
        name: 'svelte',
        command: 'npm run svelte-dev'
    },
]);

manager.start();

prompt.onExit = () => {
    manager.exit();
}

prompt.on('reload', async (argv) => {
    let status = await manager.restart(argv[0]);
    console.log('');
    if (status === 'success') console.log(c.greenBright(`Successfully restarted process "${argv[0]}".`));
    if (status === 'failed') console.log(c.redBright(`Failed to restart process.`));
    if (status === 'unknown_name') console.log(c.redBright(`Unknown process name. Type "list" for a list of running processes.`));
});

prompt.on('watch', () => {
    if (!_watchingBackend) watchBackend();
    else console.log(c.redBright('\nAlready watching backend files.'))
});

prompt.on('list', () => {
    let processes = [];

    const fs = (string) => fixedSpace(15, string);
    const s = (alive) => alive ? c.greenBright(fs('alive')) : c.redBright(fs('dead'));

    processes.push(`${(fs('name'))} ${fs('status')} ${fs('command')}`);
    processes.push('')

    for (const key in manager.process) {
        if (Object.hasOwnProperty.call(manager.process, key)) {
            const entry = manager.process[key];
            processes.push(`${c.blueBright(fs(entry.$spawnOptions.name))} ${s(entry.alive)} ${entry.$spawnCommand} ${c.grey(entry.$spawnArgv.join(' '))}`);
        }
    }

    console.log('');
    console.log(processes.join('\n'))

});


prompt.on('help', () => {
    console.log(
c`
{blueBright reload <name>}  Reloads a given process.
{blueBright watch}           Watches files/directories specified in internal/watchlist.yaml for changes and reloads Electron automatically.
{blueBright list}            Lists all running child processes.
`
    );
})
