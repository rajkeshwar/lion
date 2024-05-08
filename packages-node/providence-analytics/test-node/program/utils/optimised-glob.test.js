import { globby } from 'globby';
// eslint-disable-next-line import/no-extraneous-dependencies
import { expect } from 'chai';
// import { vol } from 'memfs';
// eslint-disable-next-line import/no-extraneous-dependencies
import mockFs from 'mock-fs';

import { optimisedGlob } from '../../../src/program/utils/optimised-glob.js';

const measurePerf = process.argv.includes('--measure-perf');

/**
 * @param {*} patterns
 * @param {*} options
 * @returns
 */
async function runOptimisedGlobAndCheckGlobbyParity(patterns, options) {
  performance.mark('start-optimisedGlob');
  const optimisedGlobResult = await optimisedGlob(patterns, options);
  performance.mark('end-optimisedGlob');

  performance.mark('start-globby');
  const globbyResult = await globby(patterns, options);
  performance.mark('end-globby');

  if (measurePerf) {
    const optimisedGlobPerf = performance.measure(
      'optimisedGlob',
      'start-optimisedGlob',
      'end-optimisedGlob',
    );
    const globbyPerf = performance.measure('globby', 'start-globby', 'end-globby');
    console.debug(
      `optimisedGlob was ${
        globbyPerf.duration - optimisedGlobPerf.duration
      }ms quicker than globby.`,
    );
  }

  expect(optimisedGlobResult).to.deep.equal(globbyResult);

  return optimisedGlobResult;
}

