//  Fluxi v1.1.7
//  https://github.com/vigneshwaransivasamy/fluxi
//  (c)2017 Vigneshwaran Sivasamy
//  Fluxi may be freely distributed under the MIT license.

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.fluxi = {})));
}(this, (function (exports) { 'use strict';

function curryN(fn) {
    return function () {
        if (fn.length == arguments.length) return fn(...arguments);else return fn.bind(null, ...arguments);
    };
}

function buildLogs(rest) {
  var log = [];
  var restLength = rest.length;
  let i = 0;
  for (; i < restLength;) {
    log.push(rest[i]);
    i++;
  }
  return log;
}
function debug(...rest) {
  var logs = buildLogs(rest);
  logs.splice(0, 0, window.performance ? ' : ' + (window.performance.now() / 1000).toFixed(3) + ': ' : ' : ' + Date() + ' : ');
  console.log(...logs);
}

function filler() {
    return '__EMPTY__';
}

function pipe2(fn1, fn2) {
  return function () {
    return fn2.call(this, fn1.apply(this, arguments));
  };
}

/**
 * Legacy methods and private methods are prefixed with _(underscore).
 */

const is = type => target => Object(target) instanceof type;

const isBoolean = target => is(Boolean)(target);

/**
 * 
 * Usage: Synchronous pipe will works exacly as you think
 *          that this will wait for each action to get completed
 * 
 * var joinActions = syncPipe2(timer1,timer2,timer3);
 * 
 * joinActions() //     -> you can either just initate the action
 * 
 * joinActions().then(  // -> Add a listener to get the completed status
 *      function(){
 *      console.log("Completed!")
 * });
 * 
 * @param {*Function} fn1 
 * @param {*Function} fn2 
 * 
 * @return Promise
 */

function syncPipe2(fn1, fn2) {
    return function () {
        return new Promise((resolve, reject) => {
            fn1.apply(this, arguments).then(function (data) {
                resolve(fn2.call(this, data));
            }).catch(reject);
            return fn2;
        });
    };
}

/**
 * 
 * Usage: Asychronous pipe which just bilds multiple
 *          Functions to one and wait for command
 * 
 * var joinActions = pipeN(addOne, addTwo, addThree);
 * joinActions();
 * 
 * @param {*Function} fn1 
 * @param {*Function} fn2 
 * 
 * @return Promise
 */

function pipeN() {
    var isAsync;
    if (isBoolean(arguments[0])) {
        isAsync = arguments[0];
        Array.prototype.shift.call(arguments);
    } else {
        isAsync = true;
    }
    var args = arguments;
    var i = 0;
    var length = arguments.length;
    var lastResult = arguments[0];
    var _pipe2 = isAsync ? pipe2 : syncPipe2;
    if (length == 1) return arguments[0];
    if (length == 2) return _pipe2(args[0], args[1]);
    for (; i < length - 1;) {
        lastResult = _pipe2(lastResult, args[i + 1]);
        i++;
    }

    return lastResult;
}

function syncPipeN() {
    Array.prototype.unshift.call(arguments, false);
    return pipeN.apply(this, arguments);
}

function randomToken(length) {
    var hash = '';
    var language = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

    for (var offset = 0; offset < length; offset++) hash += language.charAt(Math.floor(Math.random() * language.length));

    return hash;
}

var toString = Object.prototype.toString;
const isObject = target => toString.call(target) === '[object Object]';

const isString = target => is(String)(target);

var hash32 = () => randomToken(32);

function _proxyObjectProperty(data, subscribers) {
    for (var key in data) {
        if (isObject(data[key])) {
            data[key] = proxr(data[key], subscribers);
        } else {
            // do nothing
        }
    }
    return data;
}

function unsubscribe(id, subscribers) {
    if (subscribers.has(id)) {
        return subscribers.delete(id);
    } else {
        return new Error('Type Error: subscriber should be of type Function');
    }
}

function __pubsub__(data, subscribers) {
    data.subscribe = function (fn) {
        if (is(Function)(fn)) {
            var id = hash32();
            subscribers.set(id, fn);
            return unsubscribe.bind(this, id, subscribers);
        } else {
            return new Error('Type Error: subscriber should be of type Function');
        }
    };
    return data;
}

function proxr(data, _subscribers) {
    var isRoot = !_subscribers;
    var subscribers = _subscribers ? _subscribers : new Map();
    var _handler = {
        get: function get(target, key) {
            return target[key];
        },
        set: function set(target, key, value) {
            var action = null,
                oldValue = null,
                actionData = {};
            if (!target[key]) {
                action = 'NEW';
                target[key] = isString(value) ? value : proxr(value, subscribers);
            } else {
                action = 'UPDATE';
                oldValue = target[key];
                if (oldValue == value) {
                    // Do nothing if the value are same
                    return;
                }
                target[key] = value;
            }

            // actionData = {
            //     'action': action,
            //     'actionRoot': target,
            //     'key': key,
            //     'value': value
            // };

            actionData = target[key];

            if (action == 'update') {
                actionData.oldValue = oldValue;
            }
            notify(actionData);
            return target[key];
        }
    };

    function notify(data) {
        subscribers.forEach(function (fn) {
            fn(data);
        });
    }

    data = new Proxy(_proxyObjectProperty(data, subscribers), _handler);

    return isRoot ? __pubsub__(data, subscribers) : data;
}

/**
 * 
 * How to use? 
 * 
 * 
 * -----------------------------------
 * Object ot intrest
 * -----------------------------------
 * var x = {
 *  userName: "vignesh", 
 *  password: "testing", 
 *  address: {
 *    test:{
 *      test:{
 *        test:"test"
 *      }
 *    }
 *  }
 * }
 * ----------------------------------
 * 
 * 
 * ----------------------------------
 * Proxing object of intrest
 * ----------------------------------
 * x = global.proxr(x)
 * ----------------------------------
 * 
 * ----------------------------------
 * @method subscribe
 * @return String{hashId} 
 * @action It returns the hashId of the 
 * subscription which is used to unsubscribe
 * 
 * var unsubscribe = x.subscribe(function(data){
 *  console.log(data)
 * });
 * ----------------------------------
 * 
 * ----------------------------------
 * @method unsubscribe
 * @return Boolean{isUnsubascribed}  
 * @action Removes the handler from the 
 * subscribers map.
 * 
 * unsubscribe();
 * ----------------------------------
 * 
 */

const isArray = target => is(Array)(target);

var toString$1 = Object.prototype.toString;

const isDate = target => toString$1.call(target) === '[object Date]';

const isFunction = target => is(Function)(target);

var toString$2 = Object.prototype.toString;

const isNaN = target => toString$2.call(target) === '[object NaN]';

var toString$3 = Object.prototype.toString;

const isNull = target => toString$3.call(target) === '[object Null]';

const isNumber = target => is(Number)(target);

var toString$4 = Object.prototype.toString;

const isPromise = target => toString$4.call(target) === '[object Promise]';

const isRegex = target => is(RegExp)(target);

var toString$5 = Object.prototype.toString;

const isSymbol = target => toString$5.call(target) === '[object Symbol]';

var toString$6 = Object.prototype.toString;

const isUndefined = target => toString$6.call(target) === '[object Undefined]';

exports.curry = curryN;
exports.debug = debug;
exports.filler = filler;
exports.pipe2 = pipe2;
exports.pipeN = pipeN;
exports.syncPipe2 = syncPipe2;
exports.syncPipeN = syncPipeN;
exports.proxr = proxr;
exports.is = is;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isDate = isDate;
exports.isFunction = isFunction;
exports.isNaN = isNaN;
exports.isNull = isNull;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isPromise = isPromise;
exports.isRegex = isRegex;
exports.isString = isString;
exports.isSymbol = isSymbol;
exports.isUndefined = isUndefined;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmx1eGkuanMiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jdXJyeS5qcyIsIi4uL3NvdXJjZS9kZWJ1Zy5qcyIsIi4uL3NvdXJjZS9maWxsZXIuanMiLCIuLi9zb3VyY2UvcGlwZTIuanMiLCIuLi9zb3VyY2UvaXMuanMiLCIuLi9zb3VyY2UvaXNCb29sZWFuLmpzIiwiLi4vc291cmNlL3N5bmNQaXBlMi5qcyIsIi4uL3NvdXJjZS9waXBlTi5qcyIsIi4uL3NvdXJjZS9zeW5jUGlwZU4uanMiLCIuLi9zb3VyY2UvcmFuZG9tVG9rZW4uanMiLCIuLi9zb3VyY2UvaXNPYmplY3QuanMiLCIuLi9zb3VyY2UvaXNTdHJpbmcuanMiLCIuLi9zb3VyY2UvcHJveHIuanMiLCIuLi9zb3VyY2UvaXNBcnJheS5qcyIsIi4uL3NvdXJjZS9pc0RhdGUuanMiLCIuLi9zb3VyY2UvaXNGdW5jdGlvbi5qcyIsIi4uL3NvdXJjZS9pc05hTi5qcyIsIi4uL3NvdXJjZS9pc051bGwuanMiLCIuLi9zb3VyY2UvaXNOdW1iZXIuanMiLCIuLi9zb3VyY2UvaXNQcm9taXNlLmpzIiwiLi4vc291cmNlL2lzUmVnZXguanMiLCIuLi9zb3VyY2UvaXNTeW1ib2wuanMiLCIuLi9zb3VyY2UvaXNVbmRlZmluZWQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3VycnlOKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGZuLmxlbmd0aCA9PSBhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIGZuKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBmbi5iaW5kKG51bGwsIC4uLmFyZ3VtZW50cyk7XG4gICAgfTtcbn0iLCJmdW5jdGlvbiBidWlsZExvZ3MocmVzdCl7XG4gIHZhciBsb2cgPSBbXTtcbiAgdmFyIHJlc3RMZW5ndGggPSByZXN0Lmxlbmd0aFxuICBsZXQgaSA9IDA7XG4gIGZvciAoIDtpIDwgcmVzdExlbmd0aDspIHtcbiAgICBsb2cucHVzaCggcmVzdFtpXSApO1xuICAgIGkrKztcbiAgfVxuICByZXR1cm4gbG9nO1xufVxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVidWcoLi4ucmVzdCkge1xuICB2YXIgbG9ncyA9IGJ1aWxkTG9ncyhyZXN0KTtcbiAgbG9ncy5zcGxpY2UoXG4gICAgMCwwLFxuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA/ICcgOiAnICsgKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnIFxuICAgIDogJyA6ICcgKyBEYXRlKCkgKyAnIDogJ1xuICApO1xuICBjb25zb2xlLmxvZyguLi5sb2dzKTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaWxsZXIoKXtcbiAgICByZXR1cm4gJ19fRU1QVFlfXyc7XG59IiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGlwZTIoZm4xLCBmbjIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZm4yLmNhbGwodGhpcywgZm4xLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9O1xufSIsIi8qKlxuICogTGVnYWN5IG1ldGhvZHMgYW5kIHByaXZhdGUgbWV0aG9kcyBhcmUgcHJlZml4ZWQgd2l0aCBfKHVuZGVyc2NvcmUpLlxuICovXG5cbmNvbnN0IGlzID0gdHlwZSA9PiB0YXJnZXQgPT4gT2JqZWN0KHRhcmdldCkgaW5zdGFuY2VvZiB0eXBlO1xuXG5leHBvcnQgZGVmYXVsdCBpcztcbiIsImltcG9ydCBpcyBmcm9tICcuL2lzLmpzJztcblxuY29uc3QgaXNCb29sZWFuID0gdGFyZ2V0ID0+IGlzKEJvb2xlYW4pKHRhcmdldCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQm9vbGVhbjsiLCIvKipcbiAqIFxuICogVXNhZ2U6IFN5bmNocm9ub3VzIHBpcGUgd2lsbCB3b3JrcyBleGFjbHkgYXMgeW91IHRoaW5rXG4gKiAgICAgICAgICB0aGF0IHRoaXMgd2lsbCB3YWl0IGZvciBlYWNoIGFjdGlvbiB0byBnZXQgY29tcGxldGVkXG4gKiBcbiAqIHZhciBqb2luQWN0aW9ucyA9IHN5bmNQaXBlMih0aW1lcjEsdGltZXIyLHRpbWVyMyk7XG4gKiBcbiAqIGpvaW5BY3Rpb25zKCkgLy8gICAgIC0+IHlvdSBjYW4gZWl0aGVyIGp1c3QgaW5pdGF0ZSB0aGUgYWN0aW9uXG4gKiBcbiAqIGpvaW5BY3Rpb25zKCkudGhlbiggIC8vIC0+IEFkZCBhIGxpc3RlbmVyIHRvIGdldCB0aGUgY29tcGxldGVkIHN0YXR1c1xuICogICAgICBmdW5jdGlvbigpe1xuICogICAgICBjb25zb2xlLmxvZyhcIkNvbXBsZXRlZCFcIilcbiAqIH0pO1xuICogXG4gKiBAcGFyYW0geypGdW5jdGlvbn0gZm4xIFxuICogQHBhcmFtIHsqRnVuY3Rpb259IGZuMiBcbiAqIFxuICogQHJldHVybiBQcm9taXNlXG4gKi9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3luY1BpcGUyKGZuMSwgZm4yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGZuMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmbjIuY2FsbCh0aGlzLCBkYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIGZuMjtcbiAgICAgICAgfSk7XG4gICAgfTtcbn0iLCIvKipcbiAqIFxuICogVXNhZ2U6IEFzeWNocm9ub3VzIHBpcGUgd2hpY2gganVzdCBiaWxkcyBtdWx0aXBsZVxuICogICAgICAgICAgRnVuY3Rpb25zIHRvIG9uZSBhbmQgd2FpdCBmb3IgY29tbWFuZFxuICogXG4gKiB2YXIgam9pbkFjdGlvbnMgPSBwaXBlTihhZGRPbmUsIGFkZFR3bywgYWRkVGhyZWUpO1xuICogam9pbkFjdGlvbnMoKTtcbiAqIFxuICogQHBhcmFtIHsqRnVuY3Rpb259IGZuMSBcbiAqIEBwYXJhbSB7KkZ1bmN0aW9ufSBmbjIgXG4gKiBcbiAqIEByZXR1cm4gUHJvbWlzZVxuICovXG5cblxuaW1wb3J0IHBpcGUyIGZyb20gJy4vcGlwZTInO1xuaW1wb3J0IGlzQm9vbGVhbiBmcm9tICcuL2lzQm9vbGVhbic7XG5pbXBvcnQgc3luY1BpcGUyIGZyb20gJy4vc3luY1BpcGUyJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGlwZU4oKSB7XG4gICAgdmFyIGlzQXN5bmM7XG4gICAgaWYgKGlzQm9vbGVhbihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIGlzQXN5bmMgPSBhcmd1bWVudHNbMF07XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zaGlmdC5jYWxsKGFyZ3VtZW50cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaXNBc3luYyA9IHRydWU7XG4gICAgfVxuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgbGFzdFJlc3VsdCA9IGFyZ3VtZW50c1swXTtcbiAgICB2YXIgX3BpcGUyID0gaXNBc3luYyA/IHBpcGUyIDogc3luY1BpcGUyO1xuICAgIGlmIChsZW5ndGggPT0gMSlcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICBpZiAobGVuZ3RoID09IDIpXG4gICAgICAgIHJldHVybiAoX3BpcGUyKGFyZ3NbMF0sIGFyZ3NbMV0pKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aCAtIDE7KSB7XG4gICAgICAgIGxhc3RSZXN1bHQgPSBfcGlwZTIobGFzdFJlc3VsdCwgYXJnc1tpICsgMV0pO1xuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxhc3RSZXN1bHQ7XG59IiwiaW1wb3J0IHBpcGVOIGZyb20gJy4vcGlwZU4nO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3luY1BpcGVOKCkge1xuICAgIEFycmF5LnByb3RvdHlwZS51bnNoaWZ0LmNhbGwoYXJndW1lbnRzLCBmYWxzZSk7XG4gICAgcmV0dXJuIHBpcGVOLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59IiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmFuZG9tVG9rZW4obGVuZ3RoKSB7XG4gICAgdmFyIGhhc2ggPSAnJztcbiAgICB2YXIgbGFuZ3VhZ2UgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODlfLSc7XG5cbiAgICBmb3IgKHZhciBvZmZzZXQgPSAwOyBvZmZzZXQgPCBsZW5ndGg7IG9mZnNldCsrKVxuICAgICAgICBoYXNoICs9IGxhbmd1YWdlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBsYW5ndWFnZS5sZW5ndGgpKTtcblxuICAgIHJldHVybiBoYXNoO1xufSIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5jb25zdCBpc09iamVjdCA9IHRhcmdldCA9PiB0b1N0cmluZy5jYWxsKHRhcmdldCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xuZXhwb3J0IGRlZmF1bHQgaXNPYmplY3Q7IiwiaW1wb3J0IGlzIGZyb20gJy4vaXMuanMnO1xuY29uc3QgaXNTdHJpbmcgPSB0YXJnZXQgPT4gaXMoU3RyaW5nKSh0YXJnZXQpO1xuXG5leHBvcnQgZGVmYXVsdCBpc1N0cmluZzsiLCJpbXBvcnQgaXMgZnJvbSAnLi9pcyc7XG5pbXBvcnQgcmFuZG9tVG9rZW4gZnJvbSAnLi9yYW5kb21Ub2tlbic7XG5pbXBvcnQgaXNPYmplY3QgZnJvbSAnLi9pc09iamVjdCc7XG5pbXBvcnQgaXNTdHJpbmcgZnJvbSAnLi9pc1N0cmluZyc7XG5cbnZhciBoYXNoMzIgPSAoKSA9PiByYW5kb21Ub2tlbigzMik7XG5cbmZ1bmN0aW9uIF9wcm94eU9iamVjdFByb3BlcnR5KGRhdGEsIHN1YnNjcmliZXJzKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGRhdGEpIHtcbiAgICAgICAgaWYoaXNPYmplY3QoZGF0YVtrZXldKSkge1xuICAgICAgICAgICAgZGF0YVtrZXldID0gcHJveHIoZGF0YVtrZXldLCBzdWJzY3JpYmVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIHVuc3Vic2NyaWJlKGlkLCBzdWJzY3JpYmVycykge1xuICAgIGlmIChzdWJzY3JpYmVycy5oYXMoaWQpKSB7XG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVycy5kZWxldGUoaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ1R5cGUgRXJyb3I6IHN1YnNjcmliZXIgc2hvdWxkIGJlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIF9fcHVic3ViX18oZGF0YSwgc3Vic2NyaWJlcnMpIHtcbiAgICBkYXRhLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICBpZiAoaXMoRnVuY3Rpb24pKGZuKSkge1xuICAgICAgICAgICAgdmFyIGlkID0gaGFzaDMyKCk7XG4gICAgICAgICAgICBzdWJzY3JpYmVycy5zZXQoaWQsIGZuKTtcbiAgICAgICAgICAgIHJldHVybiB1bnN1YnNjcmliZS5iaW5kKHRoaXMsIGlkLCBzdWJzY3JpYmVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVycm9yKCdUeXBlIEVycm9yOiBzdWJzY3JpYmVyIHNob3VsZCBiZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBkYXRhO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwcm94cihkYXRhLCBfc3Vic2NyaWJlcnMpIHtcbiAgICB2YXIgaXNSb290ID0gIV9zdWJzY3JpYmVycztcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3Vic2NyaWJlcnMgPyBfc3Vic2NyaWJlcnMgOiBuZXcgTWFwKCk7XG4gICAgdmFyIF9oYW5kbGVyID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCh0YXJnZXQsIGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIHNldCh0YXJnZXQsIGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb24gPSBudWxsLCBvbGRWYWx1ZSA9IG51bGwsIGFjdGlvbkRhdGEgPSB7fTtcbiAgICAgICAgICAgIGlmICghdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSAnTkVXJztcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogcHJveHIodmFsdWUsIHN1YnNjcmliZXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWN0aW9uID0gJ1VQREFURSc7XG4gICAgICAgICAgICAgICAgb2xkVmFsdWUgPSB0YXJnZXRba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAob2xkVmFsdWUgPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRG8gbm90aGluZyBpZiB0aGUgdmFsdWUgYXJlIHNhbWVcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhY3Rpb25EYXRhID0ge1xuICAgICAgICAgICAgLy8gICAgICdhY3Rpb24nOiBhY3Rpb24sXG4gICAgICAgICAgICAvLyAgICAgJ2FjdGlvblJvb3QnOiB0YXJnZXQsXG4gICAgICAgICAgICAvLyAgICAgJ2tleSc6IGtleSxcbiAgICAgICAgICAgIC8vICAgICAndmFsdWUnOiB2YWx1ZVxuICAgICAgICAgICAgLy8gfTtcblxuICAgICAgICAgICAgYWN0aW9uRGF0YSA9IHRhcmdldFtrZXldO1xuICAgICAgICAgICAgXG5cbiAgICAgICAgICAgIGlmIChhY3Rpb24gPT0gJ3VwZGF0ZScpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25EYXRhLm9sZFZhbHVlID0gb2xkVmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBub3RpZnkoYWN0aW9uRGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gdGFyZ2V0W2tleV07XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gbm90aWZ5KGRhdGEpIHtcbiAgICAgICAgc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGZuKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBkYXRhID0gbmV3IFByb3h5KF9wcm94eU9iamVjdFByb3BlcnR5KGRhdGEsIHN1YnNjcmliZXJzKSwgX2hhbmRsZXIpO1xuXG4gICAgcmV0dXJuIGlzUm9vdCA/IF9fcHVic3ViX18oZGF0YSwgc3Vic2NyaWJlcnMpIDogZGF0YTtcbn1cblxuXG4vKipcbiAqIFxuICogSG93IHRvIHVzZT8gXG4gKiBcbiAqIFxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIE9iamVjdCBvdCBpbnRyZXN0XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogdmFyIHggPSB7XG4gKiAgdXNlck5hbWU6IFwidmlnbmVzaFwiLCBcbiAqICBwYXNzd29yZDogXCJ0ZXN0aW5nXCIsIFxuICogIGFkZHJlc3M6IHtcbiAqICAgIHRlc3Q6e1xuICogICAgICB0ZXN0OntcbiAqICAgICAgICB0ZXN0OlwidGVzdFwiXG4gKiAgICAgIH1cbiAqICAgIH1cbiAqICB9XG4gKiB9XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBcbiAqIFxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogUHJveGluZyBvYmplY3Qgb2YgaW50cmVzdFxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogeCA9IGdsb2JhbC5wcm94cih4KVxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBAbWV0aG9kIHN1YnNjcmliZVxuICogQHJldHVybiBTdHJpbmd7aGFzaElkfSBcbiAqIEBhY3Rpb24gSXQgcmV0dXJucyB0aGUgaGFzaElkIG9mIHRoZSBcbiAqIHN1YnNjcmlwdGlvbiB3aGljaCBpcyB1c2VkIHRvIHVuc3Vic2NyaWJlXG4gKiBcbiAqIHZhciB1bnN1YnNjcmliZSA9IHguc3Vic2NyaWJlKGZ1bmN0aW9uKGRhdGEpe1xuICogIGNvbnNvbGUubG9nKGRhdGEpXG4gKiB9KTtcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIFxuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogQG1ldGhvZCB1bnN1YnNjcmliZVxuICogQHJldHVybiBCb29sZWFue2lzVW5zdWJhc2NyaWJlZH0gIFxuICogQGFjdGlvbiBSZW1vdmVzIHRoZSBoYW5kbGVyIGZyb20gdGhlIFxuICogc3Vic2NyaWJlcnMgbWFwLlxuICogXG4gKiB1bnN1YnNjcmliZSgpO1xuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogXG4gKi8iLCJpbXBvcnQgaXMgZnJvbSAnLi9pcy5qcyc7XG5cbmNvbnN0IGlzQXJyYXkgPSB0YXJnZXQgPT4gaXMoQXJyYXkpKHRhcmdldCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQXJyYXk7IiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuY29uc3QgaXNEYXRlID0gdGFyZ2V0ID0+IHRvU3RyaW5nLmNhbGwodGFyZ2V0KSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xuXG5leHBvcnQgZGVmYXVsdCBpc0RhdGU7IiwiaW1wb3J0IGlzIGZyb20gJy4vaXMuanMnO1xuXG5jb25zdCBpc0Z1bmN0aW9uID0gdGFyZ2V0ID0+IGlzKEZ1bmN0aW9uKSh0YXJnZXQpO1xuXG5leHBvcnQgZGVmYXVsdCBpc0Z1bmN0aW9uOyIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmNvbnN0IGlzTmFOID0gdGFyZ2V0ID0+IHRvU3RyaW5nLmNhbGwodGFyZ2V0KSA9PT0gJ1tvYmplY3QgTmFOXSc7XG5cbmV4cG9ydCBkZWZhdWx0IGlzTmFOOyIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmNvbnN0IGlzTnVsbCA9IHRhcmdldCA9PiB0b1N0cmluZy5jYWxsKHRhcmdldCkgPT09ICdbb2JqZWN0IE51bGxdJztcblxuZXhwb3J0IGRlZmF1bHQgaXNOdWxsOyIsImltcG9ydCBpcyBmcm9tICcuL2lzLmpzJztcblxuY29uc3QgaXNOdW1iZXIgPSB0YXJnZXQgPT4gaXMoTnVtYmVyKSh0YXJnZXQpO1xuXG5leHBvcnQgZGVmYXVsdCBpc051bWJlcjsiLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5jb25zdCBpc1Byb21pc2UgPSB0YXJnZXQgPT4gdG9TdHJpbmcuY2FsbCh0YXJnZXQpID09PSAnW29iamVjdCBQcm9taXNlXSc7XG5cbmV4cG9ydCBkZWZhdWx0IGlzUHJvbWlzZTsiLCJpbXBvcnQgaXMgZnJvbSAnLi9pcy5qcyc7XG5jb25zdCBpc1JlZ2V4ID0gdGFyZ2V0ID0+IGlzKFJlZ0V4cCkodGFyZ2V0KTtcblxuZXhwb3J0IGRlZmF1bHQgaXNSZWdleDsiLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5jb25zdCBpc1N5bWJvbCA9IHRhcmdldCA9PiB0b1N0cmluZy5jYWxsKHRhcmdldCkgPT09ICdbb2JqZWN0IFN5bWJvbF0nO1xuXG5leHBvcnQgZGVmYXVsdCBpc1N5bWJvbDsiLCJcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmNvbnN0IGlzVW5kZWZpbmVkID0gdGFyZ2V0ID0+IHRvU3RyaW5nLmNhbGwodGFyZ2V0KSA9PT0gJ1tvYmplY3QgVW5kZWZpbmVkXSc7XG5cbmV4cG9ydCBkZWZhdWx0IGlzVW5kZWZpbmVkOyJdLCJuYW1lcyI6WyJjdXJyeU4iLCJmbiIsImxlbmd0aCIsImFyZ3VtZW50cyIsImJpbmQiLCJidWlsZExvZ3MiLCJyZXN0IiwibG9nIiwicmVzdExlbmd0aCIsImkiLCJwdXNoIiwiZGVidWciLCJsb2dzIiwic3BsaWNlIiwid2luZG93IiwicGVyZm9ybWFuY2UiLCJub3ciLCJ0b0ZpeGVkIiwiRGF0ZSIsImZpbGxlciIsInBpcGUyIiwiZm4xIiwiZm4yIiwiY2FsbCIsImFwcGx5IiwiaXMiLCJ0eXBlIiwidGFyZ2V0IiwiT2JqZWN0IiwiaXNCb29sZWFuIiwiQm9vbGVhbiIsInN5bmNQaXBlMiIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwidGhlbiIsImRhdGEiLCJjYXRjaCIsInBpcGVOIiwiaXNBc3luYyIsInByb3RvdHlwZSIsInNoaWZ0IiwiYXJncyIsImxhc3RSZXN1bHQiLCJfcGlwZTIiLCJzeW5jUGlwZU4iLCJ1bnNoaWZ0IiwicmFuZG9tVG9rZW4iLCJoYXNoIiwibGFuZ3VhZ2UiLCJvZmZzZXQiLCJjaGFyQXQiLCJNYXRoIiwiZmxvb3IiLCJyYW5kb20iLCJ0b1N0cmluZyIsImlzT2JqZWN0IiwiaXNTdHJpbmciLCJTdHJpbmciLCJoYXNoMzIiLCJfcHJveHlPYmplY3RQcm9wZXJ0eSIsInN1YnNjcmliZXJzIiwia2V5IiwicHJveHIiLCJ1bnN1YnNjcmliZSIsImlkIiwiaGFzIiwiZGVsZXRlIiwiRXJyb3IiLCJfX3B1YnN1Yl9fIiwic3Vic2NyaWJlIiwiRnVuY3Rpb24iLCJzZXQiLCJfc3Vic2NyaWJlcnMiLCJpc1Jvb3QiLCJNYXAiLCJfaGFuZGxlciIsImdldCIsInZhbHVlIiwiYWN0aW9uIiwib2xkVmFsdWUiLCJhY3Rpb25EYXRhIiwibm90aWZ5IiwiZm9yRWFjaCIsIlByb3h5IiwiaXNBcnJheSIsIkFycmF5IiwiaXNEYXRlIiwiaXNGdW5jdGlvbiIsImlzTmFOIiwiaXNOdWxsIiwiaXNOdW1iZXIiLCJOdW1iZXIiLCJpc1Byb21pc2UiLCJpc1JlZ2V4IiwiUmVnRXhwIiwiaXNTeW1ib2wiLCJpc1VuZGVmaW5lZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFBZSxTQUFTQSxNQUFULENBQWdCQyxFQUFoQixFQUFvQjtXQUN4QixZQUFZO1lBQ1hBLEdBQUdDLE1BQUgsSUFBYUMsVUFBVUQsTUFBM0IsRUFDSSxPQUFPRCxHQUFHLEdBQUdFLFNBQU4sQ0FBUCxDQURKLEtBR0ksT0FBT0YsR0FBR0csSUFBSCxDQUFRLElBQVIsRUFBYyxHQUFHRCxTQUFqQixDQUFQO0tBSlI7OztBQ0RKLFNBQVNFLFNBQVQsQ0FBbUJDLElBQW5CLEVBQXdCO01BQ2xCQyxNQUFNLEVBQVY7TUFDSUMsYUFBYUYsS0FBS0osTUFBdEI7TUFDSU8sSUFBSSxDQUFSO1NBQ09BLElBQUlELFVBQVgsR0FBd0I7UUFDbEJFLElBQUosQ0FBVUosS0FBS0csQ0FBTCxDQUFWOzs7U0FHS0YsR0FBUDs7QUFFRixBQUFlLFNBQVNJLEtBQVQsQ0FBZSxHQUFHTCxJQUFsQixFQUF3QjtNQUNqQ00sT0FBT1AsVUFBVUMsSUFBVixDQUFYO09BQ0tPLE1BQUwsQ0FDRSxDQURGLEVBQ0ksQ0FESixFQUVFQyxPQUFPQyxXQUFQLEdBQXFCLFFBQVEsQ0FBQ0QsT0FBT0MsV0FBUCxDQUFtQkMsR0FBbkIsS0FBMkIsSUFBNUIsRUFBa0NDLE9BQWxDLENBQTBDLENBQTFDLENBQVIsR0FBdUQs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
