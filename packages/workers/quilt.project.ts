import {createProject, quiltPackage, Runtime} from '@quilted/craft';

export default createProject((pkg) => {
  pkg.entry({source: './source/index'});
  pkg.entry({name: 'babel', source: './source/babel', runtime: Runtime.Node});

  // We need commonjs for the babel plugin
  pkg.use(quiltPackage({commonjs: true}));
});
