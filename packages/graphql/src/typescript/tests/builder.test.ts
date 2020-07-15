import * as path from 'path';
import {createBuilder} from '..';

const fixtures = path.resolve(__dirname, 'fixtures');

describe('builder', () => {
  it('fails hard', async () => {
    const builder = await createBuilder(path.join(fixtures, 'simple'));
    await builder.run();
  });
});
