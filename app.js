const cover = document.querySelector('.cover');
const screenButton = document.querySelector('.light-control');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const mobileScreen = matchMedia('(max-width: 760px)');
const touchScreen = matchMedia('(hover: none) and (pointer: coarse)');
const isMobile = mobileScreen.matches || touchScreen.matches;
const bootDuration = 780;
let pinned = false;
let overCover = false;
let bootTimer;
let autoScreenTimer;
let tappedScreen = false;
const lampDarkness = cover.querySelector('.lamp-darkness');
const lampGlow = cover.querySelector('.lamp-glow');
let lampReady = false;
let pointerPosition;

function finishLamp() {
  if (lampReady) return;
  lampReady = true;
  cover.classList.remove('is-lamp-starting');
  if (overCover || pinned || screenButton.matches(':focus-visible')) {
    setCoverPosition(...(pointerPosition ?? []));
    powerOn();
  } else if (isMobile && !motion.matches && !tappedScreen) {
    setCoverPosition();
    powerOn();
    autoScreenTimer = setTimeout(() => {
      autoScreenTimer = undefined;
      if (!pinned && !overCover) powerOff();
    }, bootDuration + 1300);
  }
}

function animateLamp() {
  const duration = isMobile ? 1850 : 2900;
  const ignition = isMobile ? 180 : 360;
  let elapsed = 0;
  let previous;
  function frame(now) {
    if (lampReady) return;
    if (previous !== undefined) elapsed += Math.min(now - previous, 48);
    previous = now;
    if (elapsed >= duration) {
      finishLamp();
      return;
    }
    if (elapsed >= ignition) {
      const progress = (elapsed - ignition) / (duration - ignition);
      const reach = 2 + 154 * Math.pow(progress, 1.05);
      const clear = Math.max(0, reach - 23);
      const brightness = Math.min(1, progress * 13) * (1 - progress);
      lampDarkness.style.background = `radial-gradient(ellipse 70% 90% at 17.7% 49.3%, transparent ${clear}%, #000 ${reach}%)`;
      lampGlow.style.background = `radial-gradient(ellipse ${Math.min(61, 5 + reach * .52)}% ${Math.min(75, 8 + reach * .62)}% at 17.7% 49.3%, #fff4bd 0%, #ffc07973 32%, transparent 76%)`;
      lampGlow.style.opacity = String(brightness * .84);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const coverLoaded = Promise.allSettled([...cover.querySelectorAll('.cover-art img')].map(img => img.decode()));
const pageLoaded = isMobile || document.readyState === 'complete'
  ? Promise.resolve()
  : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
if (motion.matches) {
  finishLamp();
} else {
  motion.addEventListener('change', () => {
    if (motion.matches) finishLamp();
  });
  Promise.all([pageLoaded, coverLoaded]).then(() => {
    if (!lampReady) animateLamp();
  });
}

function setCoverPosition(x = .5, y = .5) {
  if (!lampReady) return;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  const distance = Math.hypot((x - .504) * 1.35, y - .51);
  cover.style.setProperty('--ambient', '.95');
  cover.style.setProperty('--ax', clamp(x) * 100 + '%');
  cover.style.setProperty('--ay', clamp(y) * 100 + '%');
  cover.style.setProperty('--light', pinned ? 1 : Math.max(.42, 1 - distance));
  cover.style.setProperty('--sx', clamp((x - .364) * 3.6) * 100 + '%');
  cover.style.setProperty('--sy', clamp((y - .32) * 2.61) * 100 + '%');
}
function powerOn() {
  if (!lampReady) return;
  if (cover.classList.contains('is-powered') || cover.classList.contains('is-glitching')) return;
  const finish = () => {
    cover.style.setProperty('--powered', '1');
    cover.classList.add('is-powered');
    cover.classList.remove('is-glitching');
  };
  if (motion.matches) {
    finish();
    return;
  }
  cover.classList.add('is-glitching');
  bootTimer = setTimeout(finish, bootDuration);
}
function powerOff() {
  clearTimeout(bootTimer);
  cover.classList.remove('is-glitching', 'is-powered');
  cover.style.setProperty('--powered', '0');
  cover.style.setProperty('--ambient', '0');
  cover.style.setProperty('--light', '0');
}
cover.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'touch') return;
  overCover = true;
  const rect = cover.getBoundingClientRect();
  pointerPosition = [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  if (!lampReady) return;
  setCoverPosition(...pointerPosition);
  powerOn();
});
cover.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'touch') return;
  overCover = false;
  pointerPosition = undefined;
  if (!pinned && autoScreenTimer === undefined && !screenButton.matches(':focus-visible')) powerOff();
});
screenButton.addEventListener('focus', () => {
  if (!screenButton.matches(':focus-visible')) return;
  setCoverPosition();
  powerOn();
});
screenButton.addEventListener('blur', () => {
  if (!pinned && !overCover && autoScreenTimer === undefined) powerOff();
});
screenButton.addEventListener('click', () => {
  tappedScreen = true;
  clearTimeout(autoScreenTimer);
  autoScreenTimer = undefined;
  pinned = !pinned;
  screenButton.setAttribute('aria-pressed', String(pinned));
  if (pinned) {
    setCoverPosition();
    powerOn();
  } else if (!overCover) {
    powerOff();
  }
});

