const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';

module.exports = {
    entry: './src/index.ts',
    output: {
        path: path.resolve(__dirname, 'public'),
        filename: 'index.js',
        clean: true,
    },
    mode: isProduction ? 'production' : 'development',
    devtool: 'inline-source-map',
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: './index.html', to: './' }],
        }),
        new CleanTerminalPlugin(),
    ],
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: 'ts-loader',
                exclude: ['/node_modules/'],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js', '.wasm'],
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'public'),
            watch: {
                ignored: ['**/node_modules'],
            },
        },
        port: 'auto',
        open: true,
        hot: true,
        compress: true,
    },
    experiments: {
        asyncWebAssembly: true,
    },
};
