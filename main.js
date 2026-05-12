'use strict';

/* ============================================================
   CONFIG — 텔레그램 봇 설정
   ============================================================ */
const TELEGRAM_BOT_TOKEN = '8650424203:AAG0mHaK-XKqbQhhWyEEw0TzlzR_uz321aQ';
const TELEGRAM_CHAT_IDS  = ['8753795118', '6150361494'];

/* ============================================================
   STICKY HEADER + MOBILE CTA BAR
   ============================================================ */
const header   = document.getElementById('siteHeader');
const mobileCta = document.getElementById('mobileCta');
const hero     = document.getElementById('hero');

function handleScroll() {
  const scrollY = window.scrollY;

  // Header: background 전환 (50px 이상)
  if (header) {
    if (scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }

  // 모바일 하단 CTA: 히어로 섹션 벗어난 후 등장
  if (mobileCta && hero) {
    const heroEnd = hero.offsetTop + hero.offsetHeight - 120;
    if (scrollY > heroEnd) {
      mobileCta.classList.add('visible');
      mobileCta.setAttribute('aria-hidden', 'false');
    } else {
      mobileCta.classList.remove('visible');
      mobileCta.setAttribute('aria-hidden', 'true');
    }
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll(); // 초기 실행

/* ============================================================
   SCROLL DOWN BUTTON
   ============================================================ */
const scrollDownBtn = document.getElementById('scrollDown');
if (scrollDownBtn) {
  scrollDownBtn.addEventListener('click', () => {
    const statsBar = document.getElementById('statsBar');
    if (statsBar) {
      statsBar.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

/* ============================================================
   SCROLL ANIMATION — IntersectionObserver (fade-up)
   ============================================================ */
function initScrollAnimations() {
  // 카드 그룹에 순차 딜레이 부여
  const staggerGroups = [
    '.price-cards',
    '.premium-grid',
    '.appliances-grid',
    '.location-points',
    '.cta-buttons',
  ];

  staggerGroups.forEach((selector) => {
    const group = document.querySelector(selector);
    if (!group) return;
    const cards = Array.from(group.querySelectorAll('.fade-up'));
    cards.forEach((card, i) => {
      if (i > 0) card.dataset.delay = String(i * 110);
    });
  });

  const elements = document.querySelectorAll('.fade-up');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el    = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('visible'), delay);
        observer.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ============================================================
   COUNTER ANIMATION — Key Stats Bar
   ============================================================ */
function animateCounter(el, target, duration) {
  const suffix    = el.dataset.suffix || '';
  const startTime = performance.now();

  function tick(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(target * eased) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initCounters() {
  const counters = document.querySelectorAll('.stat-num[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el     = entry.target;
        const target = parseInt(el.dataset.target, 10);
        animateCounter(el, target, 1500);
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
function initFaq() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-q');
    const ans = item.querySelector('.faq-a');
    if (!btn || !ans) return;

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // 모두 닫기
      faqItems.forEach((other) => {
        const otherBtn = other.querySelector('.faq-q');
        const otherAns = other.querySelector('.faq-a');
        if (otherBtn && otherAns) {
          otherBtn.setAttribute('aria-expanded', 'false');
          otherAns.style.maxHeight = '0';
        }
      });

      // 클릭한 항목이 닫혀 있었으면 열기
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        ans.style.maxHeight = ans.scrollHeight + 'px';
      }
    });
  });
}

/* ============================================================
   CONSULTATION FORM — Netlify Forms + n8n webhook
   ============================================================ */
function initContactForm() {
  const form       = document.getElementById('contactForm');
  const successBox = document.getElementById('formSuccess');
  const submitBtn  = document.getElementById('formSubmitBtn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled    = true;
    submitBtn.textContent = '전송 중...';

    const formData = new FormData(form);

    // sessionStorage의 UTM 값을 폼 데이터에 포함
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => {
      const val = sessionStorage.getItem(key);
      if (val) formData.set(key, val);
    });

    try {
      // 1. Netlify Forms 제출
      await fetch('/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams(formData).toString(),
      });

      // 2. 텔레그램 알림 (토큰과 채팅 ID가 모두 설정된 경우에만)
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_IDS.length) {
        const d = Object.fromEntries(formData.entries());
        const now    = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const page   = d.source === 'apply-page' ? '/apply' : '메인';
        const text = [
          '📋 새 상담 신청!',
          `이름: ${d.name || '-'}`,
          `연락처: ${d.phone || '-'}`,
          `관심 평형: ${d.size || '-'}`,
          `거주지: ${d.region || '-'}`,
          `문의: ${d.message || '-'}`,
          `⏰ ${now}`,
          `🖥 페이지: ${page}`,
          getUtmLine(),
        ].join('\n');

        await Promise.all(TELEGRAM_CHAT_IDS.map((chat_id) =>
          fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ chat_id, text }),
          })
        ));
      }

      // 성공: 폼 숨기고 완료 메시지 표시
      form.hidden       = true;
      successBox.hidden = false;

      // 메타 픽셀 Lead 이벤트
      if (typeof fbq === 'function') fbq('track', 'Lead');

      // GA4 상담 신청 완료 이벤트
      if (typeof gtag === 'function') {
        gtag('event', 'form_submit', {
          event_category: 'conversion',
          event_label:    '상담신청완료',
          utm_source:   sessionStorage.getItem('utm_source')   || 'direct',
          utm_medium:   sessionStorage.getItem('utm_medium')   || 'none',
          utm_campaign: sessionStorage.getItem('utm_campaign') || 'none',
        });
      }

    } catch (_err) {
      submitBtn.disabled    = false;
      submitBtn.textContent = '상담 신청하기 →';
      alert('전송 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 1844-0147로 전화 주세요.');
    }
  });
}