const art = document.querySelector('.intro-art');
const finalFrame = document.querySelector('.intro-final');
const replay = document.querySelector('#replay');
let inView = false;
let hasPlayed = false;

function playIntro() {
  if (motion.matches || !inView) return;
  art.classList.remove('is-playing');
  void art.offsetWidth;
  art.classList.add('is-playing');
}

function checkIntroPosition() {
  const rect = art.getBoundingClientRect();
  const headerBottom = document.querySelector('.bar').getBoundingClientRect().bottom;
  const visible = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, headerBottom);
  inView = rect.top <= headerBottom + Math.min(96, innerHeight * .12)
    && visible >= Math.min(rect.height, innerHeight - headerBottom) * .48;
  if (inView && !hasPlayed && !art.classList.contains('is-playing') && !motion.matches) {
    art.classList.add('is-ready');
    playIntro();
  }
  if (visible <= 0 && !hasPlayed) art.classList.remove('is-playing');
}

coverLoaded.then(() => Promise.all([...art.querySelectorAll('img')].map(image => image.decode()))).then(() => {
  if (!motion.matches) art.classList.add('is-ready');
  window.addEventListener('scroll', checkIntroPosition, { passive: true });
  window.addEventListener('resize', checkIntroPosition);
  checkIntroPosition();
}).catch(() => {
  // Keep the PDF image visible if a layer is unavailable.
});
finalFrame.addEventListener('animationend', (event) => {
  if (event.animationName !== 'intro-freeze') return;
  hasPlayed = true;
  art.classList.remove('is-ready', 'is-playing');
  replay.hidden = motion.matches;
});
replay.addEventListener('click', () => {
  if (!inView) {
    hasPlayed = false;
    art.scrollIntoView({ block: 'start', behavior: 'instant' });
    checkIntroPosition();
    return;
  }
  art.classList.add('is-ready');
  playIntro();
});
motion.addEventListener('change', () => {
  if (motion.matches) {
    art.classList.remove('is-ready', 'is-playing');
    replay.hidden = true;
  } else if (hasPlayed) {
    replay.hidden = false;
  } else {
    checkIntroPosition();
  }
});

const cases = [
  { title: '鼎文小鲲鹏', category: 'IP 形象与衍生', cover: 'p4', pages: [4, 5, 6], description: '校园吉祥物形象迭代，从角色设定、表情与三视图延展到场景及衍生应用。' },
  { title: '校园活动视觉', category: '活动视觉', cover: 'campus-event-cover', pages: [7], description: '围绕开学礼、校园活动与赛事主题，设计主视觉、导览、展板与其他场景物料。' },
  { title: '趣探运动会AIGC全链路生成', category: 'AIGC 应用', categoryLabel: 'AIGC应用', featured: true, cover: 'sports-day-cover', pages: [33], description: '从运动会主视觉和角色设计，到赛事场景与文创衍生，展示趣探运动会的 AIGC 全链路生成。' },
  { title: '七大学院徽章', category: '文创与包装', cover: 'academy-badge-cover', pages: [11], description: '用学院符号、宇宙元素与鲲鹏 IP 建立系列徽章的设计语言。' },
  { title: '鼎文咖啡 VI', category: '文创与包装', cover: 'p14', pages: [12, 13, 14, 15, 16], description: '将咖啡工序提炼为几何图形，并应用到品牌视觉、包装和周边。' },
  { title: '校园主题插画', category: '文创与包装', cover: 't17', pages: [17], description: '从校园建筑与景观出发，结合学校育人素养关键词，创作可跨物料使用的主题插画。' },
  { title: '地产与商业品牌提案', category: '项目提案', cover: 'p19', pages: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], description: '收录地产和商业项目的提案视觉，包括标志、海报及空间展示。' },
  { title: '游泳赛事主视觉', category: 'AIGC 应用', cover: 't10', pages: [10], description: '使用 AIGC 探索风格和氛围，结合人工筛选、二次创作与细化完成主视觉。' },
];
const filters = document.querySelector('#filters');
const gallery = document.querySelector('#projects');
const dialog = document.querySelector('#detail');

const refreshedCasePages = new Set([6, 7, 10]);
const caseImageSizes = {"4":[2880,1620],"5":[2880,1620],"6":[2160,3770],"7":[2160,6196],"8":[2880,1923],"9":[2880,1920],"10":[2880,2511],"11":[2880,6782],"12":[2880,6889],"13":[2875,1617],"14":[2875,1617],"15":[2875,1617],"16":[2875,1593],"17":[2880,5019],"18":[2880,824],"19":[2880,1620],"20":[2880,1620],"21":[2880,1620],"22":[2880,1620],"23":[2880,1620],"24":[2880,1620],"25":[2880,1620],"26":[2880,1620],"27":[2880,1620],"28":[2880,1620],"29":[2880,1620],"30":[2880,1620],"31":[2880,1620],"32":[2880,1620],"33":[1729,9028]};

