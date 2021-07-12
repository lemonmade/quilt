# Interacting with HTTP in Quilt apps

In web applications, it’s fairly common to need to interact with HTTP primitives:

- You may want to set a custom HTTP status code on your HTML response, like a `404` code to represent a page where no resource was found.
- You’ll often need to read from HTTP headers — especially the `Cookie` header, which gives you the cookies for this user — in order to authenticate or customize the application.
- You may want to set additional HTTP headers on the HTML response, like a [`Content-Security-Policy` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) to control what sources the app can connect to, or a `Location` header to perform an [HTTP redirect](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/301).

Quilt strongly encourages [server rendering your application](./server-rendering.md), so we want to make sure you have access to all these features of HTTP. Because Quilt is a [component-focused framework](./TODO), though, we put a component-friendly spin on these concepts. You can read HTTP details using hooks, and you can write them with hooks or components. This guide covers the prerequisites and limitations of these features, and how to use them in your application.

## Getting started
