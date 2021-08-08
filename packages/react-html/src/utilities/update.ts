export const MANAGED_ATTRIBUTE = 'data-react-html';

export function updateOnClient(state: import('../manager').State) {
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

    titleElement.setAttribute(MANAGED_ATTRIBUTE, 'true');
    titleElement.textContent = title;
  }

  const fragment = document.createDocumentFragment();

  const oldMetas = Array.from(
    document.head.querySelectorAll(`meta[${MANAGED_ATTRIBUTE}]`),
  );

  for (const meta of metas) {
    const element = document.createElement('meta');
    element.setAttribute(MANAGED_ATTRIBUTE, 'true');

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

  const oldLinks = Array.from(
    document.head.querySelectorAll(`link[${MANAGED_ATTRIBUTE}]`),
  );

  for (const link of links) {
    const element = document.createElement('link');
    element.setAttribute(MANAGED_ATTRIBUTE, 'true');

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

  for (const link of oldLinks) {
    link.remove();
  }

  for (const meta of oldMetas) {
    meta.remove();
  }

  document.head.appendChild(fragment);

  for (const [attribute, value] of Object.entries(htmlAttributes)) {
    document.documentElement.setAttribute(attribute, value);
  }

  for (const [attribute, value] of Object.entries(bodyAttributes)) {
    document.body.setAttribute(attribute, value);
  }
}
