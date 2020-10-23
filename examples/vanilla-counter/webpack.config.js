const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src/index.js',
  plugins: [
    new HtmlWebpackPlugin({
      hash: true,
      template: 'index.html'
    })
  ]
}