function showCase(project) {
  document.querySelector('#case-category').textContent = project.categoryLabel ?? project.category;
  document.querySelector('#case-title').textContent = project.title;
  document.querySelector('#case-description').textContent = project.description;
  document.querySelector('#case-images').replaceChildren(...project.pages.map((page, index) => {
    const figure = document.createElement('figure');
    const picture = document.createElement('picture');
    const mobile = document.createElement('source');
    mobile.media = '(max-width: 760px), (max-width: 1024px) and (pointer: coarse)';
    const assetVersion = refreshedCasePages.has(page) ? '?v=14' : '';
    mobile.srcset = 'media/mobile/p' + page + '.webp' + assetVersion;
    const img = new Image();
    const [width, height] = caseImageSizes[page];
    img.width = width;
    img.height = height;
    img.alt = project.title + '，作品图 ' + (index + 1);
    img.loading = index === 0 ? 'eager' : 'lazy';
    img.fetchPriority = index === 0 ? 'high' : 'low';
    img.decoding = 'async';
    picture.append(mobile, img);
    img.src = 'media/p' + page + '.webp' + assetVersion;
    figure.append(picture);
    return figure;
  }));
  dialog.showModal();
  dialog.scrollTop = 0;
}
function renderProjects(category) {
  gallery.classList.toggle('is-all', category === '全部');
  gallery.classList.toggle('is-packaging', category === '文创与包装');
  gallery.replaceChildren(...cases.filter((project) => category === '全部' || project.category === category).map((project) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'project';
    const visual = document.createElement('span');
    visual.className = 'project-visual';
    const img = new Image();
    const updatedCover = project.cover === 't10';
    img.src = 'media/' + project.cover + '.webp' + (updatedCover ? '?v=14' : '');
    img.alt = '';
    img.loading = 'lazy';
    visual.append(img);
    const title = document.createElement('strong');
    title.textContent = project.title;
    const tag = document.createElement('small');
    tag.textContent = project.categoryLabel ?? project.category;
    const caption = document.createElement('span');
    caption.className = 'project-caption';
    caption.append(title, tag);
    button.append(visual, caption);
    if (project.featured) {
      const label = document.createElement('span');
      label.className = 'project-featured';
      label.textContent = '重点推荐';
      button.append(label);
    }
    button.addEventListener('click', () => showCase(project));
    return button;
  }));
}
const categories = ['全部', ...new Set(cases.map((project) => project.category))];
function selectCategory(category) {
  for (const filter of filters.children) {
    filter.setAttribute('aria-pressed', String(filter.textContent === category));
  }
  renderProjects(category);
}
for (const category of categories) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = category;
  button.addEventListener('click', () => selectCategory(category));
  filters.append(button);
}
selectCategory('全部');

const workSection = document.querySelector('.work-section');
const curtain = document.querySelector('.work-curtain');
const workContent = workSection.querySelector('.work');
const curtainCategories = curtain.querySelector('.curtain-categories');
const reopen = document.querySelector('.work-index');
const workTitle = document.querySelector('#work-title');

function prepareCurtain() {
  function finishOpening() {
    curtain.hidden = true;
    curtain.inert = false;
    workSection.classList.remove('is-opening');
    workSection.scrollIntoView({ block: 'start', behavior: 'instant' });
    workTitle.focus({ preventScroll: true });
  }
  function openWork(selection) {
    if (curtain.hidden || curtain.inert) return;
    curtain.inert = true;
    selectCategory(selection);
    workSection.classList.remove('is-closed');
    workContent.inert = false;
    if (motion.matches) {
      finishOpening();
      return;
    }
    workSection.classList.add('is-opening');
    setTimeout(finishOpening, 1080);
  }
  function showCurtain() {
    for (const button of curtainCategories.children) button.classList.remove('is-selected');
    workSection.classList.add('is-closed');
    workContent.inert = true;
    curtain.hidden = false;
  }
  for (const category of categories.slice(1)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', category);
    button.addEventListener('click', () => {
      button.classList.add('is-selected');
      openWork(category);
    });
    curtainCategories.append(button);
  }
  curtain.querySelector('.curtain-all').addEventListener('click', () => openWork('全部'));
  reopen.hidden = false;
  reopen.addEventListener('click', () => {
    if (!curtain.hidden) return;
    showCurtain();
    workSection.scrollIntoView({ block: 'start', behavior: 'instant' });
    curtainCategories.firstElementChild.focus({ preventScroll: true });
  });
  showCurtain();
}
prepareCurtain();
