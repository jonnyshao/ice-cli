'use strict';

const path = require('path');
const cp = require('child_process');

const Package = require('@ice-cli/package');
const log = require('@ice-cli/log');

const SETTINGS = {
  // init: '@ice-cli/init',
  init: 'wefetch',
};

const CACHE_DIR = 'dependencies';

async function exec() {
  const homePath = process.env.CLI_HOME_PATH;
  let targetPath = process.env.CLI_TARGET_PATH;
  log.verbose('targetPath', targetPath);
  log.verbose('homePath', homePath);
  const cmd = arguments[arguments.length - 1];
  const cmdName = cmd.name();
  const packageName = SETTINGS[cmdName];
  const packageVersion = 'latest';
  let storeDir = '',
    pkg;
  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, 'node_modules');
    log.verbose('targetPath', targetPath);
    log.verbose('storeDir', storeDir);
    pkg = new Package({
      targetPath,
      storeDir,
      packageName,
      packageVersion,
    });

    if (await pkg.exists()) {
      await pkg.update();
    } else {
      await pkg.install();
    }
  } else {
    pkg = new Package({
      targetPath,
      homePath,
      packageName,
      packageVersion,
    });
    const rootFile = pkg.getRootFile();

    if (rootFile) {
      try {
        //  require(rootFile).call(null, Array.from(arguments));
        let args = Array.from(arguments);
        const cmd = args[args.length - 1];

        // const o = Object.create(null);
        // Object.keys(cmd).forEach((key) => {
        //   if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
        //     o[key] = cmd[key];
        //   }
        // });
        args = [args[0], cmd.opts()];

        const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
        const child = spawn('node', ['-e', code], { cwd: process.cwd(), stdio: 'inherit' });
        child.on('error', (e) => {
          log.error(e.message);
          process.exit(1);
        });
        child.on('exit', (e) => {
          log.verbose('命令执行成功', e);
          process.exit(e);
        });
      } catch (err) {
        log.error(err.message);
      }
    }
  }

  function spawn(comand, args, options) {
    const win32 = process.platform == 'win32';
    const cmd = win32 ? 'cmd' : comand;
    const cmdArgas = win32 ? ['/c'].concat(comand, args) : args;
    return cp.spawn(cmd, cmdArgas, options || {});
  }

  // TODO
  // targetPath => modulePath
  // modulePath -> Package (npm模块)
  // Package.getRootFile()
  // Package.update / Package
}

module.exports = exec;
