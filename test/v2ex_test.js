'use strict'

/*
  just test
  crawl http://v2ex.com/go/jobs
 */
var Spider = require('../spider').Spider,
  BaseCrawler = require('../crawler'),
  urlparse = require('url').parse,
  urlformat = require('url').format,
  urlresolve = require('url').resolve,
  redis = require('../redis'),

  cheerio = require("cheerio"),
  Promise = require('es6-promise').Promise,
  merge = require('../utils').merge,
  extend = require('../utils').extend;

var errPath = new Error('This path not crawled.'),
  errHost = new Error('This host not crawled.');

console.log(redis);

var V2exCrawler = BaseCrawler.extend({
  index: function (url, resp) {
    let $ = cheerio.load(resp.body, {decodeEntities: false});
    let href = [];
    let uri = this.uri;
    let re = /^\/t\//;

    //console.log(resp);
    $('#TopicsNode').find('a').each(function(idx, el) {
      let h = $(this).attr('href'),
        hh = urlresolve(uri, h);

      if (hh.host != uri.host) {
        return;
      }

      if (re.test(hh.path)) {
        href.push(urlformat(hh).split('#')[0])
      }
    })
    console.log('handler index page ....', url, href.length)
    return href
  },

  detail: function (url, resp) {
    let $ = cheerio.load(resp.body, {decodeEntities: false}),
      author = {
        source: 'v2ex.com'
      },
      title = '',
      content = '',
      imgs,
      surface_img = '';

    let source,
      thdr = $('div.header'),
      tbody = $('div.topic_content');

    title = thdr.find('>h1').text();
    author.name = thdr.find('.gray').find('a').text();
    author.avatar = thdr.find('.fr').find('img').attr('src');
    content = convert2MD(tbody.html(), {
      domain: 'v2ex',
      'subtle': $('.subtle')
    });
    source = url.format(resp.request.uri).split('#')[0];
    imgs = tbody.find('img');
    if (imgs.length > 0) {
      surface_img = imgs[0].attr('src')
    }

    console.log('author:', author, 'title:', title)

    return [];
  }
})

//

// 测试用：清除redis
// redis.del('spider');

let s = new Spider('http://v2ex.com/go/jobs');
s.start(new V2exCrawler())

/*
//['200755', '200702', '200749', '203613'].reduce(function(seq, item, idx) {
[ '203613'].reduce(function(seq, item, idx) {
    let opt = {
      url: 'http://v2ex.com/t/' + item,
      timeout: 15000
    };

    //console.log(idx, opt, seq)
    return seq
      .then(function() {
        return requestp(opt)
      })
      .then(v2exHandle)
      .catch(function(err) {
        console.error(err)
      })
  }, Promise.resolve())
  .then(redis.end)
*/