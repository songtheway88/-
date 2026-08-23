// api/submit.js
// GitHub Pages에서 Vercel로 이전하면서 main.js에 하드코딩되어 있던 텔레그램
// 봇 토큰을 서버 사이드로 옮기고, 분양천국 대시보드 연동(고객DB 적재 + 문자 알림)을 추가했다.
// 폼 3종(quick/contact/ebook)을 form_type 값으로 구분해 각각의 메시지 포맷을 유지한다.

// 폼의 "유입경로"(한글) → 분양천국 대시보드가 이해하는 utm_source로 매핑
const SOURCE_TO_UTM_SOURCE = {
  '네이버 검색': 'naver',
  '네이버 블로그': 'naver',
  '네이버 배너광고': 'naver',
  '유튜브': 'youtube',
  '인스타그램': 'instagram',
  '페이스북': 'facebook',
};

function getReferralLine(d) {
  if (!d.referral) return '';
  const val = d.referral === '기타' ? `기타 (${d.referral_other || '미입력'})` : d.referral;
  return `📣 유입경로: ${val}`;
}

function getUtmLine(d) {
  const src = d.utm_source || '';
  const medium = d.utm_medium || '';
  const campaign = d.utm_campaign || '';
  if (!src && !medium && !campaign) return '📍 유입 출처: 직접유입';
  const parts = [];
  if (src) parts.push(`utm_source: ${src}`);
  if (medium) parts.push(`utm_medium: ${medium}`);
  if (campaign) parts.push(`utm_campaign: ${campaign}`);
  const label = src || medium || campaign;
  return `📍 유입 출처: ${label} (${parts.join(' / ')})`;
}

function buildMessageText(formType, d) {
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  if (formType === 'quick') {
    return [
      '📋 새 방문신청 (메인 상단)!',
      `이름: ${d.name || '-'}`,
      `연락처: ${d.phone || '-'}`,
      `관심 평형: ${d.size || '-'}`,
      getReferralLine(d),
      `⏰ ${now}`,
      getUtmLine(d),
    ].filter(Boolean).join('\n');
  }

  if (formType === 'ebook') {
    return [
      '📚 전자책 신청!',
      `이름: ${d.name || '-'}`,
      `연락처: ${d.phone || '-'}`,
      getReferralLine(d),
      `⏰ ${now}`,
      `🖥 출처: ${d.source || '-'}`,
      getUtmLine(d),
    ].filter(Boolean).join('\n');
  }

  // contact (기본)
  const page = d.source === 'apply-page' ? '/apply' : '메인';
  return [
    '📋 새 상담 신청!',
    `이름: ${d.name || '-'}`,
    `연락처: ${d.phone || '-'}`,
    `관심 평형: ${d.size || '-'}`,
    `거주지: ${d.region || '-'}`,
    `방문 예약: ${d['visit-time'] || '-'}`,
    `문의: ${d.message || '-'}`,
    getReferralLine(d),
    `⏰ ${now}`,
    `🖥 페이지: ${page}`,
    getUtmLine(d),
  ].filter(Boolean).join('\n');
}

async function sendTelegramDirect(formType, d) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIdsString = process.env.TELEGRAM_CHAT_IDS;

  if (!botToken || !chatIdsString) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS in environment variables.');
    return;
  }

  const text = buildMessageText(formType, d);
  const chatIds = chatIdsString.split(',').map((id) => id.trim()).filter(Boolean);

  await Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        });
        const result = await response.json();
        if (!result.ok) {
          console.error(`Telegram API Error for chatId ${chatId}:`, result);
        }
      } catch (err) {
        console.error(`Fetch error for chatId ${chatId}:`, err);
      }
    })
  );
}

// 분양천국 대시보드로 리드 전송 (고객DB 적재 + 담당자 문자 알림).
async function sendToDashboard(formType, d) {
  const dashboardUrl = process.env.DASHBOARD_INTAKE_URL; // https://bunyang-dashboard.vercel.app/api/leads/intake
  const apiKey = process.env.DASHBOARD_API_KEY; // 남성역 해머튼 현장 전용 API 키

  if (!dashboardUrl || !apiKey) {
    throw new Error('DASHBOARD_INTAKE_URL 또는 DASHBOARD_API_KEY 환경변수가 없습니다.');
  }

  const messageParts = [];
  if (d['visit-time']) messageParts.push(`[방문희망: ${d['visit-time']}]`);
  if (formType === 'ebook') messageParts.push('전자책 신청');
  if (d.message) messageParts.push(d.message);

  const referral = d.referral === '기타' ? d.referral_other : d.referral;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(dashboardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        name: d.name,
        phone: d.phone,
        pyeong_type: d.size,
        region: d.region,
        message: messageParts.join(' ').trim(),
        utm_source: SOURCE_TO_UTM_SOURCE[referral] || d.utm_source || 'other',
        utm_medium: 'landing_form',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Dashboard intake failed: ${response.status} ${body}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const body = req.body || {};
    const { form_type: formType, ...d } = body;

    if (!d.name || !d.phone) {
      return res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
    }

    // 대시보드 전송이 성공하면 대시보드가 자체적으로 텔레그램까지 보내주므로 중복 발송을 피하기 위해
    // 대시보드 실패시에만 랜딩페이지 자체 텔레그램 발송으로 폴백한다.
    try {
      await sendToDashboard(formType, d);
    } catch (dashboardErr) {
      console.error('Dashboard intake error, falling back to direct Telegram send:', dashboardErr);
      await sendTelegramDirect(formType, d);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || '서버 에러가 발생했습니다.' });
  }
}
