'use strict';

var redis = require("redis"),
  merge = require('./utils').merge;

exports = function(port, host, options) {
  let client = redis.createClient(port, host, options);

  var r = {
    get: function(url) {
      return new Promise(function(resolve, reject) {
        client.get(url, function(err, reply) {
          if (err) return reject(err);
          resolve(reply)
        })
      })
    },
    hget: function(ns, key) {
      return new Promise(function(resolve, reject) {
        client.hget(ns, key, function(err, reply) {
          if (err) return reject(err);
          resolve(reply)
        })
      })
    },

    set: function(uri, value) {
      client.set(uri, merge({
        'tm': Date.now()
      }, value || {}))
    },
    hset: function(ns, uri, value) {
      client.hset(ns, uri, merge({
        'tm': Date.now()
      }, value || {}))
    },

    del: function(key) {
      client.del(key)
    },
    hdel: function(ns, key) {
      client.hdel(ns, key)
    },

    end: function() {
      client.end()
    },
    quit: function() {
      client.quit()
    }

  }

  return r;
}
