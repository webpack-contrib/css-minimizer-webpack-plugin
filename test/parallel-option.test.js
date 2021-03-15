import os from 'os';

import Worker from 'jest-worker';

import CssMinimizerPlugin from '../src/index';

import {
  compile,
  getCompiler,
  getErrors,
  getWarnings,
  readAssets,
} from './helpers';

jest.mock('os', () => {
  const actualOs = jest.requireActual('os');

  const mocked = {
    cpus: jest.fn(() => {
      return { length: 4 };
    }),
  };

  return { ...actualOs, ...mocked };
});

// Based on https://github.com/facebook/jest/blob/edde20f75665c2b1e3c8937f758902b5cf28a7b4/packages/jest-runner/src/__tests__/test_runner.test.js
let workerTransform;
let workerEnd;

const ENABLE_WORKER_THREADS =
  typeof process.env.ENABLE_WORKER_THREADS !== 'undefined'
    ? process.env.ENABLE_WORKER_THREADS === 'true'
    : true;

jest.mock('jest-worker', () =>
  jest.fn().mockImplementation((workerPath) => {
    return {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      transform: (workerTransform = jest.fn((data) =>
        // eslint-disable-next-line global-require, import/no-dynamic-require
        require(workerPath).transform(data)
      )),
      end: (workerEnd = jest.fn()),
      getStderr: jest.fn(),
      getStdout: jest.fn(),
    };
  })
);

const workerPath = require.resolve('../src/minify');

describe('parallel option', () => {
  let compiler;

  beforeEach(() => {
    jest.clearAllMocks();

    compiler = getCompiler({
      entry: {
        one: `${__dirname}/fixtures/entry.js`,
        two: `${__dirname}/fixtures/entry.js`,
        three: `${__dirname}/fixtures/entry.js`,
        four: `${__dirname}/fixtures/entry.js`,
      },
    });
  });

  it('should match snapshot when a value is not specify', async () => {
    new CssMinimizerPlugin().apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: os.cpus().length - 1,
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "false" value', async () => {
    new CssMinimizerPlugin({ parallel: false }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(0);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "true" value', async () => {
    new CssMinimizerPlugin({ parallel: true }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: Math.min(4, os.cpus().length - 1),
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "2" value', async () => {
    new CssMinimizerPlugin({ parallel: 2 }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: 2,
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "true" value when only one file passed', async () => {
    compiler = getCompiler({
      entry: `${__dirname}/fixtures/entry.js`,
    });

    new CssMinimizerPlugin({ parallel: true }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: Math.min(1, os.cpus().length - 1),
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "true" value and the number of files is less than the number of cores', async () => {
    const entries = {};

    for (let i = 0; i < os.cpus().length / 2; i++) {
      entries[`entry-${i}`] = `${__dirname}/fixtures/entry.js`;
    }

    compiler = getCompiler({ entry: entries });

    new CssMinimizerPlugin({ parallel: true }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: Math.min(Object.keys(entries).length, os.cpus().length - 1),
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "true" value and the number of files is same than the number of cores', async () => {
    const entries = {};

    for (let i = 0; i < os.cpus().length; i++) {
      entries[`entry-${i}`] = `${__dirname}/fixtures/entry.js`;
    }

    compiler = getCompiler({ entry: entries });

    new CssMinimizerPlugin({ parallel: true }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: Math.min(Object.keys(entries).length, os.cpus().length - 1),
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });

  it('should match snapshot for the "true" value and the number of files is more than the number of cores', async () => {
    const entries = {};

    for (let i = 0; i < os.cpus().length * 2; i++) {
      entries[`entry-${i}`] = `${__dirname}/fixtures/entry.js`;
    }

    compiler = getCompiler({
      entry: {
        one: `${__dirname}/fixtures/entry.js`,
        two: `${__dirname}/fixtures/entry.js`,
        three: `${__dirname}/fixtures/entry.js`,
        four: `${__dirname}/fixtures/entry.js`,
        five: `${__dirname}/fixtures/entry.js`,
        six: `${__dirname}/fixtures/entry.js`,
        seven: `${__dirname}/fixtures/entry.js`,
        eight: `${__dirname}/fixtures/entry.js`,
      },
    });

    new CssMinimizerPlugin({ parallel: true }).apply(compiler);

    const stats = await compile(compiler);

    expect(Worker).toHaveBeenCalledTimes(1);
    expect(Worker).toHaveBeenLastCalledWith(workerPath, {
      enableWorkerThreads: ENABLE_WORKER_THREADS,
      numWorkers: Math.min(Object.keys(entries).length, os.cpus().length - 1),
    });
    expect(workerTransform).toHaveBeenCalledTimes(
      Object.keys(readAssets(compiler, stats, /\.css$/)).length
    );
    expect(workerEnd).toHaveBeenCalledTimes(1);

    expect(readAssets(compiler, stats, /\.css$/)).toMatchSnapshot('assets');
    expect(getErrors(stats)).toMatchSnapshot('errors');
    expect(getWarnings(stats)).toMatchSnapshot('warnings');
  });
});
