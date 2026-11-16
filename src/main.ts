import { createSearchSession } from './searchSession.js';
import { mountApp } from './view.js';

const session = createSearchSession();
const app = mountApp(session);

document.body.append(app.element);
session.subscribe(() => {
  app.render();
});
app.render();
