/** Интерактивная навигация и просмотр фотографий буклета. */
const pages = [...document.querySelectorAll('.page')];
const chapterNames = ['Обложка', 'О проекте', 'История села', 'Карта', 'Памятники', 'КРиММ', 'Дом-музей', 'Заключение'];
let current = 0;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Обновляет кнопки, содержание и индикатор текущей страницы. */
function updateNavigation() {
  document.querySelectorAll('[data-prev]').forEach(button => {
    button.disabled = current === 0;
    button.title = current > 0 ? `Предыдущая страница: ${chapterNames[current - 1]}` : 'Вы на первой странице';
  });
  document.querySelectorAll('[data-next]').forEach(button => {
    button.disabled = current === pages.length - 1;
    button.title = current < pages.length - 1 ? `Следующая страница: ${chapterNames[current + 1]}` : 'Вы на последней странице';
  });
  document.querySelectorAll('[data-chapter]').forEach(button => {
    if (Number(button.dataset.chapter) === current) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('page-status').textContent = `${current + 1} / ${pages.length} · ${chapterNames[current]}`;
  document.getElementById('reading-progress').value = current + 1;
}

/** Показывает страницу и останавливает видео покинутого раздела.
 * @param {number} index Индекс страницы с нуля.
 * @param {boolean} syncHash Обновлять ли адрес для истории браузера.
 */
function showPage(index, syncHash = true) {
  if (!Number.isInteger(index) || index < 0 || index >= pages.length) return;
  if (index !== current) {
    // Перезагрузка скрытого плеера прекращает звук без зависимости от API VK.
    pages[current].querySelectorAll('iframe').forEach(frame => {
      const source = frame.getAttribute('src');
      frame.removeAttribute('src');
      frame.dataset.videoSrc = source;
    });
    pages[current].classList.remove('active');
    current = index;
  }
  pages.forEach((page, pageIndex) => { page.hidden = pageIndex !== current; });
  pages[current].classList.add('active');
  pages[current].querySelectorAll('iframe[data-video-src]').forEach(frame => {
    frame.src = frame.dataset.videoSrc;
    delete frame.dataset.videoSrc;
  });
  if (syncHash && location.hash !== `#page${current + 1}`) history.pushState(null, '', `#page${current + 1}`);
  updateNavigation();
  const heading = pages[current].querySelector('h1, h2');
  heading.focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}

/** Переходит к следующей странице без зацикливания. */
function nextPage() { showPage(current + 1); }
/** Переходит к предыдущей странице без зацикливания. */
function prevPage() { showPage(current - 1); }
/** Открывает страницу по номеру с единицы.
 * @param {number} number Номер страницы.
 */
function goToPage(number) { showPage(number - 1); }

/** Восстанавливает раздел из ссылки или истории браузера. */
function restorePage() {
  const match = /^#page([1-8])$/.exec(location.hash);
  showPage(match ? Number(match[1]) - 1 : 0, false);
}

pages.forEach((page, index) => {
  page.querySelector('h1, h2').tabIndex = -1;
  if (index > 0) {
    const label = document.createElement('div');
    label.className = 'eyebrow';
    label.textContent = `Живая история / ${String(index + 1).padStart(2, '0')}`;
    page.querySelector('.section').prepend(label);
  }
  const footer = page.querySelector('.footer-nav');
  const status = document.createElement('span');
  status.className = 'small';
  status.textContent = `Страница ${index + 1} из ${pages.length}`;
  const nav = document.createElement('div');
  nav.className = 'navbtns';
  nav.innerHTML = '<button class="secondary" data-prev onclick="prevPage()">← Назад</button>' +
    (index >= 4 && index <= 6 ? '<button class="secondary" onclick="goToPage(4)">К карте</button>' : '') +
    '<button data-next onclick="nextPage()">Вперёд →</button>';
  footer.append(status, nav);
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.chapter = index;
  button.textContent = `${String(index + 1).padStart(2, '0')} ${chapterNames[index]}`;
  button.addEventListener('click', () => showPage(index));
  document.querySelector('.chapter-nav').append(button);
});

const photoDialog = document.getElementById('photo-dialog');
document.querySelectorAll('.image-button').forEach(button => {
  const image = button.querySelector('img');
  button.setAttribute('aria-label', `Увеличить: ${image.alt}`);
  button.addEventListener('click', () => {
    const preview = photoDialog.querySelector('img');
    preview.src = image.src;
    preview.alt = image.alt;
    photoDialog.querySelector('p').textContent = image.alt;
    photoDialog.showModal();
  });
});
photoDialog.querySelector('button').addEventListener('click', () => photoDialog.close());
photoDialog.addEventListener('click', event => {
  const bounds = photoDialog.getBoundingClientRect();
  if (event.target === photoDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) photoDialog.close();
});
document.addEventListener('keydown', event => {
  if (photoDialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.closest('input, textarea, select, button, a, [contenteditable]')) return;
  if (event.key === 'ArrowRight') { event.preventDefault(); nextPage(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); prevPage(); }
});
window.addEventListener('hashchange', () => {
  if (location.hash !== `#page${current + 1}`) restorePage();
});
window.addEventListener('popstate', restorePage);
restorePage();
