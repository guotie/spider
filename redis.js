var redis = require("redis"),
  client = redis.createClient();

function _get(uri) {
  // use promise...
  return new Promise(function(resolve, reject) {
    client.hget('spider', uri, function(err, reply) {
    if (err) return reject(err);
      resolve(reply)
    })
  })
}

function _set(uri) {
  client.hset('spider', uri, {
    'tm': Date.now()
  })
}

function _hkeys() {
  return new Promise(function(resolve, reject) {
    client.hkeys('spider', function(err, reply) {
      if (err) return reject(err);

      resolve(reply);
    })
  })
}

function _end() {
  client.end()
}

exports.get = _get
exports.set = _set
exports.end = _end
exports.hkeys = _hkeys

exports.del = function(key) {
  client.del(key)
}

exports.quit = function() {
  client.quit()
}
