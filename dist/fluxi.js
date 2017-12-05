//  Fluxi v1.1.6
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

            actionData = {
                'action': action,
                'actionRoot': target,
                'key': key,
                'value': value
            };

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmx1eGkuanMiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jdXJyeS5qcyIsIi4uL3NvdXJjZS9kZWJ1Zy5qcyIsIi4uL3NvdXJjZS9maWxsZXIuanMiLCIuLi9zb3VyY2UvcGlwZTIuanMiLCIuLi9zb3VyY2UvaXMuanMiLCIuLi9zb3VyY2UvaXNCb29sZWFuLmpzIiwiLi4vc291cmNlL3N5bmNQaXBlMi5qcyIsIi4uL3NvdXJjZS9waXBlTi5qcyIsIi4uL3NvdXJjZS9zeW5jUGlwZU4uanMiLCIuLi9zb3VyY2UvcmFuZG9tVG9rZW4uanMiLCIuLi9zb3VyY2UvaXNPYmplY3QuanMiLCIuLi9zb3VyY2UvaXNTdHJpbmcuanMiLCIuLi9zb3VyY2UvcHJveHIuanMiLCIuLi9zb3VyY2UvaXNBcnJheS5qcyIsIi4uL3NvdXJjZS9pc0RhdGUuanMiLCIuLi9zb3VyY2UvaXNGdW5jdGlvbi5qcyIsIi4uL3NvdXJjZS9pc05hTi5qcyIsIi4uL3NvdXJjZS9pc051bGwuanMiLCIuLi9zb3VyY2UvaXNOdW1iZXIuanMiLCIuLi9zb3VyY2UvaXNQcm9taXNlLmpzIiwiLi4vc291cmNlL2lzUmVnZXguanMiLCIuLi9zb3VyY2UvaXNTeW1ib2wuanMiLCIuLi9zb3VyY2UvaXNVbmRlZmluZWQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3VycnlOKGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGZuLmxlbmd0aCA9PSBhcmd1bWVudHMubGVuZ3RoKVxuICAgICAgICAgICAgcmV0dXJuIGZuKC4uLmFyZ3VtZW50cyk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBmbi5iaW5kKG51bGwsIC4uLmFyZ3VtZW50cyk7XG4gICAgfTtcbn0iLCJmdW5jdGlvbiBidWlsZExvZ3MocmVzdCl7XG4gIHZhciBsb2cgPSBbXTtcbiAgdmFyIHJlc3RMZW5ndGggPSByZXN0Lmxlbmd0aFxuICBsZXQgaSA9IDA7XG4gIGZvciAoIDtpIDwgcmVzdExlbmd0aDspIHtcbiAgICBsb2cucHVzaCggcmVzdFtpXSApO1xuICAgIGkrKztcbiAgfVxuICByZXR1cm4gbG9nO1xufVxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gZGVidWcoLi4ucmVzdCkge1xuICB2YXIgbG9ncyA9IGJ1aWxkTG9ncyhyZXN0KTtcbiAgbG9ncy5zcGxpY2UoXG4gICAgMCwwLFxuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSA/ICcgOiAnICsgKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAvIDEwMDApLnRvRml4ZWQoMykgKyAnOiAnIFxuICAgIDogJyA6ICcgKyBEYXRlKCkgKyAnIDogJ1xuICApO1xuICBjb25zb2xlLmxvZyguLi5sb2dzKTtcbn0iLCJleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBmaWxsZXIoKXtcbiAgICByZXR1cm4gJ19fRU1QVFlfXyc7XG59IiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGlwZTIoZm4xLCBmbjIpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gZm4yLmNhbGwodGhpcywgZm4xLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICB9O1xufSIsIi8qKlxuICogTGVnYWN5IG1ldGhvZHMgYW5kIHByaXZhdGUgbWV0aG9kcyBhcmUgcHJlZml4ZWQgd2l0aCBfKHVuZGVyc2NvcmUpLlxuICovXG5cbmNvbnN0IGlzID0gdHlwZSA9PiB0YXJnZXQgPT4gT2JqZWN0KHRhcmdldCkgaW5zdGFuY2VvZiB0eXBlO1xuXG5leHBvcnQgZGVmYXVsdCBpcztcbiIsImltcG9ydCBpcyBmcm9tICcuL2lzLmpzJztcblxuY29uc3QgaXNCb29sZWFuID0gdGFyZ2V0ID0+IGlzKEJvb2xlYW4pKHRhcmdldCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzQm9vbGVhbjsiLCIvKipcbiAqIFxuICogVXNhZ2U6IFN5bmNocm9ub3VzIHBpcGUgd2lsbCB3b3JrcyBleGFjbHkgYXMgeW91IHRoaW5rXG4gKiAgICAgICAgICB0aGF0IHRoaXMgd2lsbCB3YWl0IGZvciBlYWNoIGFjdGlvbiB0byBnZXQgY29tcGxldGVkXG4gKiBcbiAqIHZhciBqb2luQWN0aW9ucyA9IHN5bmNQaXBlMih0aW1lcjEsdGltZXIyLHRpbWVyMyk7XG4gKiBcbiAqIGpvaW5BY3Rpb25zKCkgLy8gICAgIC0+IHlvdSBjYW4gZWl0aGVyIGp1c3QgaW5pdGF0ZSB0aGUgYWN0aW9uXG4gKiBcbiAqIGpvaW5BY3Rpb25zKCkudGhlbiggIC8vIC0+IEFkZCBhIGxpc3RlbmVyIHRvIGdldCB0aGUgY29tcGxldGVkIHN0YXR1c1xuICogICAgICBmdW5jdGlvbigpe1xuICogICAgICBjb25zb2xlLmxvZyhcIkNvbXBsZXRlZCFcIilcbiAqIH0pO1xuICogXG4gKiBAcGFyYW0geypGdW5jdGlvbn0gZm4xIFxuICogQHBhcmFtIHsqRnVuY3Rpb259IGZuMiBcbiAqIFxuICogQHJldHVybiBQcm9taXNlXG4gKi9cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3luY1BpcGUyKGZuMSwgZm4yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGZuMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmbjIuY2FsbCh0aGlzLCBkYXRhKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgcmV0dXJuIGZuMjtcbiAgICAgICAgfSk7XG4gICAgfTtcbn0iLCIvKipcbiAqIFxuICogVXNhZ2U6IEFzeWNocm9ub3VzIHBpcGUgd2hpY2gganVzdCBiaWxkcyBtdWx0aXBsZVxuICogICAgICAgICAgRnVuY3Rpb25zIHRvIG9uZSBhbmQgd2FpdCBmb3IgY29tbWFuZFxuICogXG4gKiB2YXIgam9pbkFjdGlvbnMgPSBwaXBlTihhZGRPbmUsIGFkZFR3bywgYWRkVGhyZWUpO1xuICogam9pbkFjdGlvbnMoKTtcbiAqIFxuICogQHBhcmFtIHsqRnVuY3Rpb259IGZuMSBcbiAqIEBwYXJhbSB7KkZ1bmN0aW9ufSBmbjIgXG4gKiBcbiAqIEByZXR1cm4gUHJvbWlzZVxuICovXG5cblxuaW1wb3J0IHBpcGUyIGZyb20gJy4vcGlwZTInO1xuaW1wb3J0IGlzQm9vbGVhbiBmcm9tICcuL2lzQm9vbGVhbic7XG5pbXBvcnQgc3luY1BpcGUyIGZyb20gJy4vc3luY1BpcGUyJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcGlwZU4oKSB7XG4gICAgdmFyIGlzQXN5bmM7XG4gICAgaWYgKGlzQm9vbGVhbihhcmd1bWVudHNbMF0pKSB7XG4gICAgICAgIGlzQXN5bmMgPSBhcmd1bWVudHNbMF07XG4gICAgICAgIEFycmF5LnByb3RvdHlwZS5zaGlmdC5jYWxsKGFyZ3VtZW50cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaXNBc3luYyA9IHRydWU7XG4gICAgfVxuICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICB2YXIgbGFzdFJlc3VsdCA9IGFyZ3VtZW50c1swXTtcbiAgICB2YXIgX3BpcGUyID0gaXNBc3luYyA/IHBpcGUyIDogc3luY1BpcGUyO1xuICAgIGlmIChsZW5ndGggPT0gMSlcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1swXTtcbiAgICBpZiAobGVuZ3RoID09IDIpXG4gICAgICAgIHJldHVybiAoX3BpcGUyKGFyZ3NbMF0sIGFyZ3NbMV0pKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aCAtIDE7KSB7XG4gICAgICAgIGxhc3RSZXN1bHQgPSBfcGlwZTIobGFzdFJlc3VsdCwgYXJnc1tpICsgMV0pO1xuICAgICAgICBpKys7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxhc3RSZXN1bHQ7XG59IiwiaW1wb3J0IHBpcGVOIGZyb20gJy4vcGlwZU4nO1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gc3luY1BpcGVOKCkge1xuICAgIEFycmF5LnByb3RvdHlwZS51bnNoaWZ0LmNhbGwoYXJndW1lbnRzLCBmYWxzZSk7XG4gICAgcmV0dXJuIHBpcGVOLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59IiwiZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcmFuZG9tVG9rZW4obGVuZ3RoKSB7XG4gICAgdmFyIGhhc2ggPSAnJztcbiAgICB2YXIgbGFuZ3VhZ2UgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODlfLSc7XG5cbiAgICBmb3IgKHZhciBvZmZzZXQgPSAwOyBvZmZzZXQgPCBsZW5ndGg7IG9mZnNldCsrKVxuICAgICAgICBoYXNoICs9IGxhbmd1YWdlLmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBsYW5ndWFnZS5sZW5ndGgpKTtcblxuICAgIHJldHVybiBoYXNoO1xufSIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5jb25zdCBpc09iamVjdCA9IHRhcmdldCA9PiB0b1N0cmluZy5jYWxsKHRhcmdldCkgPT09ICdbb2JqZWN0IE9iamVjdF0nO1xuZXhwb3J0IGRlZmF1bHQgaXNPYmplY3Q7IiwiaW1wb3J0IGlzIGZyb20gJy4vaXMuanMnO1xuY29uc3QgaXNTdHJpbmcgPSB0YXJnZXQgPT4gaXMoU3RyaW5nKSh0YXJnZXQpO1xuXG5leHBvcnQgZGVmYXVsdCBpc1N0cmluZzsiLCJpbXBvcnQgaXMgZnJvbSAnLi9pcyc7XG5pbXBvcnQgcmFuZG9tVG9rZW4gZnJvbSAnLi9yYW5kb21Ub2tlbic7XG5pbXBvcnQgaXNPYmplY3QgZnJvbSAnLi9pc09iamVjdCc7XG5pbXBvcnQgaXNTdHJpbmcgZnJvbSAnLi9pc1N0cmluZyc7XG5cbnZhciBoYXNoMzIgPSAoKSA9PiByYW5kb21Ub2tlbigzMik7XG5cbmZ1bmN0aW9uIF9wcm94eU9iamVjdFByb3BlcnR5KGRhdGEsIHN1YnNjcmliZXJzKSB7XG4gICAgZm9yICh2YXIga2V5IGluIGRhdGEpIHtcbiAgICAgICAgaWYoaXNPYmplY3QoZGF0YVtrZXldKSkge1xuICAgICAgICAgICAgZGF0YVtrZXldID0gcHJveHIoZGF0YVtrZXldLCBzdWJzY3JpYmVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBkbyBub3RoaW5nXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59XG5cbmZ1bmN0aW9uIHVuc3Vic2NyaWJlKGlkLCBzdWJzY3JpYmVycykge1xuICAgIGlmIChzdWJzY3JpYmVycy5oYXMoaWQpKSB7XG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVycy5kZWxldGUoaWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgRXJyb3IoJ1R5cGUgRXJyb3I6IHN1YnNjcmliZXIgc2hvdWxkIGJlIG9mIHR5cGUgRnVuY3Rpb24nKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIF9fcHVic3ViX18oZGF0YSwgc3Vic2NyaWJlcnMpIHtcbiAgICBkYXRhLnN1YnNjcmliZSA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICBpZiAoaXMoRnVuY3Rpb24pKGZuKSkge1xuICAgICAgICAgICAgdmFyIGlkID0gaGFzaDMyKCk7XG4gICAgICAgICAgICBzdWJzY3JpYmVycy5zZXQoaWQsIGZuKTtcbiAgICAgICAgICAgIHJldHVybiB1bnN1YnNjcmliZS5iaW5kKHRoaXMsIGlkLCBzdWJzY3JpYmVycyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEVycm9yKCdUeXBlIEVycm9yOiBzdWJzY3JpYmVyIHNob3VsZCBiZSBvZiB0eXBlIEZ1bmN0aW9uJyk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBkYXRhO1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBwcm94cihkYXRhLCBfc3Vic2NyaWJlcnMpIHtcbiAgICB2YXIgaXNSb290ID0gIV9zdWJzY3JpYmVycztcbiAgICB2YXIgc3Vic2NyaWJlcnMgPSBfc3Vic2NyaWJlcnMgPyBfc3Vic2NyaWJlcnMgOiBuZXcgTWFwKCk7XG4gICAgdmFyIF9oYW5kbGVyID0ge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIGdldCh0YXJnZXQsIGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIHRhcmdldFtrZXldO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uIHNldCh0YXJnZXQsIGtleSwgdmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhY3Rpb24gPSBudWxsLCBvbGRWYWx1ZSA9IG51bGwsIGFjdGlvbkRhdGEgPSB7fTtcbiAgICAgICAgICAgIGlmICghdGFyZ2V0W2tleV0pIHtcbiAgICAgICAgICAgICAgICBhY3Rpb24gPSAnTkVXJztcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IGlzU3RyaW5nKHZhbHVlKSA/IHZhbHVlIDogcHJveHIodmFsdWUsIHN1YnNjcmliZXJzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYWN0aW9uID0gJ1VQREFURSc7XG4gICAgICAgICAgICAgICAgb2xkVmFsdWUgPSB0YXJnZXRba2V5XTtcbiAgICAgICAgICAgICAgICBpZiAob2xkVmFsdWUgPT0gdmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRG8gbm90aGluZyBpZiB0aGUgdmFsdWUgYXJlIHNhbWVcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhY3Rpb25EYXRhID0ge1xuICAgICAgICAgICAgICAgICdhY3Rpb24nOiBhY3Rpb24sXG4gICAgICAgICAgICAgICAgJ2FjdGlvblJvb3QnOiB0YXJnZXQsXG4gICAgICAgICAgICAgICAgJ2tleSc6IGtleSxcbiAgICAgICAgICAgICAgICAndmFsdWUnOiB2YWx1ZVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKGFjdGlvbiA9PSAndXBkYXRlJykge1xuICAgICAgICAgICAgICAgIGFjdGlvbkRhdGEub2xkVmFsdWUgPSBvbGRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vdGlmeShhY3Rpb25EYXRhKTtcbiAgICAgICAgICAgIHJldHVybiB0YXJnZXRba2V5XTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmdW5jdGlvbiBub3RpZnkoZGF0YSkge1xuICAgICAgICBzdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgZm4oZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGRhdGEgPSBuZXcgUHJveHkoX3Byb3h5T2JqZWN0UHJvcGVydHkoZGF0YSwgc3Vic2NyaWJlcnMpLCBfaGFuZGxlcik7XG5cbiAgICByZXR1cm4gaXNSb290ID8gX19wdWJzdWJfXyhkYXRhLCBzdWJzY3JpYmVycykgOiBkYXRhO1xufVxuXG5cbi8qKlxuICogXG4gKiBIb3cgdG8gdXNlPyBcbiAqIFxuICogXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogT2JqZWN0IG90IGludHJlc3RcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiB2YXIgeCA9IHtcbiAqICB1c2VyTmFtZTogXCJ2aWduZXNoXCIsIFxuICogIHBhc3N3b3JkOiBcInRlc3RpbmdcIiwgXG4gKiAgYWRkcmVzczoge1xuICogICAgdGVzdDp7XG4gKiAgICAgIHRlc3Q6e1xuICogICAgICAgIHRlc3Q6XCJ0ZXN0XCJcbiAqICAgICAgfVxuICogICAgfVxuICogIH1cbiAqIH1cbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIFxuICogXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBQcm94aW5nIG9iamVjdCBvZiBpbnRyZXN0XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiB4ID0gZ2xvYmFsLnByb3hyKHgpXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBcbiAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAqIEBtZXRob2Qgc3Vic2NyaWJlXG4gKiBAcmV0dXJuIFN0cmluZ3toYXNoSWR9IFxuICogQGFjdGlvbiBJdCByZXR1cm5zIHRoZSBoYXNoSWQgb2YgdGhlIFxuICogc3Vic2NyaXB0aW9uIHdoaWNoIGlzIHVzZWQgdG8gdW5zdWJzY3JpYmVcbiAqIFxuICogdmFyIHVuc3Vic2NyaWJlID0geC5zdWJzY3JpYmUoZnVuY3Rpb24oZGF0YSl7XG4gKiAgY29uc29sZS5sb2coZGF0YSlcbiAqIH0pO1xuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICogXG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBAbWV0aG9kIHVuc3Vic2NyaWJlXG4gKiBAcmV0dXJuIEJvb2xlYW57aXNVbnN1YmFzY3JpYmVkfSAgXG4gKiBAYWN0aW9uIFJlbW92ZXMgdGhlIGhhbmRsZXIgZnJvbSB0aGUgXG4gKiBzdWJzY3JpYmVycyBtYXAuXG4gKiBcbiAqIHVuc3Vic2NyaWJlKCk7XG4gKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gKiBcbiAqLyIsImltcG9ydCBpcyBmcm9tICcuL2lzLmpzJztcblxuY29uc3QgaXNBcnJheSA9IHRhcmdldCA9PiBpcyhBcnJheSkodGFyZ2V0KTtcblxuZXhwb3J0IGRlZmF1bHQgaXNBcnJheTsiLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5jb25zdCBpc0RhdGUgPSB0YXJnZXQgPT4gdG9TdHJpbmcuY2FsbCh0YXJnZXQpID09PSAnW29iamVjdCBEYXRlXSc7XG5cbmV4cG9ydCBkZWZhdWx0IGlzRGF0ZTsiLCJpbXBvcnQgaXMgZnJvbSAnLi9pcy5qcyc7XG5cbmNvbnN0IGlzRnVuY3Rpb24gPSB0YXJnZXQgPT4gaXMoRnVuY3Rpb24pKHRhcmdldCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzRnVuY3Rpb247IiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuY29uc3QgaXNOYU4gPSB0YXJnZXQgPT4gdG9TdHJpbmcuY2FsbCh0YXJnZXQpID09PSAnW29iamVjdCBOYU5dJztcblxuZXhwb3J0IGRlZmF1bHQgaXNOYU47IiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuY29uc3QgaXNOdWxsID0gdGFyZ2V0ID0+IHRvU3RyaW5nLmNhbGwodGFyZ2V0KSA9PT0gJ1tvYmplY3QgTnVsbF0nO1xuXG5leHBvcnQgZGVmYXVsdCBpc051bGw7IiwiaW1wb3J0IGlzIGZyb20gJy4vaXMuanMnO1xuXG5jb25zdCBpc051bWJlciA9IHRhcmdldCA9PiBpcyhOdW1iZXIpKHRhcmdldCk7XG5cbmV4cG9ydCBkZWZhdWx0IGlzTnVtYmVyOyIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmNvbnN0IGlzUHJvbWlzZSA9IHRhcmdldCA9PiB0b1N0cmluZy5jYWxsKHRhcmdldCkgPT09ICdbb2JqZWN0IFByb21pc2VdJztcblxuZXhwb3J0IGRlZmF1bHQgaXNQcm9taXNlOyIsImltcG9ydCBpcyBmcm9tICcuL2lzLmpzJztcbmNvbnN0IGlzUmVnZXggPSB0YXJnZXQgPT4gaXMoUmVnRXhwKSh0YXJnZXQpO1xuXG5leHBvcnQgZGVmYXVsdCBpc1JlZ2V4OyIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbmNvbnN0IGlzU3ltYm9sID0gdGFyZ2V0ID0+IHRvU3RyaW5nLmNhbGwodGFyZ2V0KSA9PT0gJ1tvYmplY3QgU3ltYm9sXSc7XG5cbmV4cG9ydCBkZWZhdWx0IGlzU3ltYm9sOyIsIlxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuY29uc3QgaXNVbmRlZmluZWQgPSB0YXJnZXQgPT4gdG9TdHJpbmcuY2FsbCh0YXJnZXQpID09PSAnW29iamVjdCBVbmRlZmluZWRdJztcblxuZXhwb3J0IGRlZmF1bHQgaXNVbmRlZmluZWQ7Il0sIm5hbWVzIjpbImN1cnJ5TiIsImZuIiwibGVuZ3RoIiwiYXJndW1lbnRzIiwiYmluZCIsImJ1aWxkTG9ncyIsInJlc3QiLCJsb2ciLCJyZXN0TGVuZ3RoIiwiaSIsInB1c2giLCJkZWJ1ZyIsImxvZ3MiLCJzcGxpY2UiLCJ3aW5kb3ciLCJwZXJmb3JtYW5jZSIsIm5vdyIsInRvRml4ZWQiLCJEYXRlIiwiZmlsbGVyIiwicGlwZTIiLCJmbjEiLCJmbjIiLCJjYWxsIiwiYXBwbHkiLCJpcyIsInR5cGUiLCJ0YXJnZXQiLCJPYmplY3QiLCJpc0Jvb2xlYW4iLCJCb29sZWFuIiwic3luY1BpcGUyIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJ0aGVuIiwiZGF0YSIsImNhdGNoIiwicGlwZU4iLCJpc0FzeW5jIiwicHJvdG90eXBlIiwic2hpZnQiLCJhcmdzIiwibGFzdFJlc3VsdCIsIl9waXBlMiIsInN5bmNQaXBlTiIsInVuc2hpZnQiLCJyYW5kb21Ub2tlbiIsImhhc2giLCJsYW5ndWFnZSIsIm9mZnNldCIsImNoYXJBdCIsIk1hdGgiLCJmbG9vciIsInJhbmRvbSIsInRvU3RyaW5nIiwiaXNPYmplY3QiLCJpc1N0cmluZyIsIlN0cmluZyIsImhhc2gzMiIsIl9wcm94eU9iamVjdFByb3BlcnR5Iiwic3Vic2NyaWJlcnMiLCJrZXkiLCJwcm94ciIsInVuc3Vic2NyaWJlIiwiaWQiLCJoYXMiLCJkZWxldGUiLCJFcnJvciIsIl9fcHVic3ViX18iLCJzdWJzY3JpYmUiLCJGdW5jdGlvbiIsInNldCIsIl9zdWJzY3JpYmVycyIsImlzUm9vdCIsIk1hcCIsIl9oYW5kbGVyIiwiZ2V0IiwidmFsdWUiLCJhY3Rpb24iLCJvbGRWYWx1ZSIsImFjdGlvbkRhdGEiLCJub3RpZnkiLCJmb3JFYWNoIiwiUHJveHkiLCJpc0FycmF5IiwiQXJyYXkiLCJpc0RhdGUiLCJpc0Z1bmN0aW9uIiwiaXNOYU4iLCJpc051bGwiLCJpc051bWJlciIsIk51bWJlciIsImlzUHJvbWlzZSIsImlzUmVnZXgiLCJSZWdFeHAiLCJpc1N5bWJvbCIsImlzVW5kZWZpbmVkIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFlLFNBQVNBLE1BQVQsQ0FBZ0JDLEVBQWhCLEVBQW9CO1dBQ3hCLFlBQVk7WUFDWEEsR0FBR0MsTUFBSCxJQUFhQyxVQUFVRCxNQUEzQixFQUNJLE9BQU9ELEdBQUcsR0FBR0UsU0FBTixDQUFQLENBREosS0FHSSxPQUFPRixHQUFHRyxJQUFILENBQVEsSUFBUixFQUFjLEdBQUdELFNBQWpCLENBQVA7S0FKUjs7O0FDREosU0FBU0UsU0FBVCxDQUFtQkMsSUFBbkIsRUFBd0I7TUFDbEJDLE1BQU0sRUFBVjtNQUNJQyxhQUFhRixLQUFLSixNQUF0QjtNQUNJTyxJQUFJLENBQVI7U0FDT0EsSUFBSUQsVUFBWCxHQUF3QjtRQUNsQkUsSUFBSixDQUFVSixLQUFLRyxDQUFMLENBQVY7OztTQUdLRixHQUFQOztBQUVGLEFBQWUsU0FBU0ksS0FBVCxDQUFlLEdBQUdMLElBQWxCLEVBQXdCO01BQ2pDTSxPQUFPUCxVQUFVQyxJQUFWLENBQVg7T0FDS08sTUFBTCxDQUNFLENBREYsRUFDSSxDQURKLEVBRUVDLE9BQU9DLFdBQVAsR0FBcUIsUUFBUSxDQUFDRCxPQUFPQyxXQUFQLENBQW1CQyxHQUFuQixLQUEyQixJQUE1QixFQUFrQ0MsT0FBbEMsQ0FBMEMsQ0FBMUMsQ0FBUixHQUF1RCxJQUE1RSxHQUNFLFFBQVFDLE1BQVIsR0FBaUIsS0FIckI7VUFLUVgsR0FBUixDQUFZLEdBQUdLLElBQWY7OztBQ2pCYSxTQUFT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
