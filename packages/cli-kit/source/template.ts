import * as path from 'path';
import {fileURLToPath} from 'url';
import * as fs from 'fs/promises';
import {globby} from 'globby';

export interface PackageTemplates {
  load(template: string): Promise<Template>;
}

export interface Template {
  copy(to: string, options?: TemplateCopyOptions): Promise<void>;
  read(path: string): Promise<string>;
}

export interface TemplateCopyOptions {
  handleFile?(
    file: string,
    context: {read(): Promise<string>},
  ): boolean | string | Promise<string | boolean>;
}

export async function createPackageTemplates({
  from,
  directory,
}: {
  from: string;
  directory: string;
}): Promise<PackageTemplates> {
  const {packageDirectory} = await import('pkg-dir');

  const packageRoot = await packageDirectory({
    cwd: path.dirname(fileURLToPath(from)),
  });
  const templateRoot = path.join(packageRoot!, directory);

  return {
    async load(template) {
      return createTemplate(path.join(templateRoot, template));
    },
  };
}

export function createTemplate(root: string): Template {
  const template: Template = {
    async copy(to, {handleFile} = {}) {
      const targetRoot = path.resolve(to);

      const files = await globby('**/*', {
        cwd: root,
        absolute: false,
      });

      await Promise.all(
        files.map(async (file) => {
          const read = () => fs.readFile(path.resolve(root, file), 'utf-8');
          const content = (await handleFile?.(file, {read})) ?? true;

          if (!content) return;

          const targetPath = path.join(
            targetRoot,
            file.startsWith('_') ? `.${file.slice(1)}` : file,
          );

          const resolvedContent =
            typeof content === 'string' ? content : await read();

          await fs.mkdir(path.dirname(targetPath), {recursive: true});
          await fs.writeFile(targetPath, resolvedContent);
        }),
      );
    },
    read(file: string) {
      return fs.readFile(path.join(root, file), {encoding: 'utf8'});
    },
  };

  return template;
}
