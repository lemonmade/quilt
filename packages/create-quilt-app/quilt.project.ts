import {createProject, quiltPackage, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.binary({name: 'create-quilt-app', source: './source/index'});
  pkg.use(quiltPackage({build: {bundle: true}}));
});
