'use strict';

const semver = require('semver');
const colors = require('colors');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const commander = require('commander');

const path = require('path');
const log = require('@ice-cli/log');
const exec = require('@ice-cli/exec');
const pkg = require('../package.json');

const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME } = require('./constant');

module.exports = ice;

const program = new commander.Command();

async function ice() {
  try {
    await prepare();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

async function prepare() {
  checkPkgVersion();
  checkRootAndDown();
  checkUserHome();
  checkEnv();
  // await checkGlobalUpdate();
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<comand> [option]')
    .version(pkg.version)
    .option('-d, --debug', 'Enable debugging mode?')
    .option('-tp, --targetPath <char>', 'Is the local debug file path specified?');

  program
    .command('init [projectName]')
    .option('-f, --force', 'Initialize the project?')
    .action(exec);

  program.on('option:debug', function () {
    const cmd = this.opts();
    // console.log(program);
    if (cmd.debug) {
      process.env.LOG_LEVEL = 'verbose';
    } else {
      process.env.LOG_LEVEL = 'info';
    }

    log.level = process.env.LOG_LEVEL;
  });
  // targetPath
  program.on('option:targetPath', function () {
    const { targetPath } = this.opts();
    process.env.CLI_TARGET_PATH = targetPath;
  });

  program.on('command:*', function (unCommand) {
    const avaliableCommands = program.commands.map((cmb) => cmb.name());
    console.log(colors.red('unknow commnad: ' + unCommand[0]));
    if (avaliableCommands.length) {
      console.log(colors.red(`avaliable commands:${avaliableCommands.join(',')}`));
    }
  });

  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }

  program.parse(process.argv);
}

function checkEnv() {
  const dotenvPath = path.resolve(userHome, '.env');
  const dotenv = require('dotenv');
  if (pathExists(dotenvPath)) {
    dotenv.config({ path: dotenvPath });
  } else {
    createDefaultConfig();
  }
}

async function checkGlobalUpdate() {
  const cv = pkg.version;
  const pkname = pkg.name;
  const { getNpmlatestVersion } = require('@ice-cli/npm');
  const lastVersion = await getNpmlatestVersion('1.0.0', pkname);
  if (lastVersion && semver.gt(lastVersion, cv)) {
    log.warn(
      colors.yellow(
        `New version detected, current version:${cv} latest version:${lastVersion}, update command: npm install -g ${pkname}`
      )
    );
  }
}

function createDefaultConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig['cliHome'] = path.join(userHome, DEFAULT_CLI_HOME);
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome;
  return cliConfig;
}

function checkUserHome() {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('The current user home directory does not exist'));
  }
}

function checkRootAndDown() {
  require('root-check')();
}

function checkNodeVersion() {
  // get current node version
  const cv = process.version;
  // compare version
  const lv = LOWEST_NODE_VERSION;

  if (!semver.gte(cv, lv)) {
    throw new Error(colors.red(`ice require nodeJS ${lv} or later`));
  }
}

function checkPkgVersion() {
  log.notice('cli', pkg.version);
}
