const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require("path");

const cssLoaders = [
  {
    test: /\.css$/,
    use: [
      {
        loader: MiniCssExtractPlugin.loader,
      },
      {
        loader: "css-loader",
        options: { modules: "global" },
      },
    ],
  },
  {
    test: /\.less$/,
    use: [
      {
        loader: MiniCssExtractPlugin.loader,
      },
      { loader: "css-loader", options: { modules: "global" } },
      {
        loader: "less-loader",
        options: {
          lessOptions: {
            modifyVars: {
              "primary-color": "#1DA57A",
              "link-color": "#1DA57A",
              "border-radius-base": "4px",
              "font-size-base": "18px",
              "font-family": "Nunito",
            },
            javascriptEnabled: true,
          },
        },
      },
    ],
  },
  {
    test: /\.pcss$/,
    include: path.resolve("src", "renderer"),
    use: [
      { loader: MiniCssExtractPlugin.loader },
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
        options: { postcssOptions: { plugins: [] } },
      },
    ],
  },
];

module.exports = () => cssLoaders;
