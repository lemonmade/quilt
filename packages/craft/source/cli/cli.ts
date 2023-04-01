import arg from 'arg';
import {Task} from '../kit.ts';

run();

async function run() {
  const [, , ...args] = process.argv;
  const {
    _: [command, ...argv],
  } = arg({}, {argv: args, stopAtPositional: true});

  if (!command) {
    // eslint-disable-next-line no-console
    console.log(
      `You must run quilt with one of the following commands: build, develop, lint, test, or type-check.`,
    );
    process.exitCode = 1;
    return;
  }

  switch (command.toLowerCase()) {
    case Task.Build: {
      const {build} = await import('./tasks/build.ts');
      await build(argv);
      break;
    }
    case Task.Develop: {
      const {develop} = await import('./tasks/develop.ts');
      await develop(argv);
      break;
    }
    case Task.Lint: {
      const {lint} = await import('./tasks/lint.ts');
      await lint(argv);
      break;
    }
    case Task.Test: {
      const {test} = await import('./tasks/test.ts');
      await test(argv);
      break;
    }
    case Task.TypeCheck: {
      const {typeCheck} = await import('./tasks/type-check.ts');
      await typeCheck(argv);
      break;
    }
    case 'run': {
      const {run} = await import('./tasks/run.ts');
      await run(argv);
      break;
    }
    default: {
      // eslint-disable-next-line no-console
      console.log(`Command not found: ${command} (${argv.join(' ')})`);
      process.exitCode = 1;
    }
  }
}

export {};
