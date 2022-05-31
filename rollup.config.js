import path from 'path';
import url from 'url';
import glob from 'glob';
import replace from "rollup-plugin-replace";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import {terser} from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import serve from 'rollup-plugin-serve';
import urlPlugin from '@rollup/plugin-url';
import license from 'rollup-plugin-license';
import del from 'rollup-plugin-delete';
import emitEJS from 'rollup-plugin-emit-ejs';
import appConfig from './app.config.js';
import {getBabelOutputPlugin} from '@rollup/plugin-babel';
import {
    getPackagePath,
    getBuildInfo,
    generateTLSConfig,
    getDistPath,
} from './rollup.utils.js';

let appName = 'dbp-overview-app';
const pkg = require('./package.json');
const appEnv = typeof process.env.APP_ENV !== 'undefined' ? process.env.APP_ENV : 'local';
const watch = process.env.ROLLUP_WATCH === 'true';
const prodBuild = (!watch && appEnv !== 'test') || process.env.FORCE_FULL !== undefined;

let config;
if (appEnv in appConfig) {
    config = appConfig[appEnv];
} else {
    console.error(`Unknown build environment: '${appEnv}', use one of '${Object.keys(appConfig)}'`);
    process.exit(1);
}

if (watch) {
    config.basePath = '/dist/';
}

function getOrigin(url) {
    if (url) return new URL(url).origin;
    return '';
}

config.CSP = `default-src 'self' 'unsafe-eval' 'unsafe-inline' \
    ${config.typesense.protocol + '://' + config.typesense.host + ':' + config.typesense.port}; \
    img-src * blob: data:`;

export default (async () => {
    let privatePath = await getDistPath(pkg.name);
    return {
        input:
            appEnv !== 'test'
                ? ['src/' + appName + '.js']
                : glob.sync('test/**/*.js'),
        output: {
            dir: 'dist',
            entryFileNames: '[name].js',
            chunkFileNames: 'shared/[name].[hash].[format].js',
            format: 'esm',
            sourcemap: true,
        },
        treeshake: prodBuild,
        preserveEntrySignatures: true,
        onwarn: function (warning, warn) {
            // ignore chai warnings
            if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.message.includes('chai')) {
                return;
            }

            warn(warning);
        },
        plugins: [
            del({
                targets: 'dist/*',
            }),
            emitEJS({
                src: 'assets',
                include: ['**/*.ejs', '**/.*.ejs'],
                data: {
                    getUrl: (p) => {
                        return url.resolve(config.basePath, p);
                    },
                    getPrivateUrl: (p) => {
                        return url.resolve(`${config.basePath}${privatePath}/`, p);
                    },
                    name: appName,
                    entryPointURL: config.entryPointURL,
                    basePath: config.basePath,
                    keyCloakBaseURL: config.keyCloakBaseURL,
                    keyCloakRealm: config.keyCloakRealm,
                    keyCloakClientId: config.keyCloakClientId,
                    CSP: config.CSP,
                    matomoUrl: config.matomoUrl,
                    matomoSiteId: config.matomoSiteId,
                    buildInfo: getBuildInfo(appEnv),
                    typesense: config.typesense,
                },
            }),
            replace({
                // If you would like DEV messages, specify 'development'
                // Otherwise use 'production'
                'process.env.NODE_ENV': JSON.stringify('production'),
            }),
            resolve({
                // ignore node_modules from vendored packages
                moduleDirectories: [path.join(process.cwd(), 'node_modules')],
                browser: true,
                preferBuiltins: true,
                exportConditions: !prodBuild ? ['development'] : [],
            }),
            prodBuild &&
                license({
                    banner: {
                        commentStyle: 'ignored',
                        content: `
    License: <%= pkg.license %>
    Dependencies:
    <% _.forEach(dependencies, function (dependency) { if (dependency.name) { %>
    <%= dependency.name %>: <%= dependency.license %><% }}) %>
    `,
                    },
                    thirdParty: {
                        allow: {
                            test: '(MIT OR BSD-3-Clause OR Apache-2.0 OR LGPL-2.1-or-later OR 0BSD)',
                            failOnUnlicensed: true,
                            failOnViolation: true,
                        },
                    },
                }),
            commonjs({
                include: 'node_modules/**',
            }),
            json(),
            urlPlugin({
                limit: 0,
                include: ['node_modules/suggestions/**/*.css', 'node_modules/instantsearch.css/**/*.css'],
                emitFiles: true,
                fileName: 'shared/[name].[hash][extname]',
            }),
            copy({
                targets: [
                    {src: 'assets/silent-check-sso.html', dest: 'dist'},
                    {src: 'assets/htaccess-shared', dest: 'dist/shared/', rename: '.htaccess'},
                    {src: 'assets/*.css', dest: 'dist/' + (await getDistPath(pkg.name))},
                    {src: 'assets/*.ico', dest: 'dist/' + (await getDistPath(pkg.name))},
                    {src: 'assets/*.svg', dest: 'dist/' + (await getDistPath(pkg.name))},
                    {src: 'assets/*.png', dest: 'dist/' + (await getDistPath(pkg.name))},
                    {src: 'assets/icon/*', dest: 'dist/' + (await getDistPath(pkg.name, 'icon'))},
                    {src: 'assets/font/*', dest: 'dist/' + (await getDistPath(pkg.name, 'font'))},
                    {
                        src: await getPackagePath('instantsearch.css', 'themes/algolia-min.css'),
                        dest: 'dist/',
                    },
                    // {
                    //     src: await getPackagePath('@dbp-toolkit/common', 'src/spinner.js'),
                    //     dest: 'dist/' + (await getDistPath(pkg.name)),
                    // },
                    // {
                    //     src: await getPackagePath('@dbp-toolkit/common', 'misc/browser-check.js'),
                    //     dest: 'dist/' + (await getDistPath(pkg.name)),
                    // },
                    {src: 'assets/manifest.json', dest: 'dist', rename: appName + '.manifest.json'},
                    {src: 'assets/*.metadata.json', dest: 'dist'},
                //     {
                //         src: await getPackagePath('@dbp-toolkit/common', 'assets/icons/*.svg'),
                //         dest: 'dist/' + (await getDistPath('@dbp-toolkit/common', 'icons')),
                //     },
                ],
            }),
            prodBuild &&
                getBabelOutputPlugin({
                    compact: false,
                    presets: [
                        [
                            '@babel/preset-env',
                            {
                                loose: true,
                                modules: false,
                                shippedProposals: true,
                                bugfixes: true,
                                targets: {
                                    esmodules: true,
                                },
                            },
                        ],
                    ],
                }),
            prodBuild ? terser() : false,
            watch
                ? serve({
                      contentBase: '.',
                      host: '127.0.0.1',
                      port: 8001,
                      historyApiFallback: config.basePath + appName + '.html',
                      https: await generateTLSConfig(),
                      headers: {
                          'Content-Security-Policy': config.CSP,
                      },
                  })
                : false,
        ],
    };
})();