/* ============================================================
   UTM TRACKER — URL 파라미터 저장 및 조회
   ============================================================ */
function saveUtm() {
  const params      = new URLSearchParams(location.search);
  const localKeys   = ['utm_source', 'utm_medium', 'utm_campaign'];
  const sessionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  // localStorage: 기존 3개 (Telegram 메시지용)
  if (localKeys.some((k) => params.get(k))) {
    localKeys.forEach((k) => {
      const val = params.get(k);
      if (val) localStorage.setItem(k, val);
      else     localStorage.removeItem(k);
    });
  }

  // sessionStorage: 5개 전체 (GA4 이벤트 + 폼 데이터용)
  if (sessionKeys.some((k) => params.get(k))) {
    sessionKeys.forEach((k) => {
      const val = params.get(k);
      if (val) sessionStorage.setItem(k, val);
      else     sessionStorage.removeItem(k);
    });
  }
}

function getUtmLine() {
  const src      = localStorage.getItem('utm_source')   || '';
  const medium   = localStorage.getItem('utm_medium')   || '';
  const campaign = localStorage.getItem('utm_campaign') || '';
  if (!src && !medium && !campaign) return '📍 유입 출처: 직접유입';
  const parts = [];
  if (src)      parts.push(`utm_source: ${src}`);
  if (medium)   parts.push(`utm_medium: ${medium}`);
  if (campaign) parts.push(`utm_campaign: ${campaign}`);
  // 사람이 읽기 좋은 레이블 (utm_source 기준)
  const label = src || medium || campaign;
  return `📍 유입 출처: ${label} (${parts.join(' / ')})`;
}

/* ============================================================
   EBOOK FORMS — 전자책 신청 폼 처리
   ============================================================ */
const EBOOK_DOWNLOAD_URL = 'https://docs.google.com/document/d/1cUJAPtefcYp9ebm1IM2gb79Wq2T7j-cv9QmNMyR0x_8/export?format=pdf';

async function submitEbookForm(form, submitBtn, successEl) {
  submitBtn.disabled    = true;
  submitBtn.textContent = '처리 중...';

  const formData = new FormData(form);

  try {
    await fetch('/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams(formData).toString(),
    });

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_IDS.length) {
      const d    = Object.fromEntries(formData.entries());
      const now  = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
      const text = [
        '📚 전자책 신청!',
        `이름: ${d.name  || '-'}`,
        `연락처: ${d.phone || '-'}`,
        `⏰ ${now}`,
        `🖥 출처: ${d.source || '-'}`,
        getUtmLine(),
      ].join('\n');

      await Promise.all(TELEGRAM_CHAT_IDS.map((chat_id) =>
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ chat_id, text }),
        })
      ));
    }

    form.hidden       = true;
    successEl.hidden  = false;

    if (typeof gtag === 'function') {
      gtag('event', 'ebook_download', {
        event_category: 'conversion',
        event_label:    '전자책다운로드',
      });
    }
    if (typeof fbq === 'function') fbq('track', 'Lead');

  } catch (_err) {
    submitBtn.disabled    = false;
    submitBtn.textContent = '📥 무료로 받기';
    alert('오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.');
  }
}

