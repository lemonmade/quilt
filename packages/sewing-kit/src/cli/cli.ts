run();

async function run() {
  const [, , ...args] = process.argv;
  const [command, ...argv] = args;

  switch (command) {
    case 'build': {
      const {build} = await import('./commands/build');
      await build(argv);
      break;
    }
    case 'develop': {
      const {develop} = await import('./commands/develop');
      await develop(argv);
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
