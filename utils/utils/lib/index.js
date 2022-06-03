'use strict';

const ora = require('ora');

function isPlainObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function sleep(time = 1000) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function createSpinner(text) {
  return ora(text).start();
}

function execShell(comand, args, options) {
  const win32 = process.platform == 'win32';
  const cmd = win32 ? 'cmd' : comand;
  const cmdArgas = win32 ? ['/c'].concat(comand, args) : args;
  return require('child_process').spawn(cmd, cmdArgas, options || {});
}

function execShellAsync(comand, args, options) {
  return new Promise((resolve, reject) => {
    const cp = execShell(comand, args, options);
    cp.on('error', reject);
    cp.on('exit', resolve);
  });
}

module.exports = {
  isPlainObject,
  createSpinner,
  sleep,
  execShell,
  execShellAsync,
};
