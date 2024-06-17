const path = require("path");

module.exports = ({ production }) => {
  const mode = production ? 'production' : 'development';
  
  return {
    context: path.resolve(__dirname, '..'),
    devtool: 'eval-source-map',
    node: {__dirname: true, __filename: true},
    output:
      {
        filename: '[name].js',
        chunkFilename: '[name].bundle.js',
        libraryTarget: 'commonjs2',
        path: path.resolve(__dirname, "..", "dist", "main"),
      },
    target: 'electron-main',
    resolve:
      {
        alias:
          {
            '@': './src/main',
            common: './src/common'
          },
        extensions: ['.js', '.ts', '.tsx', '.json', '.node']
      },
    module:
      {
        rules:
          [{
              test: /\.tsx?$/,
              exclude: /node_modules/,
              use:
                [{
                  loader: 'ts-loader',
                  options:
                    {
                      transpileOnly: true,
                      configFile: 'tsconfig.json'
                    }
                }]
            }]
      },
    optimization:
      {
        nodeEnv: mode,
        moduleIds: 'named',
        emitOnErrors: false
      },
    mode,
    entry:
      {
        main:
          ['./src/main/index.ts']
      }
  }
}
