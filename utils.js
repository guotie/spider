'use strict'

/*
 * helper
 */
function merge(obj) {
  var i = 1,
    target, key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}

module.exports.merge = merge
