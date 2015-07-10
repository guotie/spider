'use strict'

/*
    2015-06-24
    copy & modify from async queue
    add rps control: max request per second
 */

// rps: requests per second
// if rps < 0, then it control only 1 request in multi second
function _queue(worker, concurrency, payload, rps) {
  if (concurrency == null) {
    concurrency = 1;
  } else if (concurrency === 0) {
    throw new Error('Concurrency must not be zero');
  }

  if (!rps) {
    rps = concurrency;
  }
  var _isArray = Array.isArray || function(obj) {
    return _toString.call(obj) === '[object Array]';
  };

  var _setImmediate;
  if (typeof setImmediate === 'function') {
    _setImmediate = setImmediate;
  }

  if (typeof process === 'undefined' || !(process.nextTick)) {
    if (!_setImmediate) {
      _setImmediate = function(fn) {
        setTimeout(fn, 0);
      };
    }
  } else {
    _setImmediate = process.nextTick;
  }

  function _map(arr, iterator) {
    var index = -1,
      length = arr.length,
      result = Array(length);

    while (++index < length) {
      result[index] = iterator(arr[index], index, arr);
    }
    return result;
  }

  function _insert(q, data, pos, callback) {
    if (callback != null && typeof callback !== "function") {
      throw new Error("task callback must be a function");
    }
    q.started = true;
    if (!_isArray(data)) {
      data = [data];
    }
    if (data.length === 0 && q.idle()) {
      // call drain immediately if there are no tasks
      return _setImmediate(function() {
        q.drain();
      });
    }
    _arrayEach(data, function(task) {
      var item = {
        data: task,
        callback: callback || noop
      };

      if (pos) {
        q.tasks.unshift(item);
      } else {
        q.tasks.push(item);
      }

      if (q.tasks.length === q.concurrency) {
        q.saturated();
      }
    });
    _setImmediate(q.process);
  }

  function _arrayEach(arr, iterator) {
    var index = -1,
      length = arr.length;

    while (++index < length) {
      iterator(arr[index], index, arr);
    }
  }

  function only_once(fn) {
    var called = false;
    return function() {
      if (called) throw new Error("Callback was already called.");
      called = true;
      fn.apply(this, arguments);
    };
  }

  function _next(q, tasks) {
    return function() {
      workers -= 1;
      var args = arguments;
      _arrayEach(tasks, function(task) {
        task.callback.apply(task, args);
      });
      if (q.tasks.length + workers === 0) {
        q.drain();
      }
      q.process();
    };
  }

  function _quota(q) {
    return setInterval(function() {
      //console.log('set cur_quota to', q.rps, Math.floor(Date.now() / 1000))
      cur_quota = q.rps
      q.process()
    }, rps < 1 ? Math.floor(1.0 / rps) * 1000 : 1000)
  }

  var workers = 0,
    cur_quota = rps,
    noop = function() {};
  var q = {
    tasks: [],
    concurrency: concurrency,
    rps: rps < 1 ? 1 : rps,
    saturated: noop,
    empty: noop,
    drain: noop,
    started: false,
    paused: false,
    push: function(data, callback) {
      _insert(q, data, false, callback);
    },
    kill: function() {
      q.drain = noop;
      q.tasks = [];
      if (q.tmr) {
        clearInterval(q.tmr);
        q.tmr = null;
      }
    },
    unshift: function(data, callback) {
      _insert(q, data, true, callback);
    },

    process: function() {
      if (!q.tmr) {
        q.tmr = _quota(q);
        cur_quota = q.rps;
      }
      if (!q.paused && workers < q.concurrency && cur_quota > 0 && q.tasks.length) {
        while (workers < q.concurrency && cur_quota > 0 && q.tasks.length) {
          var tasks = payload ?
            q.tasks.splice(0, payload) :
            q.tasks.splice(0, q.tasks.length);

          var data = _map(tasks, function(task) {
            return task.data;
          });

          if (q.tasks.length === 0) {
            q.empty();
          }
          workers += 1;
          cur_quota -= 1;
          var cb = only_once(_next(q, tasks));
          worker(data, cb);
        }
      }
    },
    length: function() {
      return q.tasks.length;
    },
    running: function() {
      return workers;
    },
    idle: function() {
      return q.tasks.length + workers === 0;
    },
    pause: function() {
      if (q.tmr) {
        clearInterval(q.tmr);
        q.tmr = null;
      }
      q.paused = true;
    },
    resume: function() {
      if (q.paused === false) {
        return;
      }
      q.paused = false;
      var resumeCount = Math.min(q.concurrency, q.tasks.length);
      // Need to call q.process once per concurrent
      // worker to preserve full concurrency after pause
      for (var w = 1; w <= resumeCount; w++) {
        _setImmediate(q.process);
      }
    }
  };
  return q;
}

module.exports = function(worker, concurrency, rps) {
  var q = _queue(function(items, cb) {
    worker(items[0], cb);
  }, concurrency, 1, rps ? rps : concurrency);

  return q;
};
