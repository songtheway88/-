'use strict';

/* ============================================================
   CONFIG — n8n 웹훅 URL을 아래에 입력하세요
   ============================================================ */
const N8N_WEBHOOK_URL = ''; // 예: 'https://your-n8n.com/webhook/xxxxxxxx'

/* ============================================================
   STICKY HEADER + MOBILE CTA BAR
   ============================================================ */
const header   = document.getElementById('siteHeader');
const mobileCta = document.getElementById('mobileCta');
const hero     = document.getElementById('hero');

function handleScroll() {
  const scrollY = window.scrollY;

  // Header: background 전환 (50px 이상)
  if (scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
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

    try {
      // 1. Netlify Forms 제출
      await fetch('/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams(formData).toString(),
      });

      // 2. n8n 웹훅 전송 (URL이 설정된 경우에만)
      if (N8N_WEBHOOK_URL) {
        const payload = Object.fromEntries(formData.entries());
        delete payload['bot-field'];
        await fetch(N8N_WEBHOOK_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            ...payload,
            submitted_at: new Date().toISOString(),
            source:       '남성역해머튼.kr',
          }),
        });
      }

      // 성공: 폼 숨기고 완료 메시지 표시
      form.hidden       = true;
      successBox.hidden = false;

    } catch (_err) {
      submitBtn.disabled    = false;
      submitBtn.textContent = '상담 신청하기 →';
      alert('전송 중 오류가 발생했습니다.\n잠시 후 다시 시도하거나 1844-0147로 전화 주세요.');
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initScrollAnimations();
  initCounters();
  initFaq();
  initContactForm();
});
