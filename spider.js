'use strict'

const request = require('request'),
  util = require('util'),
  async = require('async'),
  Promise = require('es6-promise').Promise,
  redis = require('./redis'),
  queue = require('./queue'),
  merge = require('./utils').merge,
  logger = require('winston');

var retryError = new Error('should retry')

/*
  options:
    useragent: spider request header's User-Agent
    accept: spider request header's Accept field
    maxConnections: connections conncurrent
    maxRetry: max retry times on failure, set 0 or -1 means always retry
    maxPages: max pages the spider crawls, set 0 or -1 means no limit untill no page to crawl
    rps: max requests per second
 */
function Spider(site, options) {
  let defaultOpt = {
    maxConnections: 3,
    maxRetry: 3,
    maxPages: -1,
    rps: 0.5,
    timeout: 15000
  };

  if (!site) {
    throw new Error('param site should be supplied.');
    return
  }

  function _start(spd, handler) {
    spd.queue = new queue(handler, spd.options.maxConnections, spd.options.rps)
    if (typeof site === 'string') {
      spd.queue.push({
        url: site
      })
    } else {
      site.forEach(function(item) {
        spd.queue.push({
          url: item
        })
      })
    }

    spd.queue.process()
  }

  function _pause(spd) {
    spd.queue.pause()
  }

  function _resume(spd) {
    spd.queue.resume()
  }

  function _stop(spd) {
    spd.queue.kill()
    redis.end()
  }

  var crawledPages = 0
  var spdr = {
    options: merge(defaultOpt, options || {}),
    uniqeItems: function(items) {
      var m = {};
      items.forEach(function(item) {
        m[item] = true
      })
      return Object.keys(m)
    },
    // 与redis缓存中查找，该uri是否已经被爬取过
    uncrawledItems: function(items) {
      let nItems = [];

      return items.reduce(function(seq, item, idx) {
        return seq.then(function() {
          return redis.get(item)
        }).then(function(reply) {
          if (!reply) {
            //spdr.queue.push(item)
            nItems.push(item);
          }
          return nItems
        })
      }, Promise.resolve())
    },
    retry: function(uri) {
      spdr.queue.push(uri)
    },
    start: function(crawler) {
      _start(spdr, function(uri, cb) {
        let url = typeof uri === 'string' ? uri : uri.url;

        crawler.handle(url)
          .then(spdr.uniqeItems)
          .then(spdr.uncrawledItems)
          .then(function(val) {
            logger.info('crawl', url, 'complete.', val ? ' items to be crawled in this page: ' + val.length : '')
            if (val)
              spdr.queue.push(val)
            cb()
          })
          .catch(function(err) {
            logger.error('error occurs:', url, '\n', err, 'queue length:', spdr.queue.length())
            if (err instanceof Error && err === retryError) {
              logger.info('retry uri', url)
              spdr.retry(uri)
            }

            cb();
          })
      });


      async.whilst(function() {
        return spdr.queue.idle() === false;
      }, function(callback) {
        logger.info('spider idle state:', spdr.queue.idle(), 'queue length:', spdr.queue.length(), 'running workers:', spdr.queue.running())
        setTimeout(callback, 2000);
      }, function(err) {
        if (err) {
          console.log('error:', err)
        } else {
          console.log('complete. idle:', spdr.queue.idle(), 'queue length:', spdr.queue.length(), 'running workers:', spdr.queue.running())
        }
        _stop(spdr);
      })

    },

    stop: function() {
      _stop(spdr)
    },

    cycle: function(handler, interval) {
      if (!interval)
        interval = 600000;

      spdr.queue.drain = function() {
        spdr.stop();

        setTimeout(function() {
          spdr.queue.start(handler)
        }, interval)
      }

      spdr.start(handler);
    }
  }

  return spdr;
}

function requestp(options) {
  return new Promise(function(resolve, reject) {
    request(options, function(err, res, body) {
      if (err) {
        console.error('request failed:', err)
        return reject(err);
      } else if (res.statusCode !== 200) {
        err = new Error("Unexpected status code: " + res.statusCode + " uri: " + options.url + "\n" + body);
        //console.log(err)
        //err.res = res;
        return reject(err);
      }
      redis.set(options.url)
      //console.log(typeof res, typeof body, res.body === body);
      resolve(res);
    });
  });
}

function noop(err) {
  throw err;
}

// memory cache
function MemoryCache() {
  this._cache = new Map();
}

MemoryCache.prototype.get = function(key) {
  return this._cache.get(key);
}

MemoryCache.prototype.set = function(key, val) {
  // body...
  this._cache.set(key, val);
};

module.exports.Spider = Spider
module.exports.retryError = retryError
module.exports.MemoryCache = MemoryCache

