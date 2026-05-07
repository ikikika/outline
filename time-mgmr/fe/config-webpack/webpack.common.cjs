const path = require('path')
const fs = require('fs')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { container } = webpack

const { ModuleFederationPlugin } = container

const parseMap = (value) => {
  if (!value) return {}

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, mapValue] = pair.split('=')
      if (!key || !mapValue) return acc
      acc[key.trim()] = mapValue.trim()
      return acc
    }, {})
}

const loadDotEnv = () => {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) {
    return
  }

  const content = fs.readFileSync(envPath, 'utf-8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    if (!key || process.env[key] !== undefined) continue

    process.env[key] = value
  }
}

module.exports = (env = {}) => {
  loadDotEnv()
  const mode = env.mode || process.env.MF_MODE || 'standalone'

  const viteEnvEntries = Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))
  const viteEnvObject = viteEnvEntries.reduce((acc, [key, value]) => {
    acc[key] = value ?? ''
    return acc
  }, {})

  const viteDefineEntries = viteEnvEntries.reduce((acc, [key, value]) => {
    acc[`import.meta.env.${key}`] = JSON.stringify(value ?? '')
    return acc
  }, {})

  const resolveValue = (envValue, processValue, fallbackValue) => envValue ?? processValue ?? fallbackValue

  const appName = resolveValue(env.name, process.env.MF_NAME, 'react_starter')
  const port = Number(resolveValue(env.port, process.env.PORT, 3001))

  const remotesValue = resolveValue(env.remotes, process.env.MF_REMOTES, '')
  const exposesValue = resolveValue(env.exposes, process.env.MF_EXPOSES, '')

  const remotes = parseMap(remotesValue)
  const exposes =
    mode === 'remote'
      ? {
          './App': './src/app/App',
          ...parseMap(exposesValue),
        }
      : parseMap(exposesValue)

  return {
    mode: env.production ? 'production' : 'development',
    entry: './src/main.tsx',
    output: {
      publicPath: 'auto',
      path: path.resolve(__dirname, '..', 'dist-mf'),
      clean: true,
    },
    devServer: {
      port,
      historyApiFallback: true,
      hot: true,
      open: false,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, '..', 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: path.resolve(__dirname, '..', 'tsconfig.app.json'),
              transpileOnly: true,
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.module\.s?css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                esModule: false,
                modules: {
                  auto: true,
                  localIdentName: '[name]__[local]__[hash:base64:5]',
                },
                importLoaders: 2,
              },
            },
            'postcss-loader',
            'sass-loader',
          ],
        },
        {
          test: /\.(s?css)$/,
          exclude: /\.module\.s?css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp|woff2?|eot|ttf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        'import.meta.env': JSON.stringify(viteEnvObject),
        ...viteDefineEntries,
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, '..', 'index.webpack.html'),
      }),
      new ModuleFederationPlugin({
        name: appName,
        filename: 'remoteEntry.js',
        remotes,
        exposes,
        shared: {
          react: {
            singleton: true,
            requiredVersion: false,
            eager: false,
          },
          'react-dom': {
            singleton: true,
            requiredVersion: false,
            eager: false,
          },
          'react-router-dom': {
            singleton: true,
            requiredVersion: false,
          },
          '@tanstack/react-query': {
            singleton: true,
            requiredVersion: false,
          },
        },
      }),
    ],
  }
}
