'use strict';

const path = require('path');

module.exports = formatPath;

function formatPath(p) {
  // TODO
  if (p && typeof p == 'string') {
    const sep = path.sep;
    if (sep === '/') return p;
    return p.replace(/\\/g, '/');
  }
  return p;
}
