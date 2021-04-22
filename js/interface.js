/*
  Copyright 2021 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
export function genericParameter(name, value) {
    let listeners = [];
    const state = { value };
    function subscribe(callback) {
        callback(state.value);
        listeners.push(callback);
    }
    function publish() {
        for (let l of listeners) {
            l(state.value);
        }
    }
    return {
        name,
        subscribe,
        get value() { return state.value; },
        set value(v) { state.value = v; publish(); }
    };
}
export function trigger(name, value = false) {
    return genericParameter(name, value);
}
export function parameter(name, bounds, value) {
    return Object.assign(genericParameter(name, value), { bounds });
}
//# sourceMappingURL=interface.js.map