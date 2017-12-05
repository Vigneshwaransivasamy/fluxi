import is from './is';
import randomToken from './randomToken';
import isObject from './isObject';
import isString from './isString';

var hash32 = () => randomToken(32);

function _proxyObjectProperty(data, subscribers) {
    for (var key in data) {
        if(isObject(data[key])) {
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

export default function proxr(data, _subscribers) {
    var isRoot = !_subscribers;
    var subscribers = _subscribers ? _subscribers : new Map();
    var _handler = {
        get: function get(target, key) {
            return target[key];
        },
        set: function set(target, key, value) {
            var action = null, oldValue = null, actionData = {};
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