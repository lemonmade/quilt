import {jest, describe, it, expect} from '@quilted/testing';
import {stripIndent, withWorkspace} from './utilities.ts';

jest.setTimeout(20_000);

const CODE_WITH_LINT_ERRORS = stripIndent`
  export default function App() {return < div onClick={() => console.log('Not accessible!')} >Hello</div>}
`;

describe('lint', () => {
  describe('quilt run prettier', () => {
    it('passes when all files are correctly formatted', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {command} = workspace;

        const {child} = await command.quilt.run('prettier');

        expect(child.exitCode).toBe(0);
      });
    });

    it('does not prettier on JavaScript source files by default', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child} = await command.quilt.run('prettier');

        expect(child.exitCode).toBe(0);
      });
    });

    it('runs prettier on non-JavaScript files', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'MyQuery.graphql': stripIndent`
            query MyQuery  ($id : ID! ) {
              node(id: $id) { id }
            }
          `,
        });

        const {child} = await command.quilt.run('prettier');

        expect(child.exitCode).toBe(1);
      });
    });

    it('can customize the extensions that are checked with Prettier', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child} = await command.quilt.run('prettier', ['App.tsx']);

        expect(child.exitCode).toBe(1);
      });
    });

    it('can run the Prettier --help command', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child: shorthandChild, stdout: shorthandStdout} =
          await command.quilt.run('prettier', ['-h']);

        expect(shorthandChild.exitCode).toBe(0);
        expect(shorthandStdout).toContain('--help');

        const {child: longhandChild, stdout: longhandStdout} =
          await command.quilt.run('prettier', ['--help']);

        expect(longhandChild.exitCode).toBe(0);
        expect(longhandStdout).toContain('--help');
      });
    });

    it('can run the Prettier --version command', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child: shorthandChild, stdout: shorthandStdout} =
          await command.quilt.run('prettier', ['-v']);

        expect(shorthandChild.exitCode).toBe(0);
        expect(shorthandStdout).toMatch(/\d+\.\d+\.\d+/);

        const {child: longhandChild, stdout: longhandStdout} =
          await command.quilt.run('prettier', ['--version']);

        expect(longhandChild.exitCode).toBe(0);
        expect(longhandStdout).toMatch(/\d+\.\d+\.\d+/);
      });
    });
  });

  describe('quilt run eslint', () => {
    it('runs eslint on all JavaScript source code files', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child, stdout} = await command.quilt.run('eslint', [
          '--no-ignore',
        ]);

        expect(child.exitCode).toBe(1);
        expect(stdout).toContain('App.tsx');
      });
    });

    it('can customize the extensions that are linted with eslint', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'index.ts': `export {default} from './App.tsx';\n`,
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child} = await command.quilt.run('eslint', [
          '--ext',
          '.ts',
          '--no-ignore',
        ]);

        expect(child.exitCode).toBe(0);
      });
    });

    it('can run the ESLint --help command', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child: shorthandChild, stdout: shorthandStdout} =
          await command.quilt.run('eslint', ['-h']);

        expect(shorthandChild.exitCode).toBe(0);
        expect(shorthandStdout).toContain('--help');

        const {child: longhandChild, stdout: longhandStdout} =
          await command.quilt.run('eslint', ['--help']);

        expect(longhandChild.exitCode).toBe(0);
        expect(longhandStdout).toContain('--help');
      });
    });

    it('can run the ESLint --version command', async () => {
      await withWorkspace({fixture: 'empty-app'}, async (workspace) => {
        const {fs, command} = workspace;

        await fs.write({
          'App.tsx': CODE_WITH_LINT_ERRORS,
        });

        const {child: shorthandChild, stdout: shorthandStdout} =
          await command.quilt.run('eslint', ['-v']);

        expect(shorthandChild.exitCode).toBe(0);
        expect(shorthandStdout).toMatch(/v\d+\.\d+\.\d+/);

        const {child: longhandChild, stdout: longhandStdout} =
          await command.quilt.run('eslint', ['--version']);

        expect(longhandChild.exitCode).toBe(0);
        expect(longhandStdout).toMatch(/v\d+\.\d+\.\d+/);
      });
    });
  });
});
