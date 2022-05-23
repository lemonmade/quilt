declare module '*.module.css' {
  const classnames: {[key: string]: string};
  export default classnames;
}

declare module '*.css' {
  const styles: string;
  export default styles;
}
