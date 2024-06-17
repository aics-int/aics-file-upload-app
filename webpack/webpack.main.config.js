const path = require("path");

module.exports = ({ production }) => {
  const mode = production ? "production" : "development";

  return {
    context: path.resolve(__dirname, ".."),
    devtool: "eval-source-map",
    entry: {
      main: ["./src/main/index.ts"],
    },
    mode,
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
    node: { __dirname: true, __filename: true },
    optimization: {
      nodeEnv: mode,
      moduleIds: "named",
      emitOnErrors: false,
    },
    output: {
      filename: "[name].js",
      chunkFilename: "[name].bundle.js",
      libraryTarget: "commonjs2",
      path: path.resolve(__dirname, "..", "dist", "main"),
    },
    resolve: {
      alias: {
        "@": "./src/main",
        common: "./src/common",
      },
      extensions: [".js", ".ts", ".tsx", ".json", ".node"],
    },
    target: "electron-main",
  };
};
