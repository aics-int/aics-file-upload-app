const path = require("path");

const getCommonConfig = require('./webpack.common.config');

module.exports = ({ production }) => {
  const mode = production ? "production" : "development";
  const config = getCommonConfig(mode);

  return {
    ...config,
    entry: {
      main: ["./src/main/index.ts"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: "ts-loader",
              options: {
                transpileOnly: true,
                configFile: "tsconfig.json",
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
    },
    output: {
      filename: "[name].js",
      chunkFilename: "[name].bundle.js",
      path: path.resolve(__dirname, "..", "dist", "main"),
    },
    resolve: {
      alias: {
        "@": "./src/main",
        common: "./src/common",
      },
      extensions: [".js", ".ts", ".tsx", ".json"],
    },
    target: "electron-main",
  };
};
