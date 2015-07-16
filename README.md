# spider
spider in node.js

# features

# install

    npm install xspider

# usage

    `js
    var Spider = require('xspider').Spider,
        Crawler = require('xspider').Crawler;

    var s = new Spider('http://www.sina.com.cn/'),

see examples/v2ex.js

# API

## Spider

### start
    start(crawler)

start spider to crawl.
before start, you should set the spider's crawler instance, use crawler() method or call start with a crawler instance.

### stop
    stop()

stop spider.

### cycle
    cycle(crawler, interval)

### crawler
    crawler(crawl)

set or get the spider's crawler instance

### pause
    pause()

pause spider.

### resume
    resume()

resume a paused spider.

## Crawler

### setRoute

### router
    router(url)

return a crawler's method to handle this url.
crawler has two basic method: index, detail.

### fetch
    fetch(url)

internal used. this method return a promise instance.

### handle
    handle(url)

this method is an interface to handle a url.
internally, it first call router to find if there is a method to handle this url, if found, it first call fetch method, then use the method to handle to url and it's response.
