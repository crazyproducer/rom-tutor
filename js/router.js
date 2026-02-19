export class Router {
  #routes = [];
  #currentCleanup = null;
  #container = null;

  constructor(container) {
    this.#container = container;
  }

  add(pattern, handler) {
    const paramNames = [];
    const regexStr = pattern.replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    const regex = new RegExp(`^${regexStr}$`);
    this.#routes.push({ pattern, regex, paramNames, handler });
    return this;
  }

  start() {
    window.addEventListener('hashchange', () => this.#resolve());
    this.#resolve();
  }

  navigate(path) {
    window.location.hash = path;
  }

  getCurrentPath() {
    return window.location.hash.slice(1) || '/';
  }

  #resolve() {
    const hash = window.location.hash.slice(1) || '/';

    if (this.#currentCleanup) {
      this.#currentCleanup();
      this.#currentCleanup = null;
    }

    for (const route of this.#routes) {
      const match = hash.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        const cleanup = route.handler(this.#container, params);
        if (typeof cleanup === 'function') {
          this.#currentCleanup = cleanup;
        }
        this.#updateNav(hash);
        return;
      }
    }

    // fallback to home
    this.navigate('/');
  }

  #updateNav(hash) {
    document.querySelectorAll('.nav-item').forEach(item => {
      const route = item.dataset.route;
      if (route === '/') {
        item.classList.toggle('active', hash === '/');
      } else {
        item.classList.toggle('active', hash.startsWith(route));
      }
    });
  }
}
