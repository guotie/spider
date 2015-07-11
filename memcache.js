'use strict'

var merge = require('./utils').merge;

// use es6 Map
function MemoryCache () {
  this._cache = new Map();
}

MemoryCache.prototype.get = function(key) {
  return this._cache.get(key);
}

MemoryCache.prototype.set = function(key, val) {
  this._cache.set(key, val);
}

// memory cache ignore ns param
MemoryCache.prototype.hget = function(ns, key) {
  return this._cache.get(key);
}

MemoryCache.prototype.hset = function(ns, key, val) {
  this._cache.set(key, val);
}

MemoryCache.prototype.update = function(key, val) {
    let ov = this._cache.get(key);
  this._cache.set(key, merge(ov || {}, val));
}

MemoryCache.prototype.hupdate = function(ns, key, val) {
    let ov = this._cache.get(key);
  this._cache.set(key, merge(ov || {}, val));
}

MemoryCache.prototype.end = MemoryCache.prototype.quit = function() {
}

module.exports = MemoryCache