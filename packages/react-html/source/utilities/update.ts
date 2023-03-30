let initiallyUnmatchedMetas: Element[];
let initiallyUnmatchedLinks: Element[];

export function updateOnClient(state: import('../manager.ts').State) {
  const {title, metas, links, bodyAttributes, htmlAttributes} = state;
  let titleElement = document.querySelector('title');

  if (title == null) {
    if (titleElement) {
      titleElement.remove();
    }
  } else {
    if (titleElement == null) {
      titleElement = document.createElement('title');
      document.head.appendChild(titleElement);
    }

    titleElement.textContent = title;
  }

  const fragment = document.createDocumentFragment();

  const oldMetas = Array.from(document.head.querySelectorAll('meta'));

  for (const meta of metas) {
    const element = document.createElement('meta');

    for (const [attribute, value] of Object.entries(meta)) {
      element.setAttribute(attribute, value);
    }

    const matchingOldMetaIndex = oldMetas.findIndex((oldMeta) =>
      oldMeta.isEqualNode(element),
    );

    if (matchingOldMetaIndex >= 0) {
      oldMetas.splice(matchingOldMetaIndex, 1);
    } else {
      fragment.appendChild(element);
    }
  }

  const oldLinks = Array.from(document.head.querySelectorAll('link'));

  for (const link of links) {
    const element = document.createElement('link');

    for (const [attribute, value] of Object.entries(link)) {
      element.setAttribute(attribute, value);
    }

    const matchingOldLinkIndex = oldLinks.findIndex((oldLink) =>
      oldLink.isEqualNode(element),
    );

    if (matchingOldLinkIndex >= 0) {
      oldLinks.splice(matchingOldLinkIndex, 1);
    } else {
      fragment.appendChild(element);
    }
  }

  if (initiallyUnmatchedLinks == null) {
    initiallyUnmatchedLinks = oldLinks;
  }

  if (initiallyUnmatchedMetas == null) {
    initiallyUnmatchedMetas = oldMetas;
  }

  for (const link of oldLinks) {
    if (!initiallyUnmatchedLinks.includes(link)) {
      link.remove();
    }
  }

  for (const meta of oldMetas) {
    if (!initiallyUnmatchedMetas.includes(meta)) {
      meta.remove();
    }
  }

  document.head.appendChild(fragment);

  for (const [attribute, value] of Object.entries(htmlAttributes)) {
    document.documentElement.setAttribute(attribute, value);
  }

  for (const [attribute, value] of Object.entries(bodyAttributes)) {
    document.body.setAttribute(attribute, value);
  }
}
