const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /jszip_tmp_[0-9]+\/.*/,
];

module.exports = config;
