'use strict';

const Command = require('@ice-cli/command');
const log = require('@ice-cli/log');
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || '';
    this.force = !!this._cmd.force;

    log.verbose('projectName:', this.projectName);
    log.verbose('force:', this.force);
  }
  exec() {}
}

function init(argv) {
  return new InitCommand(argv);
}
module.exports = init;
module.exports.InitCommand = InitCommand;

// function init(proejctName, cmd) {
//   console.log('init', proejctName, cmd, process.env.CLI_TARGET_PATH);
//   // TODO
// }
