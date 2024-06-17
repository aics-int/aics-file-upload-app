const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const tsImportPluginFactory = require("ts-import-plugin");
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const packageJson = require("../package.json");

const { devServer } = require("./constants");

module.exports = ({ production }) => {
  const mode = production ? "production" : "development";

  return {
    context: path.resolve(__dirname, ".."),
    devServer: {
      client: {
        overlay: false,
      },
      port: devServer.port,
    },
    devtool: production ? false : "eval-source-map",
    entry: {
      app: path.resolve("src", "renderer", "index.tsx"),
    },
    externals: [
      "@aics/aics-react-labkey",
      "@aics/frontend-insights",
      "@aics/frontend-insights-plugin-amplitude-node",
      "antd",
      "axios",
      "axios-retry",
      "chai-as-promised",
      "electron-devtools-installer",
      "electron-store",
      "electron-updater",
      "hash-wasm",
      "humps",
      "jsdom",
      "jsdom-global",
      "lodash",
      "moment",
      "object-hash",
      "react-virtualized-auto-sizer",
      "react-window",
      "redux-undo",
      "reselect",
      "rimraf",
      "source-map-support",
      "ts-import-plugin",
      "ts-node",
      "uuid",
      "electron",
      "webpack",
      "electron-devtools-installer",
    ],
    mode,
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      electron: "16.0.0",
                    },
                  },
                ],
              ],
            },
          },
        },
        { test: /\.node$/, use: "node-loader" },
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
          test: /\.s([ac])ss$/,
          use: [
            { loader: MiniCssExtractPlugin.loader },
            { loader: "css-loader", options: { modules: "global" } },
            "sass-loader",
          ],
        },
        {
          test: /\.ttf/,
          type: "asset/resource",
        },
        { test: /\.(html)$/, use: { loader: "html-loader" } },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
                appendTsSuffixTo: [/\.vue$/],
                configFile: "tsconfig.json",
                compilerOptions: { noEmit: false },
                getCustomTransformers: () => ({
                  before: [
                    tsImportPluginFactory([
                      {
                        libraryName: "antd",
                        libraryDirectory: "es",
                        style: "index",
                        styleExt: "less",
                      },
                      {
                        libraryName: "lodash",
                        libraryDirectory: null,
                        camel2DashComponentName: false,
                        style: false,
                      },
                    ]),
                  ],
                }),
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
      ],
    },
    node: { __dirname: true, __filename: true },
    optimization: {
      nodeEnv: mode,
      moduleIds: "named",
      emitOnErrors: false,
      splitChunks: {
        cacheGroups: {
          vendor: {
            chunks: "initial",
            test: "./webpack/node_modules",
            name: "vendor",
            enforce: true,
          },
        },
      },
    },
    output: {
      filename: "[name].js",
      chunkFilename: "[name].bundle.js",
      libraryTarget: "commonjs2",
      path: path.resolve(__dirname, "..", "dist", "renderer"),
      globalObject: "this",
    },
    resolve: {
      alias: {
        "@": "./src/renderer",
        common: "./src/common",
      },
      extensions: [".js", ".ts", ".tsx", ".json", ".node", ".css"],
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: "styles.css" }),
      new webpack.DefinePlugin({
        "process.env.APPLICATION_VERSION": JSON.stringify(packageJson.version),
        "process.env.NODE_ENV": JSON.stringify(mode),
        "process.env.WEBPACK_DEV_SERVER_PORT": JSON.stringify(devServer.port),
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "index.html"),
      }),
    ],
    stats: {
      children: false,
      env: true,
      errors: true,
      errorDetails: true,
      version: true,
    },
    target: "electron-renderer",
  };
};
