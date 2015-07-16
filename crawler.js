'use strict';

var request = require('request'),
  urlparse = require('url').parse,
  urlresolve = require('url').resolve,
  Promise = require('es6-promise').Promise,
  logger = require('winston'),
  merge = require('./utils').merge

const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.8'
}

function BaseCrawler(options) {
  this.options = options || {
    req: {gzip: true}
  }
  this.headers = merge(defaultHeaders, this.options.headers || {})
  this.pools = {}
  this.routes = []

  this.routes = []
  if (this.options.routes) {
    this.setRoute(this.options.routes)
  }
}

BaseCrawler.prototype = {
  setUrl: function(url) {
    if (!url) {
      throw new Error('param url invalid')
    }
    if (typeof url === 'string') {
      if (url.indexOf('://') === -1)
        url = 'http://'+ url
      this.uri = urlparse(url)
      return this;
    }

    let uri;
    if (url instanceof Array) {
      for (var i = 0; i < url.length; i ++) {
        let u = url[i];
        if (u.indexOf('://') === -1)
          u = 'http://' + u;
        uri = urlparse(u)
        if (!this.uri) {
          this.uri = uri
        } else {
          if (this.uri.host !== uri.host) {
            throw new Error('host in urls should be equal');
          }
        }
      }
    }

    return this;
  },

  // reg: regexp to match url
  // cbn: callback name
  setRoute: function(reg, cbn) {
    if (reg instanceof RegExp || typeof reg === 'string') {
      if (!cbn) {
        throw new Error('param callback name invalid!')
      }
      if (typeof cbn !== 'string') {
        throw new Error('param callback name should be string')
      }
      if (typeof this[cbn] !== 'function') {
        throw new Error('param callback NOT exist in crawl this.')
      }
      if (typeof reg === 'string') {
        let r = new RegExp(reg.replace('/', '\\/'));
        this.routes.push([r, cbn])
      } else {
        this.routes.push([reg, cbn])
      }
    } else if (reg instanceof Array) {
      if (reg.length === 2 && (reg[0] instanceof Array) === false) {
        this.setRoute(reg[0], reg[1])
      } else {
        reg.forEach((item) => {this.setRoute(item)})
      }
    }

    return this;
  },

  // 由spider start时调用，设置crawler的cache
  setCache: function(c) {
    this.cache = c
    return this;
  },

  router: function(url) {
    let uri = urlparse(url);

    if (uri.host != this.uri.host)
      return;

    for (let i = 0; i < this.routes.length; i ++) {
      let rt = this.routes[i];

      if (rt[0].test(uri.path)) {
        return rt[1]
      }
    }

    return
  },

  index: function(url, resp) {
    return []
  },

  detail: function(uri, resp) {
    return []
  },

  fetch: function(url) {
    let self = this;

    return new Promise(function(resolve, reject) {
      let options = merge({
        url: url,
        headers: self.headers
      }, self.options.req || {})

      request(options, function(err, res, body) {
        if (err) {
          logger.error('request failed:', err)
          return reject(err);
        } else if (res.statusCode !== 200) {
          err = new Error("Unexpected status code: " + res.statusCode + " uri: " + options.url + "\n" + body);
          return reject(err);
        }

        // 设置cache，该url已经被crawl
        if (self.cache) {
          self.cache.update(options.url, {crawled: Date.now()})
        }

          //console.log(typeof res, typeof body, res.body === body);
        resolve(res);
      });
    });
  },

  handle: function(url) {
    let cbn = this.router(url),
      self = this;

    if (!cbn) {
      return Promise.reject('no callback for this url: ' + url);
    }

    if (!self[cbn]) {
      return Promise.reject('no callback method for this url: ' + url);
    }

    return self.fetch(url)
      .then(function(resp) {
        return self[cbn].call(self, url, resp)
      }).catch(function(err) {
        logger.error(err);
      })
  }
}

function ctor() {}

// 通过extend来扩展basecrawler，满足自己的需求
BaseCrawler.extend = function(protoProps) {
  var child;

  child = function() {
    BaseCrawler.apply(this, arguments);
  }

  for (var prop in BaseCrawler) {
    child[prop] = BaseCrawler[prop]
  }

  ctor.prototype = BaseCrawler.prototype;
  child.prototype = new ctor();

  if (protoProps) {
    for (var prop in protoProps) {
      //logger.info(prop)
      child.prototype[prop] = protoProps[prop]
    }
  }

  child.prototype.constructor = child;
  child.__super__ = BaseCrawler.prototype;

  return child;
}

module.exports = BaseCrawler
