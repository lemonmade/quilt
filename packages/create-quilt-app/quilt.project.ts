import {createPackage, quiltPackage, Runtime} from '@quilted/craft';

export default createPackage((pkg) => {
  pkg.runtime(Runtime.Node);
  pkg.binary({name: 'create-quilt-app', source: './source/index'});
  pkg.use(quiltPackage({build: {bundle: true}}));
});
