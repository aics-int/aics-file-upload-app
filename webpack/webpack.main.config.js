config = {
  context: '/home/tylerf/code/aics-file-upload-app',
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
      path: '/home/tylerf/code/aics-file-upload-app/dist/main'
    },
  target: 'electron-main',
  resolve:
    {
      alias:
        {
          '@': '/home/tylerf/code/aics-file-upload-app/src/main',
          common: '/home/tylerf/code/aics-file-upload-app/src/common'
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
                    configFile: '/home/tylerf/code/aics-file-upload-app/tsconfig.json'
                  }
              }]
          }]
    },
  optimization:
    {
      nodeEnv: 'development',
      namedModules: true,
      noEmitOnErrors: true
    },
  mode: 'development',
  entry:
    {
      main:
        ['/home/tylerf/code/aics-file-upload-app/src/main/index.ts']
    }
}


module.exports = config;