#! /usr/bin/env node

const imortLocal = require('import-local');

if (imortLocal(__filename)) {
  require('npmlog').info('cli', 'using local version of ice');
} else {
  require('../lib')(process.argv.slice(2));
}
