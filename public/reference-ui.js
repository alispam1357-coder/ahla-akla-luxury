(function () {
  const sectionArt = {
    mahshi: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1800&q=88',
    chicken: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=1800&q=88',
    meat: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1800&q=88',
    trays: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Lasagna_in_Baking_Tray.jpg',
    'vegetable-casseroles': 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1800&q=88',
    rice: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Rice-bowl.jpg',
    sambousek: 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=1800&q=88',
    salads: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1800&q=88',
    'birthday-buffet': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1800&q=88'
  };

  const artFor = category => sectionArt[category.slug] || sectionArt.mahshi;

  function decorate() {
    document.querySelectorAll('#categoryPills button').forEach(button => {
      if (button.dataset.decorated) return;
      const category = button.dataset.target;
      const label = button.textContent.replace(/^\S+\s*/, '');
      button.innerHTML = `<img src="${artFor({ slug: category })}" alt=""><span>${label}</span>`;
      button.dataset.decorated = 'true';
    });

    document.querySelectorAll('#menuSections .menu-category').forEach(section => {
      const slug = section.id;
      section.style.setProperty('--section-bg', `url("${artFor({ slug })}")`);
      section.classList.add('reference-section-page');
    });

    installSectionArrows();
  }

  function installSectionArrows() {
    const menu = document.querySelector('.menu-section');
    const rail = document.querySelector('#categoryPills');
    if (!menu || !rail || menu.querySelector('.section-carousel-controls')) return;
    const controls = document.createElement('div');
    controls.className = 'section-carousel-controls';
    controls.innerHTML = '<button type="button" class="section-arrow section-arrow-prev" aria-label="Previous section">&#8592;</button><button type="button" class="section-arrow section-arrow-next" aria-label="Next section">&#8594;</button>';
    menu.append(controls);
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'section-next-button';
    nextButton.innerHTML = '<span class="sr-only">Next section</span><b aria-hidden="true">&#10132;</b>';
    menu.append(nextButton);
    let activeIndex = 0;
    const buttons = () => [...rail.querySelectorAll('button')];
    menu.style.setProperty('--chooser-bg', `url("${artFor({ slug: buttons()[0]?.dataset.target || 'mahshi' })}")`);
    const move = direction => {
      const items = buttons();
      if (!items.length) return;
      activeIndex = (activeIndex + direction + items.length) % items.length;
      items.forEach((item, index) => item.classList.toggle('active', index === activeIndex));
      menu.style.setProperty('--chooser-bg', `url("${artFor({ slug: items[activeIndex].dataset.target })}")`);
      rail.classList.remove('is-spinning');
      void rail.offsetWidth;
      rail.classList.add('is-spinning');
      window.setTimeout(() => rail.classList.remove('is-spinning'), 520);
      items[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    };
    controls.querySelector('.section-arrow-prev').onclick = () => move(-1);
    controls.querySelector('.section-arrow-next').onclick = () => move(1);
    nextButton.onclick = () => move(1);
    let touchStartX = 0;
    rail.addEventListener('touchstart', event => { touchStartX = event.touches[0].clientX; }, { passive: true });
    rail.addEventListener('touchend', event => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
    }, { passive: true });
  }

  const observer = new MutationObserver(decorate);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', decorate);
  decorate();
})();