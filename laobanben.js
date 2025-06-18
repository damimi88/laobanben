// Cloudflare Worker: 自动返回 auto-follow.js 并限制 CORS 仅允许 bsky.app
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const { method, url } = request;
  const requestURL = new URL(url);

  // 只处理 /auto-follow.js 路径
  if (requestURL.pathname === '/auto-follow.js') {
    // 预检请求
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': 'https://bsky.app',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // GET 请求返回脚本内容
    if (method === 'GET') {
      const script = `(async function autoFollowBsky() {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  // 远程拉取关键词列表
  async function fetchKeywords() {
    try {
      const res = await fetch('https://laobanben.hhf505230.workers.dev/guanjianci.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('关键词加载失败');
      const data = await res.json();
      return { blockedRaw: data.blockedRaw || [], targetKeywords: data.targetKeywords || [] };
    } catch (e) {
      console.error('获取关键词失败，使用空列表', e);
      return { blockedRaw: [], targetKeywords: [] };
    }
  }

  // 获取关键词后开始执行
  const { blockedRaw, targetKeywords } = await fetchKeywords();

  let followCount = 0;
  let isPaused = false;

  const counterBox = document.createElement("div");
  counterBox.style.position = "fixed";
  counterBox.style.bottom = "20px";
  counterBox.style.right = "20px";
  counterBox.style.backgroundColor = "#222";
  counterBox.style.color = "#0f0";
  counterBox.style.padding = "10px 15px";
  counterBox.style.borderRadius = "8px";
  counterBox.style.fontSize = "14px";
  counterBox.style.zIndex = "9999";
  counterBox.style.boxShadow = "0 0 8px rgba(0,0,0,0.5)";
  counterBox.innerText = \`✅ Followed: \${followCount}\`;
  document.body.appendChild(counterBox);

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "q") {
      isPaused = true;
      counterBox.style.display = "none";
      console.log("⏸ 暂停执行");
    }
    if (e.key.toLowerCase() === "r") {
      isPaused = false;
      counterBox.style.display = "block";
      console.log("▶️ 继续执行");
    }
  });

  // 获取粉丝/关注数的接口调用
  async function getProfileData(handle) {
    try {
      const res = await fetch(\`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=\${handle}\`);
      if (!res.ok) throw new Error(\`Failed to fetch profile for \${handle}\`);
      const data = await res.json();
      return { followersCount: data.followersCount || 0, followsCount: data.followsCount || 0 };
    } catch (err) {
      console.error(\`Error fetching profile for \${handle}:\`, err);
      return null;
    }
  }

  // 处理单个用户卡片
  async function handleCard(card) {
    if (card.dataset.processed || isPaused) return;
    card.dataset.processed = "true";

    const text = card.innerText.toLowerCase();
    const handleMatch = text.match(/@([\w.\-]+)/);
    if (!handleMatch) {
      card.style.backgroundColor = "#333";
      return;
    }
    const handle = handleMatch[1];

    // 关键词过滤
    if (blockedRaw.some(w => text.includes(w))) {
      console.log(\`⛔️ Skipped (blocked): \${handle}\`);
      card.style.backgroundColor = "#333";
      return;
    }
    if (!targetKeywords.some(w => text.includes(w))) {
      card.style.backgroundColor = "#333";
      return;
    }

    // 粉丝/关注数筛选
    const profile = await getProfileData(handle);
    if (!profile || profile.followersCount > 500 || profile.followsCount > 500) {
      console.log(\`⛔️ 跳过 \${handle} (粉丝:\${profile?.followersCount} 关注:\${profile?.followsCount})\`);
      card.style.backgroundColor = "#333";
      return;
    }

    // 执行关注
    const btn = card.querySelector('button[aria-label="Follow"], button[aria-label="关注"]');
    if (btn) {
      card.scrollIntoView({ behavior: "instant", block: "center" });
      await delay(200);
      btn.click();
      followCount++;
      counterBox.innerText = \`✅ Followed: \${followCount}\`;
      card.style.backgroundColor = "#444";
      console.log(\`✅ Followed: \${handle}\`);
    } else {
      console.log(\`⚠️ 未找到关注按钮: \${handle}\`);
      card.style.backgroundColor = "#333";
    }
  }

  // 扫描页面并处理
  function scan() {
    if (isPaused) return;
    document.querySelectorAll('div[style*="padding"][style*="border-top-width"]').forEach(handleCard);
  }

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });

  // 自动滚动
  (async function scrollLoop() {
    if (!isPaused) {
      window.scrollBy(0, 800);
      await delay(1000);
    }
    setTimeout(scrollLoop, 1000);
  })();

})();`;

      return new Response(script, {
        headers: {
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': 'https://bsky.app',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        }
      });
    }
  }

  return new Response('Not Found', { status: 404 });
}
