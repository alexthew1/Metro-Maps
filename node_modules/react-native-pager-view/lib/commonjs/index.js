"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {};
exports.default = void 0;
var _PagerView = require("./PagerView");
var _usePagerView = require("./usePagerView");
Object.keys(_usePagerView).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _usePagerView[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _usePagerView[key];
    }
  });
});
var _default = exports.default = _PagerView.PagerView;
//# sourceMappingURL=index.js.map