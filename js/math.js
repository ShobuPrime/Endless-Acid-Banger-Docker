/*
  Copyright 2021 David Whiting
  This work is licensed under a Creative Commons Attribution 4.0 International License
  https://creativecommons.org/licenses/by/4.0/
*/
export function rndInt(maxExcl) {
    return Math.floor(Math.random() * (maxExcl - 0.01));
}
export function biRnd() {
    return Math.random() * 2 - 1;
}
export function choose(array) {
    return array[rndInt(array.length)];
}
//# sourceMappingURL=math.js.map