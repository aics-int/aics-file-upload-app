const path = require("path");

// A handful of configuration operations shared between both the "main" and "renderer" config files
module.exports = (mode) => {
  return {
    context: path.resolve(__dirname, ".."),
    devtool: mode === 'production' ? false : "eval-source-map",
    mode,
    node: { __dirname: true, __filename: true },
  };
};
