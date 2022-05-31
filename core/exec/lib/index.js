'use strict';

const path = require('path');

const Package = require('@ice-cli/package');
const log = require('@ice-cli/log');

const SETTINGS = {
  // init: '@ice-cli/init',
  init: 'wefetch',
};

module.exports = exec;

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
      console.log('更新package');
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
    const rootFiel = pkg.getRootFile();

    rootFiel && require(rootFiel).apply(null, arguments);
  }

  // TODO
  // targetPath => modulePath
  // modulePath -> Package (npm模块)
  // Package.getRootFile()
  // Package.update / Package
}
