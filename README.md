# Electron + Svelte boilerplate
This is a ready all-in-one boilerplate for developing Electron applications.

Everything you'll need to start working with Svelte, TypeScript and Sass is already configured. 
It comes with a basic CLI app that combines Svelte, TypeScript and Sass compilers together with Electron 
to one terminal window. It lets you reload Electron automatically on file changes and manage
child processes.

# Installation
Go to your project folder and install the boilerplate using Degit
```bash
npx degit ShapeMess/Electron-svelte-boilerplate ./
yarn (or) npm install
```
After installing all the dependencies you can run the included CLI with:
```bash
npm run dev
```

## CLI Configuration

The entire configuration for the CLI app is stored in `/internal/props.yaml`.

### Configuring child scripts:

Each child process running within the app, be it a TypeScript compiler or any other custom script
is being spawned with a command. 

Main properties are:
* name - The name used in the app to identify the process (should not contain spaces)
* command - The spawn command, eg. `node test.js --dev`.
* cwd - Working directory for the process to spawn in (relative to project root)
* options - Options used by the native `child_process.spawn`. Spawned using `shell:true` by default, stdout is piped to the main process to be displayed in the CLI. 
```yaml
scripts:
    -
        name: my-process
        command: node script.js
        cwd: /scripts
        options:
            env: ...
            stdio: ...

```

### Watchlist:
Unlike windows, or "tabs" created with `BrowserWindow`, some scripts are ran in the main thread.
These scripts can not be reloaded seamlessly without restarting the app manually.

Configuring the watchlist in `props.yaml` allows you to watch files and directories for changes
and reload Electron automatically like so:
```yaml
watch:
    - index.js
    - src/

```

You can watch files by running `watch` from within the CLI app or by spawning the app with a `--watch` parameter directly:
```bash
npm run dev -- --watch
```

---

### For individual configuration of Electron or the included compilers vist its documentation website.
