'use strict';
const semver = require('semver');
const colors = require('colors');
const log = require('@ice-cli/log');
const { isPlainObject } = require('@ice-cli/utils');
const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error('参数不能为空!');
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须是个数组!');
    }
    if (argv.length < 1) {
      throw new Error('参数列表不能为空！');
    }
    this._argv = argv;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(this.checkNodeVersion);
      chain = chain.then(this.initArgs.bind(this));
      chain = chain.then(this.init.bind(this));
      chain = chain.then(this.exec.bind(this));
      chain.catch((err) => {
        log.error(err.message);
      });
    });
  }
  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }
  checkNodeVersion() {
    // get current node version
    const cv = process.version;
    // compare version
    const lv = LOWEST_NODE_VERSION;

    if (!semver.gte(cv, lv)) {
      throw new Error(colors.red(`ice-cli is require nodeJS ${lv} or later`));
    }
  }
  init() {
    throw new Error('init方法必须实现');
  }
  exec() {
    throw new Error('exec方法必须实现');
  }
}
module.exports = Command;
