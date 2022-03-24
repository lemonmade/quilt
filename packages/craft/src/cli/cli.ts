import {Task} from '../kit';

run();

async function run() {
  const [, , ...args] = process.argv;
  const [task, ...argv] = args;

  switch (task.toLowerCase()) {
    case Task.Build: {
      const {build} = await import('./tasks/build');
      await build(argv);
      break;
    }
    case Task.Develop: {
      const {develop} = await import('./tasks/develop');
      await develop(argv);
      break;
    }
    case Task.Lint: {
      const {lint} = await import('./tasks/lint');
      await lint(argv);
      break;
    }
    case Task.Test: {
      const {test} = await import('./tasks/test');
      await test(argv);
      break;
    }
    case Task.TypeCheck: {
      const {typeCheck} = await import('./tasks/type-check');
      await typeCheck(argv);
      break;
    }
    default: {
      // eslint-disable-next-line no-console
      console.log(`Task not found: ${task} (${argv.join(' ')})`);
      process.exitCode = 1;
    }
  }
}

export {};
