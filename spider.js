'use strict'

const request = require('request'),
  util = require('util'),
  async = require('async'),
  Promise = require('es6-promise').Promise,
  redis = require('./redis'),
  queue = require('./queue'),
  merge = require('./utils').merge,
  logger = require('winston'),
  MemCache = require('./memcache');

var RetryError = new Error('should retry')

/*
  site: a url or an array of urls, if is an array, the urls should in same domain

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

  this.site = site
  this.options = merge(defaultOpt, options || {})
  this.crawledPages = 0
  this.cache = this.options.cache || new MemCache();
}

Spider.prototype = {
  crawler: function() {
    let args = Array.prototype.slice.call(arguments);
    if (args.length === 0) {
      return this.crawler;
    }
    this.crawler = args[0]

    // set crawler's cache, url
    this.crawler
      .setCache(this.cache)
      .setUrl(this.site)
  },

  stop: function() {
    if (this.queue) {
      this.queue.kill()
    }
    this.cache.end()
  },

  start: function(crawl) {
    let crawler,
      spdr = this;

    if (crawl) {
      this.crawler(crawl)
    }

    if (!this.crawler) {
      throw new Error('crawler not set, should set crawler first')
      return
    }
    crawler = this.crawler;

    function _handler(uri, cb) {
      let url = typeof uri === 'string' ? uri : uri.url;

      crawler.handle(url)
        .then(function(items) {
          return spdr.uniqeItems(items)
        })
        .then(function(items) {
          return spdr.uncrawledItems(items)
        })
        .then(function(val) {
          logger.info('crawl', url, 'complete.', val ? ' items to be crawled in this page: ' + val.length : '')
          if (val)
            spdr.queue.push(val)
          cb()
        })
        .catch(function(err) {
          logger.error('error occurs:', url, '\n', err, 'queue length:', spdr.queue.length())
          logger.error('stack:')
          logger.error(err.stack)
          if (err instanceof Error && err === RetryError) {
            logger.info('retry uri', url)
            spdr.retry(uri)
          }

          cb();
        })
    }

    this.queue = new queue(_handler, this.options.maxConnections, this.options.rps)
    if (typeof spdr.site === 'string') {
      spdr.queue.push({
        url: spdr.site
      })
    } else {
      spdr.site.forEach(function(item) {
        spdr.queue.push({
          url: item
        })
      })
    }

    // 每2秒打印一次进度
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
      spdr.stop(spdr);
    })
  },

  pause: function() {
    if (this.queue) {
      this.queue.pause()
    }
  },

  resume: function() {
    if (this.queue) {
      this.queue.resume()
    }
  },

  retry: function(uri) {

  },

  cycle: function(crawler, interval) {
    let spdr = this;

    if (!interval)
      interval = 600000;

    spdr.queue.drain = function() {
      spdr.stop();

      setTimeout(function() {
        spdr.queue.start(handler)
      }, interval)
    }

    spdr.start(crawler);
  },

  // 去重
  uniqeItems: function(items) {
    var m = {};
    items.forEach(function(item) {
      m[item] = true
    })
    return Object.keys(m)
  },
  // 在spider缓存中查找，该uri是否已经被爬取过
  uncrawledItems: function(items) {
    let nItems = [],
      spdr = this;

    return items.reduce(function(seq, item, idx) {
      return seq.then(function() {
        return spdr.cache.get(item)
      }).then(function(reply) {
        if (!reply) {
          //spdr.queue.push(item)
          nItems.push(item);
        }
        return nItems
      })
    }, Promise.resolve())
  }
}

function ctor() {}

// 通过extend来扩展Spider，满足定制需求
Spider.extend = function(protoProps) {
  var child;

  child = function() {
    Spider.apply(this, arguments);
  }

  for (var prop in Spider) {
    child[prop] = Spider[prop]
  }

  ctor.prototype = Spider.prototype;
  child.prototype = new ctor();

  if (protoProps) {
    for (var prop in protoProps) {
      //logger.info(prop)
      child.prototype[prop] = protoProps[prop]
    }
  }

  child.prototype.constructor = child;
  child.__super__ = Spider.prototype;

  return child;
}

module.exports.Spider = Spider
module.exports.RetryError = RetryError
