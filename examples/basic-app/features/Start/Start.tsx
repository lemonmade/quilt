import {useCurrentUrl} from '@quilted/quilt';

import styles from './Start.module.css';

export default function Start() {
  const currentUrl = useCurrentUrl();
  return (
    <div className={styles.Start}>
      Hello world!!! Route: {currentUrl.pathname}
    </div>
  );
}
