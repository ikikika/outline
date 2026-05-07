const commonConfig = require('./webpack.common.cjs')

module.exports = (env = {}) =>
  commonConfig({
    ...env,
    production: true,
  })
