'use strict'

/*
  just test
  crawl http://v2ex.com/go/jobs
 */
var Spider = require('../spider').Spider,
  BaseCrawler = require('../crawler'),
  redis = require('../redis')(),
  url = require('url'),
  cheerio = require("cheerio"),
  Promise = require('es6-promise').Promise,
  merge = require('../utils').merge,
  extend = require('../utils').extend;

var errPath = new Error('This path not crawled.'),
  errHost = new Error('This host not crawled.');

var v2exHandle = function(resp) {
  let $;

  console.log('handle', url.format(resp.request.uri))

  function index_page() {
    let href = [];
    let host = url.format(resp.request.uri);
    let re = /^\/t\//;

    $('#TopicsNode').find('a').each(function(idx, el) {
      let h = $(this).attr('href'),
        hh;
      if (re.test(h)) {
        hh = url.resolve(host, h).split('#')[0]
        href.push(hh)
      }
    })
    console.log('handler index page ....', host, href.length)
    return href
  }

  // 提取author， topic， content
  function detail_page() {
    let author = {
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

    //storeResult(source, author, title, content)
    uploadDataSae({
      'userFrom': 'v2ex',
      'name': author.name,
      'avatar': author.avatar,
      'source': source,
      'title': title,
      'content': content,
      'surface_img': surface_img
    })

    //console.log('author:', author)
    //console.log('title:', title)
    //console.log('content:', content)
    //console.log('detail page:', resp.request.uri.path)
    //console.log(renderMD(convert2MD(content, {domain:'v2ex'})))

    return [];
  }

  function router(path) {
    if (/^\/$/.test(path)) {
      return index_page;
    }

    if (/^\/go\/jobs\/?/.test(path)) {
      return index_page;
    }

    if (/^\/t\//.test(path)) {
      return detail_page;
    }

    console.log('router:', path, 'not match any handler.')
    return null;
  }

  let host = resp.request.uri.host,
    path = resp.request.uri.path;

  if (host !== 'v2ex.com') {
    throw errHost;
    return;
  }
  let cb = router(path);
  if (cb === null) {
    throw errPath;
    return;
  }

  $ = cheerio.load(resp.body, {
    decodeEntities: false
  })

  return cb();
}

//

// 测试用：清除redis
redis.del('spider');

//let s = new Spider('http://v2ex.com/go/jobs');
//s.start(v2exHandle)


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
