const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const tsImportPluginFactory = require("ts-import-plugin");
const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const packageJson = require("../package.json");

const { devServer } = require("./constants");

const getCommonConfig = require("./webpack.common.config");
const getCssLoaders = require("./css-loaders");

module.exports = ({ production }) => {
  const mode = production ? "production" : "development";
  const config = getCommonConfig(mode);

  return {
    ...config,
    devServer: {
      client: {
        overlay: false,
      },
      port: devServer.port,
    },
    entry: {
      app: path.resolve("src", "renderer", "index.tsx"),
    },
    module: {
      rules: [
        ...getCssLoaders(),
        {
          test: /\.ttf/,
          type: "asset/resource",
        },
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
      ],
    },
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
      path: path.resolve(__dirname, "..", "dist", "renderer"),
      globalObject: "this",
    },
    resolve: {
      alias: {
        "@": "./src/renderer",
        common: "./src/common",
      },
      extensions: [".js", ".ts", ".tsx", ".json", ".css"],
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
    target: "electron-renderer",
  };
};
