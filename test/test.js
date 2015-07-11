var assert = require("assert")

describe('Crawler', function() {
    var BaseCrawler  = require('../crawler'),
        crawler = new BaseCrawler();

    describe('#route', function() {
        it('setRoute(regexp, string):', function() {
            crawler.setRoute(/^\/$/, 'index')
            crawler.setRoute(/^\/bbs/, 'detail')
            assert.equal('index', crawler.router('/'))
            assert.equal('detail', crawler.router('/bbs'))
        });

        it('setRoute(string, string):', function() {
            crawler.routes = []
            crawler.setRoute('/$', 'index')
            crawler.setRoute('/bbs', 'detail')
            assert.equal('index', crawler.router('/'))
            assert.equal('detail', crawler.router('/bbs'))
        });

        it('setRoute([string, string]):', function() {
            crawler.routes = []
            crawler.setRoute(['/$', 'index'])
            crawler.setRoute(['/bbs', 'detail'])
            assert.equal('index', crawler.router('/'))
            assert.equal('detail', crawler.router('/bbs'))
        });

        it('setRoute([[], []]):', function() {
            crawler.routes = []
            crawler.setRoute([['/$', 'index'], [/\/bbs/, 'detail']])

            assert.equal('index', crawler.router('/'))
            assert.equal('detail', crawler.router('/bbs'))
        })
    });
});
