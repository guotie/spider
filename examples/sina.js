'use strict';

var Spider = require('../spider').Spider,
    Crawler = require('../crawler'),
    cheerio = require("cheerio");

var urlparse = require('url').parse,
    urlformat = require('url').format,
    urlresolve = require('url').resolve;


var s = new Spider('http://www.sina.com.cn/'),
    w = new Crawler();


w.setRoute(/^\/$/, 'index').setRoute(/.*/, 'detail')
w.index = function (url, resp) {
    // body...
    let $ = cheerio.load(resp.body, {decodeEntities: false}),
        href = [],
        uri = this.uri,
        rooturl = urlformat(uri);

    $('a').each(function(idx, el) {
      let h = $(this).attr('href');
      if (!h) return;

      let hh = urlresolve(rooturl, h),
        hhuri = urlparse(hh);

      if (hhuri.host !== uri.host) {
        return;
      }

        href.push(hh.split('#')[0])
    })

    return href
}

w.detail = function (url, resp) {
    console.log(url)
    return []
}

s.start(w)
