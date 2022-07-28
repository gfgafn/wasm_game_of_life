const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'index.js',
    },
    mode: 'development',
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: './index.html', to: './' }],
        }),
        new CleanTerminalPlugin(),
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
            watch: {
                ignored: '**/node_modules',
            },
        },
        port: 'auto',
        open: true,
        hot: true,
    },
    experiments: {
        asyncWebAssembly: true,
    },
};
