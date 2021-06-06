import {createWorkspace, quiltWorkspace} from '@quilted/craft';

export default createWorkspace((workspace) => {
  workspace.use(quiltWorkspace());
});
