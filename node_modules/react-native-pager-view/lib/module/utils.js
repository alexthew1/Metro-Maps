"use strict";

import React, { Children } from 'react';
import { StyleSheet, View } from 'react-native';
import { jsx as _jsx } from "react/jsx-runtime";
export const childrenWithOverriddenStyle = children => {
  return Children.map(children, child => {
    const element = child;
    return (
      /*#__PURE__*/
      // Add a wrapper to ensure layout is calculated correctly
      _jsx(View, {
        style: StyleSheet.absoluteFill,
        collapsable: false,
        children: /*#__PURE__*/React.cloneElement(element, {
          ...element.props,
          // Override styles so that each page will fill the parent.
          style: [element.props.style, StyleSheet.absoluteFill]
        })
      })
    );
  });
};
//# sourceMappingURL=utils.js.map