var is_node_js_env = typeof global !== "undefined";
if (!is_node_js_env && (typeof window === "undefined" || window === null)) {
    importScripts(
        'libs/stacktrace/dist/stacktrace.min.js'
    );
    // var module = {}; // TODO import not working in navigator web workers
    // importScripts(
    //     '../node_modules/js-yaml/dist/js-yaml.min.js'
    // );
    // var JsYaml = module.exports;
    var window = {};
    importScripts(
        'libs/ymljs/yaml.min.js' // TODO : jsyaml node module instead
    );
}

if (is_node_js_env) {
    var JsYaml = require('js-yaml');
}

////////// TOOLS
function getStackTrace() {
    var callstack = [];
    var isCallstackPopulated = false;
    try {
        i.dont.exist+=0; //doesn't exist- that's the point
    } catch(e) {
        if (e.stack) { //Firefox
            var lines = e.stack.split('\n');
            for (var i=0, len=lines.length; i<len; i++) {
                if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                    callstack.push(lines[i]);
                }
            }
            //Remove call to printStackTrace()
            callstack.shift();
            isCallstackPopulated = true;
        }
        else if (window.opera && e.message) { //Opera
            var lines = e.message.split('\n');
            for (var i=0, len=lines.length; i<len; i++) {
                if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
                    var entry = lines[i];
                    //Append next line also since it has the file info
                    if (lines[i+1]) {
                        entry += ' at ' + lines[i+1];
                        i++;
                    }
                    callstack.push(entry);
                }
            }
            //Remove call to printStackTrace()
            callstack.shift();
            isCallstackPopulated = true;
        }
    }
    if (!isCallstackPopulated) { //IE and Safari
        var currentFunction = arguments.callee.caller;
        while (currentFunction) {
            var fn = currentFunction.toString();
            var fname = fn.substring(fn.indexOf('function') + 8, fn.indexOf('')) || 'anonymous';
            callstack.push(fname);
            currentFunction = currentFunction.caller;
        }
    }
    return callstack;
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('target', '_blank');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
            ? args[number]
            : match
            ;
        });
    };
}

var Tools = {
    enable_debug:false,
    enable_debug_deep:false,
    enable_info:true,
    enable_important:true,
    startTime:new Date(),
    default_post_callback:'postMessageToCaller',
};

Tools.assert = function(condition, message) {
    if (!condition) {
        //try {
        message = message || "Tools.assertion failed";
        //  console.trace();
        //  if (typeof Error !== "undefined") {
        //     // TODO : need the caller stack trace, not the current line stack
        //     // trace, to trace error to real breaking point
        //     throw new Error(message);
        //  }

        // https://github.com/stacktracejs/stacktrace.js
        // var stringifiedStack = null;
        // var callback = function(stackframes) {
        //     stringifiedStack = stackframes.map(function(sf) {
        //         return sf.toString();
        //     }).join('\n');
        // };
        // StackTrace.get().then(callback);
        // console.trace();
        // console.log(stringifiedStack);
        throw new Error(message);
        //throw message;
        //throw stringifiedStack + message; // Fallback
        //} catch(e) {
        //   var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
        //   .replace(/^\s+at\s+/gm, '')
        //   .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
        //   .split('\n');
        //   throw e+'\n'+stack;
        //   // throw e;
        //}
    }
}

// var callback = function (key, value, initial) {...}
Tools.reduce = function(callback, obj, initial) {
    if (typeof callback === 'string') {
        callback = function (key, value, initial) {
            //return value[callback]
            Tools.assert(false, 'TODO : accept string callback, on value ? or on initial ?');
        };
    }

    Tools.assert(typeof(callback) === 'function',
    'You must define a callback Ex : var callback = function (key, value, initial) {...}');

    for (var variable in obj) {
        if (obj.hasOwnProperty(variable)) {
            initial = callback(variable, obj[variable], initial);
        }
    }
    return initial;
};

// var callback = function (key, value) {...}
Tools.map = function(callback, obj) {
    Tools.assert(typeof(callback) === 'function',
    'You must define a callback Ex : var callback = function (key, value) {...}');

    for (var variable in obj) {
        if (obj.hasOwnProperty(variable)) {
            var res = callback(variable, obj[variable]);
            if (false === res) { // false return means filter this value
                delete obj[variable];
                continue;
            }
            Tools.assert(res && res.length > 0, 'You must return an array with [key,value] or [value] from the map callback');
            // Tools.assert(obj instanceof Array,
            // 'You returned an array with one value, your target object should be an array');
            if (2 === res.length && res[0] !== variable) {
                delete obj[variable];
                variable = res[0];
            }
            if (2 === res.length){
                obj[variable] = res[1];
            } else {
                obj[variable] = res[0];
            }
        }
    }
    return obj;
};


Tools.reduce_printer = function (key, value, initial) {
    initial.push(key + ' -> ' + value);
    return initial;
}
Tools.log  = function (msg) {
    var endTime = new Date();
    // time difference in ms
    var timeDiff = endTime - Tools.startTime;
    // strip the ms
    timeDiff /= 1000;

    if ('string' === typeof msg) {
        if (is_node_js_env) {
            global.myWorker[Tools.default_post_callback]({
                type:'log',
                log: '[' + timeDiff + 's] ' + msg,//window.YAML.stringify(msg),
            });
        } else {
            postMessage({ // TODO : avoid ininit loop if user call Tools.log inside there log returning event...
                type:'log',
                log: '[' + timeDiff + 's] ' + msg,//window.YAML.stringify(msg),
            });
        }
    } else {
        if (is_node_js_env) {
            return console.log(JsYaml.dump(msg));
        } else {
            return console.log(msg);//window.YAML.stringify(msg));
        }
    }
}
Tools.error = function (msg) {
    try {
        var err = new Error(msg);
        err.code = 'Manana Seguro : GameError';
        throw err;
    } catch (e) {
        // only throw error to have debuger breakpoint automatic enabled
        // when breakin on all break point, will break on all of our errors here
    } finally {

    }
    // TODO : get caller class and check enable_info by class, to be able to
    // debug specific classes on the fly
    if (this.enable_error) {
        return Tools.log(msg);
    }
}
Tools.debug = function (msg) {
    // TODO : get caller class and check enable_info by class, to be able to
    // debug specific classes on the fly
    if (this.enable_debug) {
        return Tools.log(msg);
    }
}
Tools.debug_deep = function (msg) {
    // TODO : get caller class and check enable_info by class, to be able to
    // debug specific classes on the fly
    if (this.enable_debug_deep) {
        return Tools.log(msg);
    }
}
Tools.info = function (msg) {
    if (this.enable_info) {
        return Tools.log(msg);
    }
}
Tools.important = function (msg) {
    if (this.enable_important) {
        return Tools.log(msg);
    }
}

if (is_node_js_env) {
    module.exports = Tools;
}
