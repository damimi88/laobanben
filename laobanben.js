(async function autoFollowBsky() {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  async function fetchKeywords() {
    try {
      const res = await fetch('https://raw.githubusercontent.com/damimi88/laobanben/refs/heads/main/guanjianci.json', { cache: "no-store" });
      if (!res.ok) throw new Error('关键词加载失败');
      const data = await res.json();
      return {
        blockedRaw: data.blockedRaw || [],
        targetKeywords: data.targetKeywords || []
      };
    } catch (e) {
      console.error('获取关键词失败，使用空关键词', e);
      return { blockedRaw: [], targetKeywords: [] };
    }
  }

  const { blockedRaw, targetKeywords } = await fetchKeywords();

  let followCount = 0;
  let isPaused = false;

  const counterBox = document.createElement("div");
  Object.assign(counterBox.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    backgroundColor: "#222",
    color: "#0f0",
    padding: "10px 15px",
    borderRadius: "8px",
    fontSize: "14px",
    zIndex: "9999",
    boxShadow: "0 0 8px rgba(0,0,0,0.5)"
  });
  counterBox.innerText = `✅ Followed: ${followCount}`;
  document.body.appendChild(counterBox);

  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === "q") {
      isPaused = true;
      counterBox.style.display = "none";
      console.log("⏸ 暂停执行");
    } else if (key === "r") {
      isPaused = false;
      counterBox.style.display = "block";
      console.log("▶️ 继续执行");
    }
  });

  async function handleCard(card) {
    if (card.dataset.processed || isPaused) return;
    card.dataset.processed = "true";

    const cardText = card.innerText.toLowerCase();
    const nicknameMatch = cardText.match(/^(.*?)\n@/);
    const nickname = nicknameMatch ? nicknameMatch[1].trim() : "";

    const isBlocked = blockedRaw.some(w => nickname.includes(w) || cardText.includes(w));
    if (isBlocked) {
      console.log(`⛔️ Skipped: ${nickname}`);
      card.style.backgroundColor = "#333";
      return;
    }

    const isTarget = targetKeywords.some(w => nickname.includes(w) || cardText.includes(w));
    if (isTarget) {
      const followBtn = card.querySelector('button[aria-label="Follow"], button[aria-label="关注"]');
      if (followBtn) {
        card.scrollIntoView({ behavior: "instant", block: "center" });
        await delay(200);
        followBtn.click();
        followCount++;
        counterBox.innerText = `✅ Followed: ${followCount}`;
        card.style.backgroundColor = "#444";
        console.log(`✅ Followed: ${nickname}`);
      }
    } else {
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
    if (!isPaused) {
      processAllCards();
    }
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
