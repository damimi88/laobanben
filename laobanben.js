(async function autoFollowBsky() {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  let followCount = 0;
  let isPaused = false;

  let targetKeywords = [];
  let blockedRaw = [];

  // 拉取关键词和屏蔽词
  async function fetchKeywords() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/damimi88/laobanben/refs/heads/main/guanjianci.json');
      if (!res.ok) throw new Error("无法加载关键词配置");
      const data = await res.json();
      targetKeywords = data.targetKeywords || [];
      blockedRaw = data.blockedRaw || [];
      console.log("✅ 已加载远程关键词配置", { targetKeywords, blockedRaw });
    } catch (err) {
      console.error("❌ 加载关键词配置失败：", err);
      targetKeywords = [];
      blockedRaw = [];
    }
  }

  await fetchKeywords(); // 初始化关键词

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
  counterBox.innerText = `✅ Followed: ${followCount}`;
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

  async function getProfileData(handle) {
    try {
      const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`);
      if (!res.ok) throw new Error(`Failed to fetch profile for ${handle}`);
      const data = await res.json();
      return {
        followersCount: data.followersCount || 0,
        followsCount: data.followsCount || 0,
      };
    } catch (err) {
      console.error(`❌ 获取 ${handle} 的信息失败:`, err);
      return null;
    }
  }

  async function handleCard(card) {
    if (card.dataset.processed || isPaused) return;
    card.dataset.processed = "true";

    const cardText = card.innerText.toLowerCase();
    const handleMatch = cardText.match(/@([\w\.\-]+)/);
    if (!handleMatch) {
      card.style.backgroundColor = "#333";
      return;
    }
    const handle = handleMatch[1];

    if (blockedRaw.some(w => cardText.includes(w))) {
      console.log(`⛔️ 跳过屏蔽关键词用户: ${handle}`);
      card.style.backgroundColor = "#333";
      return;
    }

    if (!targetKeywords.some(w => cardText.includes(w))) {
      card.style.backgroundColor = "#333";
      return;
    }

    const profile = await getProfileData(handle);
    if (!profile) {
      card.style.backgroundColor = "#333";
      return;
    }

    if (profile.followersCount > 999 || profile.followsCount > 999) {
      console.log(`⛔️ 粉丝/关注数过多: ${handle} 粉丝:${profile.followersCount}, 关注:${profile.followsCount}`);
      card.style.backgroundColor = "#333";
      return;
    }

    const followBtn = card.querySelector('button[aria-label="Follow"], button[aria-label="关注"]');
    if (followBtn) {
      card.scrollIntoView({ behavior: "instant", block: "center" });
      await delay(200);
      followBtn.click();
      followCount++;
      counterBox.innerText = `✅ Followed: ${followCount}`;
      card.style.backgroundColor = "#444";
      console.log(`✅ 已关注: ${handle}`);
    } else {
      console.log(`⚠️ 未找到按钮: ${handle}`);
      card.style.backgroundColor = "#333";
    }
  }

  async function processAllCards() {
    if (isPaused) return;
    const cards = document.querySelectorAll('div[style*="padding"][style*="border-top-width"]');
    for (const card of cards) {
      await handleCard(card);
    }
  }

  const observer = new MutationObserver(() => {
    if (!isPaused) processAllCards();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  async function autoScroll() {
    if (isPaused) return setTimeout(autoScroll, 1000);
    window.scrollBy({ top: 800, behavior: "smooth" });
    await delay(1000);
    autoScroll();
  }

  autoScroll();
})();
