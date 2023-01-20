import {usePerformanceNavigation} from '@quilted/quilt';

import styles from './Start.module.css';

export default function Start() {
  // This hook indicates that the page has loaded. It is used as part of Quilt’s
  // navigation performance tracking feature. If you have disabled this feature,
  // you can remove this hook.
  usePerformanceNavigation();

  return <div className={styles.Start}>Hello world!</div>;
}
