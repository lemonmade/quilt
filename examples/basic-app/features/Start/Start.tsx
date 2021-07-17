import {useCookie, useCurrentUrl} from '@quilted/quilt';

import styles from './Start.module.css';

export default function Start() {
  const currentUrl = useCurrentUrl();
  const user = useCookie('user');

  return (
    <div className={styles.Start}>
      Hello world!!! Route: {currentUrl.pathname}, User: {user ?? 'no user'}
    </div>
  );
}
