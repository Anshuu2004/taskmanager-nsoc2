import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { build } from 'vite';

function listFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

// After the normal build, list everything in dist/, hash it into a version
// string and bundle src/sw.js into dist/sw.js with both baked in. Any change
// to any shipped file gives a new version, so the browser sees a new worker
// and the old cache gets deleted when it activates.
export default function swPlugin() {
  let outDir = 'dist';
  let root = process.cwd();

  return {
    name: 'task-manager-sw',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      root = config.root;
    },
    async closeBundle() {
      const files = listFiles(outDir)
        .map(file => relative(outDir, file).split('\\').join('/'))
        .filter(file => file !== 'sw.js')
        .sort();

      const hash = createHash('sha256');
      for (const file of files) {
        hash.update(file);
        hash.update(readFileSync(join(outDir, file)));
      }
      const version = hash.digest('hex').slice(0, 10);

      await build({
        configFile: false,
        root,
        publicDir: false,
        logLevel: 'warn',
        define: {
          __SW_VERSION__: JSON.stringify(version),
          __SW_FILES__: JSON.stringify(files)
        },
        build: {
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          lib: {
            entry: resolve(root, 'src/sw.js'),
            formats: ['iife'],
            name: 'taskManagerSW',
            fileName: () => 'sw.js'
          }
        }
      });
    }
  };
}
