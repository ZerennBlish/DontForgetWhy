// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wav');

// Block the project-local functions/ directory (Cloud Functions sub-project)
// from being bundled into the React Native app. Anchored to __dirname so it
// does NOT match internal "functions/" paths inside node_modules (e.g. skia's
// src/animation/functions/).
const projectFunctionsDir = path.resolve(__dirname, 'functions');
const projectFunctionsRegex = new RegExp(
  '^' + projectFunctionsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\\/]/g, '[\\\\/]') + '[\\\\/].*'
);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : []),
  projectFunctionsRegex,
];

module.exports = config;
