const path = require("path");

const CircularDependencyPlugin = require("circular-dependency-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const tsImportPluginFactory = require("ts-import-plugin");

const getCssLoaders = require("./css-loaders");

const isDevelopment = process.env.NODE_ENV !== "production";

module.exports = {
  plugins: [
    new MiniCssExtractPlugin("style.pcss"),
    new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /a\.js|node_modules/,
      // include specific files based on a RegExp
      include: /dir/,
      // add errors to webpack instead of warnings
      failOnError: true,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,
      // set the current working directory for displaying module paths
      cwd: process.cwd(),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: path.resolve(__dirname, "../", "tsconfig.json"),
            compilerOptions: {
              noEmit: false,
            },
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
            // give responsibility of type checking to fork-ts-checker-webpack-plugin
            // in order to speed up build times
            transpileOnly: isDevelopment,
          },
        },
      },
      // this rule processes any CSS written for this project and contained in src/
      // it applies PostCSS plugins and converts it to CSS Modules
      {
        test: /\.pcss$/,
        include: [path.resolve(__dirname, "../", "src", "renderer")],
        use: getCssLoaders(isDevelopment),
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: "css-loader",
          },
          {
            loader: "less-loader",
            options: {
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
        ],
      },
    ],
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          chunks: "initial",
          test: path.resolve(__dirname, "node_modules"),
          name: "vendor",
          enforce: true,
        },
      },
    },
  },
};
