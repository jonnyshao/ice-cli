'use strict';

function isPlainObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

module.exports = {
  isPlainObject,
};
