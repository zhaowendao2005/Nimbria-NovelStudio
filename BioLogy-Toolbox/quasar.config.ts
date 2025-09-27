// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { configure } from 'quasar/wrappers';
import path from 'node:path';
import fs from 'node:fs';

// -------------------------
// 轻量"目录映射配置区"
// 只需在下方数组中追加 { from, to }（可选 filter）即可把任意目录打入安装包资源
// from 为项目内相对路径；to 为安装包内 resources 下的相对目标路径
type ResourceMapping = { from: string; to: string; filter?: string[] };
const extraResourceMappings: ResourceMapping[] = [
  { from: 'Backend/ExternalToolsIntegration/Tool1', to: 'backend/tool1' },
  { from: 'Backend/ExternalToolsIntegration/Tool2', to: 'backend/tool2' },
  { from: 'Backend/TechStack1', to: 'backend/service' }
  // 在此追加更多映射，如：{ from: 'Backend/Tools', to: 'backend/tools' }
];
// -------------------------

export default configure((/* ctx */) => {
  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/Client/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      'axios',
      'framework-init'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: [ 'es2022', 'firefox115', 'chrome115', 'safari14' ],
        node: 'node20'
      },

      typescript: {
        strict: true,
        vueShim: true
        // extendTsConfig (tsConfig) {}
      },

      vueRouterMode: 'hash', // available values: 'hash', 'history'
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      // env: {},
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir: Vite 最终 UI 产物目录
      distDir: '.dist',

      extendViteConf (viteConf) {
        // 缓存目录重定向
        // .build/ 统一存放 Vite 缓存
        viteConf.cacheDir = '.build/vite';

        // 别名重定向（保持模板写法不变）
        viteConf.resolve = viteConf.resolve || {};
        // 使用数组并控制顺序，确保更具体规则优先
        const alias = [];
        alias.push(
          // 基础别名（保持 Quasar 模板兼容性）
          { find: 'src/css', replacement: path.resolve(__dirname, 'Client/GUI') },
          { find: 'src/boot', replacement: path.resolve(__dirname, 'Client/boot') },
          { find: 'src', replacement: path.resolve(__dirname, 'Client') },
          { find: 'app/src', replacement: path.resolve(__dirname, 'Client') },
          { find: 'app', replacement: path.resolve(__dirname, '.') },
          
          // GUI 层别名
          { find: 'layouts', replacement: path.resolve(__dirname, 'Client/GUI/layouts') },
          { find: 'pages', replacement: path.resolve(__dirname, 'Client/GUI/PagesLayout') },
          { find: 'components', replacement: path.resolve(__dirname, 'Client/GUI/components') },
          { find: 'assets', replacement: path.resolve(__dirname, 'Client/GUI/assets') },
          
          // 核心功能别名
          { find: 'boot', replacement: path.resolve(__dirname, 'Client/boot') },
          { find: '@service', replacement: path.resolve(__dirname, 'Client/Service') },
          { find: '@stores', replacement: path.resolve(__dirname, 'Client/stores') },
          { find: '@utils', replacement: path.resolve(__dirname, 'Client/Utils') },
          { find: '@gui', replacement: path.resolve(__dirname, 'Client/GUI') },
          
          // 系统入口别名
          { find: '@index', replacement: path.resolve(__dirname, 'Client/GUI/Index') },
          { find: '@pages', replacement: path.resolve(__dirname, 'Client/GUI/PagesLayout') },
          
          // 共享资源别名
          { find: '@shared', replacement: path.resolve(__dirname, 'Client/Service/shared') },
          { find: '@shared-utils', replacement: path.resolve(__dirname, 'Client/Utils/shared') },
          { find: '@shared-stores', replacement: path.resolve(__dirname, 'Client/stores') }
        );
        viteConf.resolve.alias = alias;
      },
      // viteVuePluginOptions: {},
      
        vitePlugins: [
        ['vite-plugin-checker', {
          vueTsc: false,
          eslint: {
            // 扫描 Client 与 Electron 源码
            lintCommand: 'eslint -c ./eslint.config.js "./Client/**/*.{ts,js,mjs,cjs,vue}" "./src-electron/**/*.{ts,js,mjs,cjs}"',
            useFlatConfig: true
          }
        }, { server: false }]
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      open: true // opens browser window automatically
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: []
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    sourceFiles: {
      // 通过上方 alias，将 src/* 指向 Client/*
      rootComponent: 'src/GUI/App.vue',
      router: 'src/GUI/router/index',
      store: 'src/stores/index',
      electronMain: 'src-electron/core/electron-main',
      electronPreload: 'src-electron/core/electron-preload'
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000, // The default port that the production server should use
                      // (gets superseded if process.env.PORT is specified at runtime)

      middlewares: [
        'render' // keep this as last one
      ],

      // extendPackageJson (json) {},
      // extendSSRWebserverConf (esbuildConf) {},

      // manualStoreSerialization: true,
      // manualStoreSsrContextInjection: true,
      // manualStoreHydration: true,
      // manualPostHydrationTrigger: true,

      pwa: false
      // pwaOfflineHtmlFilename: 'offline.html', // do NOT use index.html as name!

      // pwaExtendGenerateSWOptions (cfg) {},
      // pwaExtendInjectManifestOptions (cfg) {}
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'GenerateSW' // 'GenerateSW' or 'InjectManifest'
      // swFilename: 'sw.js',
      // manifestFilename: 'manifest.json',
      // extendManifestJson (json) {},
      // useCredentialsForManifestTag: true,
      // injectPwaMetaTags: false,
      // extendPWACustomSWConf (esbuildConf) {},
      // extendGenerateSWOptions (cfg) {},
      // extendInjectManifestOptions (cfg) {}
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      extendElectronMainConf (esbuildConf) {
        // 配置外部依赖，避免打包原生模块
        esbuildConf.external = esbuildConf.external || [];
        esbuildConf.external.push('better-sqlite3');
      },
      
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: [ 'core/electron-preload' ],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      // 使用 electron-builder 以生成 NSIS 安装包
      bundler: 'builder', // 'packager' or 'builder'

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },

      builder: {
        // https://www.electron.build/configuration/configuration
        appId: 'biology-toolbox',
        // Electron-Builder 打包最终产物目录（安装包、unpacked 等）
        directories: {
          output: '.release'
        },
        // 使用多尺寸 ICO 图标文件
        win: { icon: 'public/app-icon.ico' },
        mac: { icon: 'public/app-icon.ico' },
        linux: { icon: 'public/app-icon.ico' },
        // 追加资源：优先保持 .dist/backend 既有逻辑；并通过"目录映射配置区"批量加入
        extraResources: (() => {
          const resources = [] as any[];
          const backendDistPath = path.resolve(__dirname, '.dist', 'backend');
          if (fs.existsSync(backendDistPath)) {
            resources.push({
              from: '.dist/backend',
              to: 'backend',
              filter: ['**/*']
            });
          }
          // 扫描并采纳轻量映射配置（仅在源目录存在时生效）
          for (const map of extraResourceMappings) {
            const abs = path.resolve(__dirname, map.from);
            if (fs.existsSync(abs)) {
              resources.push({
                from: map.from,
                to: map.to,
                filter: map.filter ?? ['**/*']
              });
            }
          }
          return resources;
        })(),
        // 一律解包 backend 目录，防止 asar 压缩导致可执行/动态加载失败
        asarUnpack: ['backend/**']
      }
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: []
    }
  }
});
