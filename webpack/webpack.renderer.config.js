const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const tsImportPluginFactory = require("ts-import-plugin");
const webpack = require("webpack");

const packageJson = require("../package.json");

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
      'electron-devtools-installer'],
  node: {__dirname: true, __filename: true},
  output:
    {
      filename: '[name].js',
      chunkFilename: '[name].bundle.js',
      libraryTarget: 'commonjs2',
      path: '/home/tylerf/code/aics-file-upload-app/dist/renderer',
      globalObject: 'this'
    },
  target: 'electron-renderer',
  resolve:
    {
      alias:
        {
          '@': '/home/tylerf/code/aics-file-upload-app/src/renderer',
          common: '/home/tylerf/code/aics-file-upload-app/src/common'
        },
      extensions: ['.js', '.ts', '.tsx', '.json', '.node', '.css']
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
                          electron: "16.0.0",
                        },
                      },
                    ],
                  ],
                }
            }
        },
          {test: /\.node$/, use: 'node-loader'},
          {
            test: /\.css$/,
            use:
              ['css-hot-loader',
                {
                  loader: MiniCssExtractPlugin.loader,
                },
                {
                  loader: 'css-loader', options: {modules: 'global'}
                }]
          },
          {
            test: /\.less$/,
            use:
              ['css-hot-loader',
                {
                  loader: MiniCssExtractPlugin.loader,
                },
                {loader: 'css-loader', options: {modules: 'global'}},
                {
                  loader: 'less-loader',
                  options:
                    {
                      lessOptions:
                        {
                          modifyVars:
                            {
                              'primary-color': '#1DA57A',
                              'link-color': '#1DA57A',
                              'border-radius-base': '4px',
                              'font-size-base': '18px',
                              'font-family': 'Nunito'
                            },
                          javascriptEnabled: true
                        }
                    }
                }]
          },
          {
            test: /\.s([ac])ss$/,
            use:
              ['css-hot-loader',
                '/home/tylerf/code/aics-file-upload-app/node_modules/mini-css-extract-plugin/dist/loader.js',
                {loader: 'css-loader', options: {modules: 'global'}},
                'sass-loader']
          },
          {
            test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
            use:
              {
                loader: 'url-loader',
                options: {limit: 10240, name: 'imgs/[name]--[folder].[ext]'}
              }
          },
          {
            test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
            loader: 'url-loader',
            options: {limit: 10240, name: 'media/[name]--[folder].[ext]'}
          },
          {
            test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
            use:
              {
                loader: 'url-loader',
                options: {limit: 10240, name: 'fonts/[name]--[folder].[ext]'}
              }
          },
          {test: /\.(html)$/, use: {loader: 'html-loader'}},
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
                    configFile: '/home/tylerf/code/aics-file-upload-app/tsconfig.json',
                    compilerOptions: {noEmit: false},
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
                  }
              }],
          },
          {
            test: /\.pcss$/,
            include: ['/home/tylerf/code/aics-file-upload-app/src/renderer'],
            use:
              ['css-hot-loader',
                '/home/tylerf/code/aics-file-upload-app/node_modules/mini-css-extract-plugin/dist/loader.js',
                {
                  loader: 'css-loader',
                  options:
                    {
                      importLoaders: 1,
                      modules:
                        {
                          exportLocalsConvention: 'camelCase',
                          localIdentName: '[path][name]__[local]--[hash:base64:5]'
                        }
                    }
                },
                {
                  loader: 'postcss-loader',
                  options: {postcssOptions: {plugins: []}}
                }]
          }]
    },
  plugins: [
    new MiniCssExtractPlugin("style.pcss"),
    new webpack.DefinePlugin({
      "process.env.APPLICATION_VERSION": JSON.stringify(packageJson.version),
    }),
  ],
  devServer:
    {
      contentBase:
        ['/home/tylerf/code/aics-file-upload-app/static',
          '/home/tylerf/code/aics-file-upload-app/dist/renderer-dll'],
      host: 'localhost',
      port: 9080,
      hot: true,
      overlay: true
    },
  optimization:
    {
      nodeEnv: 'development',
      namedModules: true,
      noEmitOnErrors: true,
      splitChunks:
        {
          cacheGroups:
            {
              vendor:
                {
                  chunks: 'initial',
                  test:
                    '/home/tylerf/code/aics-file-upload-app/webpack/node_modules',
                  name: 'vendor',
                  enforce: true
                }
            }
        }
    },
  mode: 'development',
  entry:
    {
      renderer:
        ['css-hot-loader/hotModuleReplacement',
          '/home/tylerf/code/aics-file-upload-app/src/renderer/index.tsx']
    },
  stats:
    {
      children: false,
      env: true,
      errors: true,
      errorDetails: true,
      version: true
    }
}

module.exports = config;