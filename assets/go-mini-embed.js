/* A bounded lesson panel, not a second independently scrolling document. */
if (window.self !== window.top || new URLSearchParams(location.search).get('embed') === '1') {
  document.documentElement.classList.add('embedded');
}
