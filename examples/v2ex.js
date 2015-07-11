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


var V2exCrawler = BaseCrawler.extend({
  index: function (url, resp) {
    let $ = cheerio.load(resp.body, {decodeEntities: false});
    let href = [];
    let uri = this.uri,
      rooturl = urlformat(uri);
    let re = /^\/t\//;

    //console.log(resp.body);
    $('#TopicsNode').find('a').each(function(idx, el) {
      let h = $(this).attr('href'),
        hh = urlresolve(rooturl, h),
        hhuri = urlparse(hh);

      //console.log(h, hh)
      if (hhuri.host !== uri.host) {
        return;
      }

      if (re.test(hhuri.path)) {
        href.push(hh.split('#')[0])
      }
    })
    console.log('handler index page ....', url, href.length)
    console.log(href)
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
    content = tbody.html();
    source = urlformat(resp.request.uri).split('#')[0];
    imgs = tbody.find('img');
    if (imgs.length > 0) {
      //console.log('img:', imgs.first())
      surface_img = imgs.first().attr('src')
    }

    console.log('author:', author.name, 'title:', title)

    return [];
  }
})

//

// 测试用：清除redis
// redis.del('spider');

let s = new Spider('http://v2ex.com/go/jobs');
let cv = new V2exCrawler();

cv.setRoute(/^\/t\//, 'detail').setRoute(/^\/go\/jobs/, 'index')
s.start(cv)

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