function initEbookForms() {
  const pairs = [
    { formId: 'ebookForm',      btnId: 'ebookSubmitBtn',      successId: 'ebookSuccess'      },
    { formId: 'ebookPopupForm', btnId: 'ebookPopupSubmitBtn', successId: 'ebookPopupSuccess' },
  ];
  pairs.forEach(({ formId, btnId, successId }) => {
    const form      = document.getElementById(formId);
    const submitBtn = document.getElementById(btnId);
    const successEl = document.getElementById(successId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitEbookForm(form, submitBtn, successEl);
    });
  });
}

function initSideBtns() {
  const sideBtns = document.getElementById('sideBtns');
  if (!sideBtns) return;

  function toggle() {
    sideBtns.classList.toggle('visible', window.scrollY > 300);
  }
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();

  const ebookSideBtn = document.getElementById('sideBtnEbook');
  if (ebookSideBtn) {
    ebookSideBtn.addEventListener('click', () => {
      const ebookSection = document.querySelector('.ebook-section');
      if (ebookSection) ebookSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function initEbookPopup() {
  const popup     = document.getElementById('ebookPopup');
  const toggleBtn = document.getElementById('ebookPopupToggle');
  const closeBtn  = document.getElementById('ebookPopupClose');
  if (!popup) return;

  if (sessionStorage.getItem('ebook_dismissed')) {
    popup.classList.add('dismissed');
    return;
  }

  function showOnScroll() {
    if (window.scrollY > 400) popup.classList.add('visible');
  }
  window.addEventListener('scroll', showOnScroll, { passive: true });
  showOnScroll();

  toggleBtn.addEventListener('click', () => popup.classList.toggle('open'));

  closeBtn.addEventListener('click', () => {
    popup.classList.add('dismissed');
    sessionStorage.setItem('ebook_dismissed', '1');
  });
}

/* ============================================================
   GA4 EVENT TRACKING — 전화/상담 버튼 클릭
   ============================================================ */
function initGa4Tracking() {
  if (typeof gtag !== 'function') return;

  // 전화연결 버튼 전체 (header, hero, CTA섹션, 모바일 하단바)
  document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
    el.addEventListener('click', () => {
      gtag('event', 'phone_click', {
        event_category: 'engagement',
        event_label:    '전화연결버튼',
      });
    });
  });

  // 상담신청 링크 (apply 페이지로 이동하는 버튼)
  document.querySelectorAll('a[href*="apply"]').forEach((el) => {
    el.addEventListener('click', () => {
      gtag('event', 'apply_click', {
        event_category: 'engagement',
        event_label:    '상담신청버튼',
      });
    });
  });

  // 폼 제출 버튼 클릭 (apply.html + index.html 공통)
  const submitBtn = document.getElementById('formSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      gtag('event', 'apply_click', {
        event_category: 'engagement',
        event_label:    '상담신청버튼',
      });
    });
  }
}

/* ============================================================
   BRAND NAME ADAPTER — 도메인 기준 자동 텍스트 치환
   헤머튼 도메인 접속 시: '해머튼' → '헤머튼'
   해머튼 도메인 접속 시: 기본값 유지
   ============================================================ */
function adaptBrandName() {
  // 브라우저가 퓨니코드(xn--...)로 반환할 수 있어 TLD로 판별
  const host = location.hostname;
  const isHematen = host.includes('헤머튼') || host.endsWith('.shop');
  if (!isHematen) return;

  // body 내 모든 텍스트 노드 순회
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.includes('해머튼')) {
      node.nodeValue = node.nodeValue.replace(/해머튼/g, '헤머튼');
    }
  }

  // 브라우저 탭 제목도 변경
  document.title = document.title.replace(/해머튼/g, '헤머튼');
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  saveUtm();
  adaptBrandName();
  initScrollAnimations();
  initCounters();
  initFaq();
  initContactForm();
  initEbookForms();
  initEbookPopup();
  initSideBtns();
  initGa4Tracking();
});
