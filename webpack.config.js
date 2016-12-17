var webpack = require('webpack');

module.exports = {
  entry: ['babel-polyfill', './vm/main.js'],

  output: {
      path: './build',
      filename: 'bundle.js'
  },

  devServer: {
      inline: true,
      contentBase: './vm',
      port: 4020
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel'
      },
      {
        test: /\.scss$/,
        loaders: ["style", "css", "sass"]
      }
    ]
  }
};
