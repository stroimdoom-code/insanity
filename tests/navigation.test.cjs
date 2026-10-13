const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Проверяем переходы отдельно от оформления и внешнего плеера VK.
function setup() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'booklet.js'), 'utf8');
  const location = {hash: ''};
  const status = {};
  const progress = {};
  const previous = {};
  const next = {};
  const frame = {
    src: 'https://vk.ru/video_ext.php?oid=-216309189&id=456239484',
    dataset: {},
    getAttribute() {return this.src;},
    removeAttribute() {this.src = '';},
  };
  const pages = Array.from({length: 8}, (_, index) => ({
    hidden: index !== 0,
    classList: {add() {}, remove() {}},
    querySelector() {return {focus() {}};},
    querySelectorAll(selector) {
      return index === 4 && (selector === 'iframe' || frame.dataset.videoSrc) ? [frame] : [];
    },
  }));
  const historyEntries = [];
  const context = {
    document: {
      querySelectorAll(selector) {
        return {'.page': pages, '[data-prev]': [previous], '[data-next]': [next], '[data-chapter]': []}[selector];
      },
      getElementById(id) {return id === 'page-status' ? status : progress;},
    },
    window: {matchMedia: () => ({matches: true}), scrollTo() {}},
    location,
    history: {pushState(_state, _title, hash) {location.hash = hash; historyEntries.push(hash);}},
  };
  vm.createContext(context);
  vm.runInContext(source.slice(0, source.indexOf('\npages.forEach((page, index)')), context);
  context.restorePage();
  return {context, pages, previous, next, status, progress, location, frame, historyEntries};
}

test('Перелистывание не зацикливается на первой и последней страницах', () => {
  const state = setup();
  state.context.prevPage();
  assert.equal(state.previous.disabled, true);
  assert.equal(state.pages[0].hidden, false);
  state.context.goToPage(8);
  state.context.nextPage();
  assert.equal(state.next.disabled, true);
  assert.equal(state.pages[7].hidden, false);
  assert.equal(state.progress.value, 8);
  assert.equal(state.pages.filter(page => !page.hidden).length, 1);
});

test('Карта, прямые переходы и история сохраняют выбранный раздел', () => {
  const state = setup();
  state.context.goToPage(4);
  state.context.goToPage(7);
  state.context.prevPage();
  assert.equal(state.location.hash, '#page6');
  state.location.hash = '#page4';
  state.context.restorePage();
  assert.equal(state.pages[3].hidden, false);
  assert.equal(state.historyEntries.length, 3);
  state.location.hash = '#page999';
  state.context.restorePage();
  assert.equal(state.pages[0].hidden, false);
});

test('При уходе видео отключается, при возвращении источник восстанавливается', () => {
  const state = setup();
  const source = state.frame.src;
  state.context.goToPage(5);
  state.context.goToPage(6);
  assert.equal(state.frame.src, '');
  assert.equal(state.frame.dataset.videoSrc, source);
  state.context.goToPage(5);
  assert.equal(state.frame.src, source);
  assert.equal(state.frame.dataset.videoSrc, undefined);
});

test('Неверные номера страниц не меняют состояние', () => {
  const state = setup();
  for (const number of [-1, 8, NaN, 1.5, '5']) state.context.showPage(number);
  assert.equal(state.pages[0].hidden, false);
  assert.equal(state.historyEntries.length, 0);
});
