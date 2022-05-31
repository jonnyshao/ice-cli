'use strict';

const npmlog = require('npmlog');

npmlog.heading = 'ice';

npmlog.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

npmlog.addLevel('success', 2000, { fg: 'green', bold: true });

module.exports = npmlog;
