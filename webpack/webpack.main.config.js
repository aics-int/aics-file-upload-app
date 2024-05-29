const path = require("path");

config = {
  context: path.resolve(__dirname, '..'),
  devtool: 'eval-source-map',
  externals:
    ['@aics/aics-react-labkey',
      '@aics/frontend-insights',
      '@aics/frontend-insights-plugin-amplitude-node',
      'antd',
      'axios',
      'axios-retry',
      'chai-as-promised',
      'electron-devtools-installer',
      'electron-store',
      'electron-updater',
      'hash-wasm',
      'humps',
      'jsdom',
      'jsdom-global',
      'lodash',
      'moment',
      'object-hash',
      'react',
      'react-dom',
      'react-virtualized-auto-sizer',
      'react-window',
      'redux-undo',
      'reselect',
      'rimraf',
      'source-map-support',
      'ts-import-plugin',
      'ts-node',
      'uuid',
      'electron',
      'webpack',
      'electron-devtools-installer',
      'webpack/hot/log-apply-result',
      'source-map-support/source-map-support.js'],
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
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use:
            {
              loader: 'babel-loader',
              options:
                {
                  presets: [
                    [
                      "@babel/preset-env",
                      {
                        targets: {
                          node: "current",
                        },
                      },
                    ],
                  ],
                }
            }
        },
          {test: /\.node$/, use: 'node-loader'},
          {
            test: /\.(png|jpg|gif)$/,
            use:
              [{
                loader: 'url-loader',
                options: {limit: 10485760, name: 'imgs/[name]--[folder].[ext]'}
              }]
          },
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use:
              [{
                loader: 'ts-loader',
                options:
                  {
                    transpileOnly: true,
                    appendTsSuffixTo: [/\.vue$/],
                    configFile: 'tsconfig.json'
                  }
              }]
          }]
    },
  optimization:
    {
      nodeEnv: 'development',
      moduleIds: 'named',
      emitOnErrors: false
    },
  mode: 'development',
  entry:
    {
      main:
        ['./src/main/index.ts']
    }
}


module.exports = config;