const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /jszip_tmp_[0-9]+\/.*/,
  /fd-slicer_tmp_[0-9]+\/.*/,
  /[a-zA-Z0-9_-]+_tmp_[0-9]+\/.*/,
];

module.exports = config;
