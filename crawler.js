'use strict';

var request = require('request'),
  urlparse = require('url').parse,
  urlresolve = require('url').resolve,
  Promise = require('es6-promise').Promise,
  logger = require('winston'),
  redis = require('/redis')

const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/43.0.2357.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate',
  'Accept-Language': 'zh-CN,zh;q=0.8'
}

function BaseCrawler(domain, options) {
  this.options = options
  this.headers = merge(defaultHeaders, this.options.headers || {})
  this.pools = {}

  if (domain.indexOf('://') === -1) {
    domain = 'http://' + domain
  }
  this.uri = urlparse(domain)
}

BaseCrawler.prototype = {
  router: function(url) {
    return 'index'
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
      let options = {
        url: url,
        headers: self.headers
      }

      request(options, function(err, res, body) {
        if (err) {
          logger.error('request failed:', err)
          return reject(err);
        } else if (res.statusCode !== 200) {
          err = new Error("Unexpected status code: " + res.statusCode + " uri: " + options.url + "\n" + body);
          return reject(err);
        }
        redis.set(options.url)
          //console.log(typeof res, typeof body, res.body === body);
        resolve(res);
      });
    });
  }

    handle: function(url) {
    let cbn = this.router(url),
      self = this;

    if (!cbn) return;
    if (!self[cbn]) return;

    return self.fetch(url)
      .then(function(resp) {
        return self[cbn].call(self, url, resp)
      }).catch(function(err) {
        logger.error(err);
      })
  }
}

module.exports = BaseCrawler
