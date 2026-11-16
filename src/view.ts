import type { CountryView } from './mapCountryResponse.js';
import type { SearchState, createSearchSession } from './searchSession.js';

type Session = ReturnType<typeof createSearchSession>;

const numberFormat = new Intl.NumberFormat('ru-RU');

function describeCountry(country: CountryView): string {
  const capital = country.capital
    ? `Столица — ${country.capital}.`
    : 'Столица неизвестна.';
  const region = country.region ? ` Регион — ${country.region}.` : '';

  return `${country.name}. ${capital}${region}`;
}

function textLine(label: string, value: string): HTMLParagraphElement {
  const line = document.createElement('p');
  const caption = document.createElement('span');
  caption.className = 'label';
  caption.textContent = `${label}: `;
  const body = document.createElement('span');
  body.textContent = value;
  line.append(caption, body);
  return line;
}

function message(className: string, text: string): HTMLParagraphElement {
  const node = document.createElement('p');
  node.className = className;
  node.textContent = text;
  return node;
}

function countryCard(
  country: CountryView,
  selected: boolean,
  onSelect: () => void,
): HTMLLIElement {
  const item = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = selected ? 'card card--selected' : 'card';

  if (country.flagUrl) {
    const flag = document.createElement('img');
    flag.className = 'flag';
    flag.src = country.flagUrl;
    flag.alt = `Флаг: ${country.name}`;
    button.append(flag);
  }

  const title = document.createElement('h2');
  title.textContent = country.name;
  button.append(
    title,
    textLine('Столица', country.capital || 'неизвестно'),
    textLine('Регион', country.region || 'неизвестно'),
    textLine('Население', numberFormat.format(country.population)),
  );
  button.addEventListener('click', onSelect);
  item.append(button);
  return item;
}

function detailPanel(country: CountryView, onClose: () => void): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'detail';

  const title = document.createElement('h2');
  title.textContent = country.name;

  const description = document.createElement('p');
  description.textContent = describeCountry(country);

  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Закрыть';
  close.addEventListener('click', onClose);

  const area =
    country.area === null
      ? 'нет данных'
      : `${numberFormat.format(country.area)} км²`;

  panel.append(
    title,
    description,
    textLine('Площадь', area),
    textLine(
      'Границы',
      country.borders.length > 0 ? country.borders.join(', ') : 'нет данных',
    ),
    textLine(
      'Языки',
      country.languages.length > 0
        ? country.languages.join(', ')
        : 'нет данных',
    ),
    textLine(
      'Валюта',
      country.currencies.length > 0
        ? country.currencies.join(', ')
        : 'нет данных',
    ),
    close,
  );

  return panel;
}

export function mountApp(session: Session): {
  element: HTMLElement;
  render: () => void;
} {
  let selectedName: string | null = null;

  const root = document.createElement('main');
  root.className = 'app';

  const heading = document.createElement('h1');
  heading.textContent = 'Поиск стран';

  const label = document.createElement('label');
  label.htmlFor = 'country-query';
  label.textContent = 'Название страны';

  const input = document.createElement('input');
  input.id = 'country-query';
  input.type = 'search';
  input.autocomplete = 'off';
  input.placeholder = 'Например, Spain';

  const output = document.createElement('div');
  output.className = 'output';
  output.setAttribute('aria-live', 'polite');

  input.addEventListener('input', () => {
    selectedName = null;
    session.setQuery(input.value);
  });

  root.append(heading, label, input, output);

  function renderStatus(state: SearchState): void {
    if (state.status === 'idle') {
      output.append(message('status status--idle', 'Введите название страны.'));
      return;
    }

    if (state.status === 'loading') {
      const loading = message('status status--loading', 'Ищем страны…');
      const spinner = document.createElement('span');
      spinner.className = 'spinner';
      spinner.setAttribute('aria-hidden', 'true');
      loading.prepend(spinner);
      output.append(loading);
      return;
    }

    if (state.status === 'empty') {
      output.append(
        message(
          'status status--empty',
          'Ничего не найдено. Попробуйте другой запрос.',
        ),
      );
      return;
    }

    if (state.status === 'error') {
      const box = document.createElement('div');
      box.className = 'status status--error';
      const text =
        state.errorKind === 'timeout'
          ? 'Сервер не ответил вовремя.'
          : 'Не удалось загрузить данные.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Повторить';
      retry.addEventListener('click', () => {
        session.retry();
      });
      box.append(message('error-text', text), retry);
      output.append(box);
    }
  }

  function render(): void {
    const state = session.getState();
    const selected = state.countries.find(
      (country) => country.name === selectedName,
    );

    if (!selected) {
      selectedName = null;
    }

    output.replaceChildren();
    renderStatus(state);

    if (state.status !== 'results') {
      return;
    }

    const list = document.createElement('ul');
    list.className = 'cards';

    for (const country of state.countries) {
      list.append(
        countryCard(country, country.name === selectedName, () => {
          selectedName = selectedName === country.name ? null : country.name;
          render();
        }),
      );
    }

    output.append(list);

    if (selected) {
      output.append(
        detailPanel(selected, () => {
          selectedName = null;
          render();
        }),
      );
    }
  }

  return { element: root, render };
}