describe('optimisedGlob', () => {
  const testCfg = {
    cwd: '/fakeFs',
    // fs: vol,
  };

  beforeEach(() => {
    const fakeFs = {
      '/fakeFs/my/folder/some/file.js': 'content',
      '/fakeFs/my/folder/lvl1/some/file.js': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/some/file.js': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/lvl3/some/file.js': 'content',
      '/fakeFs/my/folder/some/file.d.ts': 'content',
      '/fakeFs/my/folder/lvl1/some/file.d.ts': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/some/file.d.ts': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/lvl3/some/file.d.ts': 'content',

      '/fakeFs/my/folder/some/anotherFile.js': 'content',
      '/fakeFs/my/folder/lvl1/some/anotherFile.js': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/some/anotherFile.js': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/lvl3/some/anotherFile.js': 'content',
      '/fakeFs/my/folder/some/anotherFile.d.ts': 'content',
      '/fakeFs/my/folder/lvl1/some/anotherFile.d.ts': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/some/anotherFile.d.ts': 'content',
      '/fakeFs/my/folder/lvl1/lvl2/lvl3/some/anotherFile.d.ts': 'content',

      '/fakeFs/my/.hiddenFile.js': 'content',
    };

    // vol.fromJSON(fakeFs);
    mockFs(fakeFs);
  });

  afterEach(() => {
    // vol.reset();
    mockFs.restore();
  });

  describe('Star patterns', () => {
    it('supports double asterisk like "my/folder/**/some/file.js" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity(
        'my/folder/**/some/file.js',
        testCfg,
      );

      expect(files).to.deep.equal([
        'my/folder/some/file.js',
        'my/folder/lvl1/some/file.js',
        'my/folder/lvl1/lvl2/some/file.js',
        'my/folder/lvl1/lvl2/lvl3/some/file.js',
      ]);
    });

    it('supports single asterisk like "my/folder/*/some/file.js" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('my/folder/*/some/file.js', testCfg);

      expect(files).to.deep.equal(['my/folder/lvl1/some/file.js']);
    });

    it('supports filenames like "my/folder/lvl1/some/*il*.js" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity(
        'my/folder/lvl1/some/*il*.js',
        testCfg,
      );

      expect(files).to.deep.equal([
        'my/folder/lvl1/some/anotherFile.js',
        'my/folder/lvl1/some/file.js',
      ]);
    });

    it('supports globs starting with a star like "**/some/file.js" ', async () => {
      const filesDoubleStar = await runOptimisedGlobAndCheckGlobbyParity(
        '**/some/file.js',
        testCfg,
      );

      expect(filesDoubleStar).to.deep.equal([
        'my/folder/some/file.js',
        'my/folder/lvl1/some/file.js',
        'my/folder/lvl1/lvl2/some/file.js',
        'my/folder/lvl1/lvl2/lvl3/some/file.js',
      ]);

      const filesSingleStar = await runOptimisedGlobAndCheckGlobbyParity(
        '*/folder/some/file.js',
        testCfg,
      );

      expect(filesSingleStar).to.deep.equal(['my/folder/some/file.js']);
    });

    it('gives empty output when location does not exist" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('my/folder/**/some/file.js', {
        ...testCfg,
        cwd: '/nonExisting/path', // this will not exist
      });

      expect(files).to.deep.equal([]);
    });

    it('omits hidden files" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('*/*/*/*', testCfg);

      expect(files).to.deep.equal([
        'my/folder/some/anotherFile.d.ts',
        'my/folder/some/anotherFile.js',
        'my/folder/some/file.d.ts',
        'my/folder/some/file.js',
      ]);
    });
  });

  describe('Accolade patterns', () => {
    it('works with filenames like "my/folder/*/some/file.{js,d.ts}" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity(
        'my/folder/*/some/file.{js,d.ts}',
        testCfg,
      );

      expect(files).to.deep.equal(['my/folder/lvl1/some/file.d.ts', 'my/folder/lvl1/some/file.js']);
    });
  });

  describe('Multiple globs', () => {
    it('accepts an array of globs, like ["my/folder/*/some/file.js", "my/folder/lvl1/*/some/file.js"]', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity(
        ['my/folder/*/some/file.js', 'my/folder/lvl1/*/some/file.js'],
        testCfg,
      );

      expect(files).to.deep.equal([
        'my/folder/lvl1/some/file.js',
        'my/folder/lvl1/lvl2/some/file.js',
      ]);
    });

    it('accepts nedgated globs, like ["my/folder/**/some/file.js", "!my/folder/*/some/file.js"]', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity(
        ['my/folder/**/some/file.js', '!my/folder/*/some/file.js'],
        testCfg,
      );

      expect(files).to.deep.equal([
        'my/folder/some/file.js',
        'my/folder/lvl1/lvl2/some/file.js',
        'my/folder/lvl1/lvl2/lvl3/some/file.js',
      ]);
    });
  });

  describe('Options', () => {
    it('"absolute" returns full system paths', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('my/folder/*/some/file.{js,d.ts}', {
        ...testCfg,
        absolute: true,
      });

      expect(files).to.deep.equal([
        '/fakeFs/my/folder/lvl1/some/file.d.ts',
        '/fakeFs/my/folder/lvl1/some/file.js',
      ]);
    });

    it('"cwd" changes relative starting point of glob', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('folder/*/some/file.{js,d.ts}', {
        ...testCfg,
        cwd: '/fakeFs/my',
      });

      expect(files).to.deep.equal(['folder/lvl1/some/file.d.ts', 'folder/lvl1/some/file.js']);
    });

    it('"onlyDirectories" returns only directories/folders', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('my/folder/*/some', {
        ...testCfg,
        onlyDirectories: true,
      });

      expect(files).to.deep.equal(['my/folder/lvl1/some']);
    });

    it('"onlyFiles" returns only files', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('my/folder/*/some', {
        ...testCfg,
        onlyFiles: true,
      });

      expect(files).to.deep.equal([]);
    });

    it('"deep" limits the level of results', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('my/folder/**', {
        ...testCfg,
        onlyDirectories: true,
        deep: 1,
      });
      expect(files).to.deep.equal(['my/folder/lvl1', 'my/folder/some']);

      const files2 = await runOptimisedGlobAndCheckGlobbyParity('my/folder/**', {
        ...testCfg,
        onlyDirectories: true,
        deep: 2,
      });

      expect(files2).to.deep.equal([
        'my/folder/lvl1',
        'my/folder/some',
        'my/folder/lvl1/lvl2',
        'my/folder/lvl1/some',
      ]);
    });

    it('"dot" allows hidden files" ', async () => {
      const files = await runOptimisedGlobAndCheckGlobbyParity('*/*', { ...testCfg, dot: true });

      expect(files).to.deep.equal(['my/.hiddenFile.js']);
    });

    it.skip('"suppressErrors" throws errors when paths do not exist', async () => {
      expect(async () =>
        optimisedGlob('my/folder/**/some/file.js', {
          ...testCfg,
          cwd: '/nonExisting/path', // this will not exist
          suppressErrors: false,
        }),
      ).to.throw();
    });
  });
});
