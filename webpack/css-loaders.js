const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const miniLoaders = [
  MiniCssExtractPlugin.loader,
  {
    loader: "css-loader",
    options: {
      importLoaders: 1,
      modules: {
        exportLocalsConvention: "camelCase",
        localIdentName: "[path][name]__[local]--[hash:base64:5]",
      },
    },
  },
  {
    loader: "postcss-loader",
    options: {
      postcssOptions: {
        plugins: () => [postcssPresetEnv({ stage: 0 })],
      }
    },
  },
];

module.exports = (isDevelopment) =>
  isDevelopment ? ["css-hot-loader"].concat(miniLoaders) : miniLoaders;
