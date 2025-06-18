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
  const delay = ms => new Promise(res => setTimeout(res, ms));

  // 拉取关键词
  async function fetchKeywords() {
    try {
      const res = await fetch('https://laobanben.hhf505230.workers.dev/guanjianci.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('关键词加载失败');
      const data = await res.json();
      return { blockedRaw: data.blockedRaw||[], targetKeywords: data.targetKeywords||[] };
    } catch (e) {
      console.error('获取关键词失败，使用空关键词', e);
      return { blockedRaw: [], targetKeywords: [] };
    }
  }

  // 通过 API 获取用户资料
  async function getProfileData(handle) {
    try {
      const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`);
      if (!res.ok) throw new Error(`Failed to fetch profile for ${handle}`);
      const data = await res.json();
      const followersCount = data.followersCount||0;
      const followsCount = data.followsCount||0;
      return { followersCount, followsCount };
    } catch (err) {
      console.error(`Error fetching profile for ${handle}:`, err);
      return null;
    }
  }

  const { blockedRaw, targetKeywords } = await fetchKeywords();
  let followCount = 0, isPaused = false;

  // 计数面板
  const counterBox = document.createElement('div');
  Object.assign(counterBox.style, { position:'fixed', bottom:'20px', right:'20px', backgroundColor:'#222', color:'#0f0', padding:'10px 15px', borderRadius:'8px', fontSize:'14px', zIndex:'9999', boxShadow:'0 0 8px rgba(0,0,0,0.5)' });
  counterBox.innerText = `✅ Followed: ${followCount}`;
  document.body.appendChild(counterBox);

  document.addEventListener('keydown', e=>{
    const k = e.key.toLowerCase();
    if (k==='q') { isPaused=true; counterBox.style.display='none'; console.log('⏸ 暂停执行'); }
    if (k==='r') { isPaused=false; counterBox.style.display='block'; console.log('▶️ 继续执行'); }
  });

  async function handleCard(card) {
    if (card.dataset.processed||isPaused) return;
    card.dataset.processed='true';

    const text = card.innerText.toLowerCase();
    const nickMatch = text.match(/^(.*?)\n@/);
    const nickname = nickMatch?nickMatch[1].trim():'';
    const handleMatch = card.innerText.match(/^.*?\n@(\S+)/);
    const handle = handleMatch?handleMatch[1]:'';

    // 关键词过滤
    if (blockedRaw.some(w=>nickname.includes(w)||text.includes(w))) {
      console.log(`⛔️ 跳过 ${nickname}（关键词）`);
      card.style.backgroundColor='#333'; return;
    }

    // 关键词命中
    if (!targetKeywords.some(w=>nickname.includes(w)||text.includes(w))) {
      card.style.backgroundColor='#333'; return;
    }

    // 拉取用户资料并筛选粉丝/关注量<500
    if (handle) {
      const profile = await getProfileData(handle);
      if (!profile || profile.followersCount>=500 || profile.followsCount>=500) {
        console.log(`⛔️ 跳过 ${nickname}（粉丝:${profile?.followersCount}, 关注:${profile?.followsCount}）`);
        card.style.backgroundColor='#333'; return;
      }
    }

    // 执行关注
    const btn = card.querySelector('button[aria-label="Follow"],button[aria-label="关注"]');
    if (btn) {
      card.scrollIntoView({behavior:'instant',block:'center'});
      await delay(200);
      btn.click(); followCount++;
      counterBox.innerText=`✅ Followed: ${followCount}`;
      card.style.backgroundColor='#444';
      console.log(`✅ 关注 ${nickname}`);
    }
  }

  function scan() {
    if (isPaused) return;
    document.querySelectorAll('div[style*="padding"][style*="border-top-width"]').forEach(handleCard);
  }

  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  (async function scrollLoop(){ if (!isPaused) { window.scrollBy(0,800); await delay(1000);} setTimeout(scrollLoop,1000); })();
})();
`;
      return new Response(script, {
        headers: { 'Content-Type':'application/javascript', 'Access-Control-Allow-Origin':'https://bsky.app', 'Access-Control-Allow-Methods':'GET, OPTIONS' }
      });
    }
  }

  return new Response('Not Found', { status:404 });
}
