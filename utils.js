const deepClone = function(obj, map = new Map()) {
  if (obj == null) return obj
  if (typeof obj !== 'object') return obj
  if (map.has(obj)) return obj
  const list = [Set, Map, Date, RegExp, WeakMap, WeakSet]
  if(list.includes(obj.constructor)) return new obj.constructor(obj)
  map.set(obj, 1)
  const res = Array.isArray(obj) ? [] : {}
  for (const key of Object.keys(obj)) {
    res[key] = typeof obj[key] === 'object' ? deepClone(obj[key], map) : obj[key]
  }
  return res
}

const curry = function(f, ...args) {
  if(f.length <= args.length) return f(...args)
  return (...next) => curry(f.bind(f, ...args), ...next)
}

module.exports = {
  deepClone,
  curry
}